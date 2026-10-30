import Payment from "../models/Payment.js";
import Sales from "../models/sales.js";
import Stock from "../models/stock.js";
import Party from "../models/party.js";
import BankAccount from "../models/BankAccount.js";
import BankTransaction from "../models/BankTransaction.js";
import AutoPaymentGroup from "../models/AutoPaymentGroup.js";
import Expense from "../models/Expense.js";

// 1. Record a Payment (Inflow / Outflow)
export const recordPayment = async (req, res) => {
  try {
    const {
      type, // "inflow" or "outflow"
      partyId,
      partyType, // "Buyer" or "Miller"
      relatedType, // "Sale", "Stock", or "General"
      relatedId,
      referenceNumber,
      paymentDate,
      amount,
      paymentMethod,
      bankAccountId,
      notes,
    } = req.body;

    const numAmount = Number(amount);
    if (!type || !["inflow", "outflow"].includes(type) || !partyId || !Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Type, Party, and a valid positive amount are required.",
      });
    }

    const party = await Party.findOne({
      _id: partyId,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    let targetBankAccount = null;
    if (bankAccountId) {
      targetBankAccount = await BankAccount.findOne({ _id: bankAccountId, userId: req.user._id });
      if (!targetBankAccount && type === "outflow") return res.status(404).json({ success: false, message: "Bank account not found." });
    } else {
      targetBankAccount = await BankAccount.findOne({ userId: req.user._id, isDefault: true }) || await BankAccount.findOne({ userId: req.user._id });
    }
    if (targetBankAccount && type === "outflow" && numAmount > Number(targetBankAccount.currentBalance || 0)) {
      return res.status(400).json({ success: false, message: "Payment exceeds the selected account balance." });
    }

    if (req.body.autoAllocate) {
      return autoAllocatePayment(req, res);
    }

    let refNo = referenceNumber || "";

    // Handle Sale Invoice update
    if (relatedType === "Sale" && relatedId) {
      const sale = await Sales.findOne({
        _id: relatedId,
        userId: req.user._id,
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Related sales invoice not found.",
        });
      }

      if (sale.buyerId.toString() !== partyId || type !== "inflow") {
        return res.status(400).json({ success: false, message: "Sale payments must be inflows for the sale's buyer." });
      }

      if (numAmount > Number(sale.remainingAmount)) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${numAmount}) cannot exceed outstanding invoice balance (Rs. ${sale.remainingAmount}).`,
        });
      }

      sale.paidAmount = Number(sale.paidAmount || 0) + numAmount;
      sale.remainingAmount = Math.max(
        0,
        Number(sale.totalAmount) - Number(sale.paidAmount)
      );

      if (sale.remainingAmount <= 0) {
        sale.status = "paid";
      } else {
        sale.status = "partial";
      }

      await sale.save();
      if (!refNo) refNo = sale.billNumber;
    }

    // Handle Stock Purchase update
    if (relatedType === "Stock" && relatedId) {
      const stock = await Stock.findOne({
        _id: relatedId,
        userId: req.user._id,
      });

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: "Related stock purchase not found.",
        });
      }

      if (stock.millerId.toString() !== partyId || type !== "outflow") {
        return res.status(400).json({ success: false, message: "Stock payments must be outflows for the stock's supplier." });
      }

      if (numAmount > Number(stock.remainingAmount)) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${numAmount}) cannot exceed outstanding purchase balance (Rs. ${stock.remainingAmount}).`,
        });
      }

      stock.paidAmount = Number(stock.paidAmount || 0) + numAmount;
      stock.remainingAmount = Math.max(
        0,
        Number(stock.totalAmount) - Number(stock.paidAmount)
      );

      if (stock.remainingAmount <= 0) {
        stock.status = "paid";
      } else {
        stock.status = "partial";
      }

      await stock.save();
      if (!refNo) refNo = stock.receiptNumber;
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    const payment = await Payment.create({
      userId: req.user._id,
      type,
      partyId,
      partyType: partyType || party.type,
      relatedType: relatedType || "General",
      relatedId: relatedId || null,
      referenceNumber: refNo,
      paymentDate: payDate,
      amount: numAmount,
      paymentMethod: paymentMethod || "cash",
      notes: notes || "",
    });

    // Bank Account Balance Auto-Update: ONLY for supplier outflow payments.
    // Customer inflow payments do NOT auto-deposit to bank;
    // the user must manually deposit received cash via the Bank & Accounts page.
    if (targetBankAccount && type === "outflow") {
      const oldBalance = Number(targetBankAccount.currentBalance || 0);
      const updatedBankBalance = oldBalance - numAmount;
      const updatedAccount = await BankAccount.findOneAndUpdate(
        { _id: targetBankAccount._id, userId: req.user._id, currentBalance: { $gte: numAmount, $eq: oldBalance } },
        { $inc: { currentBalance: -numAmount } },
        { new: true }
      );
      if (!updatedAccount) return res.status(409).json({ success: false, message: "Account balance changed concurrently. Refresh and retry." });

      await BankTransaction.create({
        userId: req.user._id,
        bankAccountId: targetBankAccount._id,
        type: "supplier_payment",
        amount: numAmount,
        balanceAfter: updatedBankBalance,
        relatedType: "Payment",
        relatedId: payment._id,
        partyName: party.name,
        referenceNumber: refNo,
        paymentMethod: paymentMethod || "bank_transfer",
        date: payDate,
        notes: notes || `Payment to ${party.name} (${refNo})`,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      data: payment,
    });
  } catch (error) {
    console.error("Record Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record payment.",
    });
  }
};

// 2. Get Payments with Filtering
export const getPayments = async (req, res) => {
  try {
    const { type, partyId, relatedType, startDate, endDate } = req.query;

    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (partyId) filter.partyId = partyId;
    if (relatedType) filter.relatedType = relatedType;

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }

    const payments = await Payment.find(filter)
      .populate("partyId", "name type phone")
      .sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch payments.",
    });
  }
};

// 3. Delete Payment (with automatic rollback)
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction not found.",
      });
    }


    // Rollback on Sale
    if (payment.relatedType === "Sale" && payment.relatedId) {
      const sale = await Sales.findOne({
        _id: payment.relatedId,
        userId: req.user._id,
      });

      if (sale) {
        sale.paidAmount = Math.max(
          0,
          Number(sale.paidAmount || 0) - Number(payment.amount)
        );
        sale.remainingAmount = Math.max(
          0,
          Number(sale.totalAmount) - Number(sale.paidAmount)
        );

        if (sale.paidAmount <= 0) {
          sale.status = "unpaid";
        } else if (sale.remainingAmount > 0) {
          sale.status = "partial";
        } else {
          sale.status = "paid";
        }

        await sale.save();
      }
    }

    // Rollback on Stock
    if (payment.relatedType === "Stock" && payment.relatedId) {
      const stock = await Stock.findOne({
        _id: payment.relatedId,
        userId: req.user._id,
      });

      if (stock) {
        stock.paidAmount = Math.max(
          0,
          Number(stock.paidAmount || 0) - Number(payment.amount)
        );
        stock.remainingAmount = Math.max(
          0,
          Number(stock.totalAmount) - Number(stock.paidAmount)
        );

        if (stock.paidAmount <= 0) {
          stock.status = "unpaid";
        } else if (stock.remainingAmount > 0) {
          stock.status = "partial";
        } else {
          stock.status = "paid";
        }

        await stock.save();
      }
    }

    // Revert and delete linked BankTransaction if any
    const linkedBankTx = await BankTransaction.findOne({
      userId: req.user._id,
      relatedId: payment._id,
    });

    if (linkedBankTx) {
      const bankAccount = await BankAccount.findOne({
        _id: linkedBankTx.bankAccountId,
        userId: req.user._id,
      });

      if (bankAccount) {
        if (linkedBankTx.type === "supplier_payment") {
          // Add back the deducted amount
          bankAccount.currentBalance =
            Number(bankAccount.currentBalance || 0) + Number(linkedBankTx.amount);
        } else if (linkedBankTx.type === "customer_receipt") {
          // Subtract the added amount
          bankAccount.currentBalance = Math.max(
            0,
            Number(bankAccount.currentBalance || 0) - Number(linkedBankTx.amount)
          );
        }
        await bankAccount.save();
      }

      await linkedBankTx.deleteOne();
    }

    if (payment.autoPaymentGroupId) {
      const group = await AutoPaymentGroup.findOne({ _id: payment.autoPaymentGroupId, userId: req.user._id });
      if (group) {
        group.paymentIds = group.paymentIds.filter((id) => id.toString() !== payment._id.toString());
        group.allocations = group.allocations.filter((allocation) => allocation.relatedId.toString() !== payment.relatedId.toString());
        group.totalAmount = Math.max(0, Number(group.totalAmount || 0) - Number(payment.amount || 0));
        if (group.paymentIds.length === 0) await group.deleteOne();
        else await group.save();
      }
    }

    await payment.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Payment transaction deleted and balances rolled back successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete payment.",
    });
  }
};

// 4. Payment Dashboard & Reports Summary
export const getPaymentDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch all sales and stocks with outstanding balance
    const [sales, stocks, payments, expenseTotals] = await Promise.all([
      Sales.find({ userId }).populate("buyerId", "name phone").sort({ date: -1 }),
      Stock.find({ userId }).populate("millerId", "name phone").sort({ date: -1 }),
      Payment.find({ userId }).populate("partyId", "name type").sort({ paymentDate: -1 }),
      Expense.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    let totalReceivables = 0;
    let totalPayables = 0;
    let totalSalesAmount = 0;
    let totalStockAmount = 0;
    let totalProfit = 0;
    const totalExpenses = Number(expenseTotals[0]?.total || 0);

    let overdueReceivables = [];
    let overduePayables = [];
    let upcomingReceivables = [];
    let upcomingPayables = [];

    // Process Sales (Receivables)
    sales.forEach((sale) => {
      const remaining = Number(sale.remainingAmount || 0);
      totalReceivables += remaining;
      totalSalesAmount += Number(sale.totalAmount || 0);
      totalProfit += Number(sale.profit || 0);

      if (remaining > 0) {
        const saleDate = new Date(sale.date);
        let dueDate = sale.dueDate ? new Date(sale.dueDate) : null;
        if (!dueDate) {
          const days = Number(sale.dueDays || 0);
          dueDate = new Date(saleDate.getTime() + days * 24 * 60 * 60 * 1000);
        }

        const isOverdue = dueDate < startOfToday;
        const diffMs = startOfToday.getTime() - dueDate.getTime();
        const daysOverdue = isOverdue
          ? Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
          : 0;

        const saleItem = {
          _id: sale._id,
          billNumber: sale.billNumber,
          date: sale.date,
          dueDate,
          daysOverdue,
          isOverdue,
          buyer: sale.buyerId,
          itemName: sale.itemName,
          totalAmount: sale.totalAmount,
          paidAmount: sale.paidAmount,
          remainingAmount: sale.remainingAmount,
          status: sale.status,
          paymentType: sale.paymentType,
        };

        if (isOverdue) {
          overdueReceivables.push(saleItem);
        } else {
          upcomingReceivables.push(saleItem);
        }
      }
    });

    // Process Stocks (Payables)
    stocks.forEach((stock) => {
      const remaining = Number(stock.remainingAmount || 0);
      totalPayables += remaining;
      totalStockAmount += Number(stock.totalAmount || 0);

      if (remaining > 0) {
        const stockDate = new Date(stock.date);
        let dueDate = stock.dueDate ? new Date(stock.dueDate) : null;
        if (!dueDate) {
          const days = Number(stock.dueDays || 0);
          dueDate = new Date(stockDate.getTime() + days * 24 * 60 * 60 * 1000);
        }

        const isOverdue = dueDate < startOfToday;
        const diffMs = startOfToday.getTime() - dueDate.getTime();
        const daysOverdue = isOverdue
          ? Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
          : 0;

        const stockItem = {
          _id: stock._id,
          receiptNumber: stock.receiptNumber,
          date: stock.date,
          dueDate,
          daysOverdue,
          isOverdue,
          miller: stock.millerId,
          itemName: stock.itemName,
          totalAmount: stock.totalAmount,
          paidAmount: stock.paidAmount,
          remainingAmount: stock.remainingAmount,
          status: stock.status,
          paymentType: stock.paymentType,
        };

        if (isOverdue) {
          overduePayables.push(stockItem);
        } else {
          upcomingPayables.push(stockItem);
        }
      }
    });

    // Calculate Inflows & Outflows from Payments
    let totalReceived = 0;
    let totalPaid = 0;

    payments.forEach((p) => {
      if (p.type === "inflow") {
        totalReceived += Number(p.amount || 0);
      } else if (p.type === "outflow") {
        totalPaid += Number(p.amount || 0);
      }
    });

    // Sort overdue by most days overdue descending
    overdueReceivables.sort((a, b) => b.daysOverdue - a.daysOverdue);
    overduePayables.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Sort upcoming by closest dueDate ascending
    upcomingReceivables.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    upcomingPayables.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const totalOverdueReceivablesAmount = overdueReceivables.reduce(
      (sum, item) => sum + item.remainingAmount,
      0
    );
    const totalOverduePayablesAmount = overduePayables.reduce(
      (sum, item) => sum + item.remainingAmount,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSalesAmount,
          totalStockAmount,
          totalProfit,
          totalExpenses,
          netProfit: totalProfit - totalExpenses,
          totalReceivables,
          totalPayables,
          totalReceived,
          totalPaid,
          overdueReceivablesCount: overdueReceivables.length,
          overdueReceivablesAmount: totalOverdueReceivablesAmount,
          overduePayablesCount: overduePayables.length,
          overduePayablesAmount: totalOverduePayablesAmount,
        },
        overdueReceivables,
        overduePayables,
        upcomingReceivables,
        upcomingPayables,
        recentPayments: payments.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Payment Dashboard Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load payment dashboard summary.",
    });
  }
};

// 5. Automatic Payment Allocation (FIFO)
export const autoAllocatePayment = async (req, res) => {
  try {
    const {
      partyId,
      amount,
      paymentDate,
      paymentMethod = "cash",
      bankAccountId,
      notes = "",
    } = req.body;

    const numAmount = Number(amount);
    if (!partyId || !Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Party ID and a valid positive amount are required.",
      });
    }

    const party = await Party.findOne({
      _id: partyId,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    if (party.type === "Buyer") {
      const unpaidSales = await Sales.find({
        buyerId: party._id,
        userId: req.user._id,
        remainingAmount: { $gt: 0 },
      }).sort({ date: 1, createdAt: 1 });

      if (unpaidSales.length === 0) {
        return res.status(400).json({
          success: false,
          message: "This buyer does not have any outstanding unpaid invoices.",
        });
      }

      const totalOutstanding = unpaidSales.reduce(
        (sum, s) => sum + Number(s.remainingAmount || 0),
        0
      );

      if (numAmount > totalOutstanding) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${numAmount.toLocaleString()}) cannot exceed total outstanding balance of Rs. ${totalOutstanding.toLocaleString()}.`,
        });
      }

      if (bankAccountId) {
        const account = await BankAccount.findOne({ _id: bankAccountId, userId: req.user._id });
        if (!account) return res.status(404).json({ success: false, message: "Bank account not found." });
        if (numAmount > Number(account.currentBalance || 0)) return res.status(400).json({ success: false, message: "Payment exceeds the selected account balance." });
      }

      // ── Build allocation breakdown first (without saving yet) ──────────────
      let remainingToAllocate = numAmount;
      const allocationDetails = []; // for AutoPaymentGroup
      const billUpdates = [];       // deferred sales mutations

      for (const sale of unpaidSales) {
        if (remainingToAllocate <= 0) break;

        const outstanding = Number(sale.remainingAmount);
        const amountApplied = Math.min(remainingToAllocate, outstanding);

        const newPaidAmount = Number(sale.paidAmount || 0) + amountApplied;
        const newRemaining = Math.max(0, Number(sale.totalAmount) - newPaidAmount);
        const newStatus = newRemaining <= 0 ? "paid" : "partial";

        allocationDetails.push({
          relatedId: sale._id,
          relatedType: "Sale",
          referenceNumber: sale.billNumber || "",
          itemName: sale.itemName || "",
          billTotal: Number(sale.totalAmount || 0),
          amountAllocated: amountApplied,
          newPaidAmount,
          newRemainingAmount: newRemaining,
          statusAfter: newStatus,
          isFullySettled: newStatus === "paid",
        });

        billUpdates.push({ sale, newPaidAmount, newRemaining, newStatus });
        remainingToAllocate -= amountApplied;
      }

      // ── Create the master AutoPaymentGroup record ──────────────────────────
      const autoGroup = await AutoPaymentGroup.create({
        userId: req.user._id,
        partyId: party._id,
        partyType: "Buyer",
        paymentType: "inflow",
        totalAmount: numAmount,
        remainingAfter: remainingToAllocate,
        paymentDate: payDate,
        paymentMethod: paymentMethod || "cash",
        notes: notes || "",
        allocations: allocationDetails,
        paymentIds: [],
      });

      // ── Apply mutations + create individual Payment records ────────────────
      const createdPayments = [];
      const responseAllocations = [];

      for (let i = 0; i < billUpdates.length; i++) {
        const { sale, newPaidAmount, newRemaining, newStatus } = billUpdates[i];

        sale.paidAmount = newPaidAmount;
        sale.remainingAmount = newRemaining;
        sale.status = newStatus;
        await sale.save();

        const paymentNote = notes
          ? `${notes} (FIFO auto-allocated to ${sale.billNumber})`
          : `Auto-allocated payment to #${sale.billNumber}`;

        const payment = await Payment.create({
          userId: req.user._id,
          type: "inflow",
          partyId: party._id,
          partyType: "Buyer",
          relatedType: "Sale",
          relatedId: sale._id,
          referenceNumber: sale.billNumber,
          paymentDate: payDate,
          amount: allocationDetails[i].amountAllocated,
          paymentMethod: paymentMethod || "cash",
          notes: paymentNote,
          autoPaymentGroupId: autoGroup._id,
          isAutoAllocation: true,
        });

        createdPayments.push(payment);
        responseAllocations.push({
          saleId: sale._id,
          billNumber: sale.billNumber,
          date: sale.date,
          allocatedAmount: allocationDetails[i].amountAllocated,
          newRemaining,
          status: newStatus,
          isFullyPaid: newStatus === "paid",
        });
      }

      // ── Store paymentIds back on the group ─────────────────────────────────
      autoGroup.paymentIds = createdPayments.map((p) => p._id);
      await autoGroup.save();

      return res.status(201).json({
        success: true,
        message: `Successfully allocated Rs. ${numAmount.toLocaleString()} across ${responseAllocations.length} invoice(s) using FIFO.`,
        data: {
          totalAllocated: numAmount,
          party: { id: party._id, name: party.name, type: party.type },
          paymentDate: payDate,
          autoPaymentGroupId: autoGroup._id,
          allocations: responseAllocations,
          payments: createdPayments,
        },
      });
    } else if (party.type === "Miller") {
      const unpaidStocks = await Stock.find({
        millerId: party._id,
        userId: req.user._id,
        remainingAmount: { $gt: 0 },
      }).sort({ date: 1, createdAt: 1 });

      if (unpaidStocks.length === 0) {
        return res.status(400).json({
          success: false,
          message: "This supplier does not have any outstanding unpaid purchases.",
        });
      }

      const totalOutstanding = unpaidStocks.reduce(
        (sum, s) => sum + Number(s.remainingAmount || 0),
        0
      );

      if (numAmount > totalOutstanding) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${numAmount.toLocaleString()}) cannot exceed total outstanding balance of Rs. ${totalOutstanding.toLocaleString()}.`,
        });
      }

      if (bankAccountId) {
        const account = await BankAccount.findOne({ _id: bankAccountId, userId: req.user._id });
        if (!account) return res.status(404).json({ success: false, message: "Bank account not found." });
        if (numAmount > Number(account.currentBalance || 0)) return res.status(400).json({ success: false, message: "Payment exceeds the selected account balance." });
      }

      // ── Build allocation breakdown ─────────────────────────────────────────
      let remainingToAllocate = numAmount;
      const allocationDetails = [];
      const stockUpdates = [];

      for (const stock of unpaidStocks) {
        if (remainingToAllocate <= 0) break;

        const outstanding = Number(stock.remainingAmount);
        const amountApplied = Math.min(remainingToAllocate, outstanding);

        const newPaidAmount = Number(stock.paidAmount || 0) + amountApplied;
        const newRemaining = Math.max(0, Number(stock.totalAmount) - newPaidAmount);
        const newStatus = newRemaining <= 0 ? "paid" : "partial";

        allocationDetails.push({
          relatedId: stock._id,
          relatedType: "Stock",
          referenceNumber: stock.receiptNumber || "",
          itemName: stock.itemName || "",
          billTotal: Number(stock.totalAmount || 0),
          amountAllocated: amountApplied,
          newPaidAmount,
          newRemainingAmount: newRemaining,
          statusAfter: newStatus,
          isFullySettled: newStatus === "paid",
        });

        stockUpdates.push({ stock, newPaidAmount, newRemaining, newStatus });
        remainingToAllocate -= amountApplied;
      }

      // ── Create the master AutoPaymentGroup record ──────────────────────────
      const autoGroup = await AutoPaymentGroup.create({
        userId: req.user._id,
        partyId: party._id,
        partyType: "Miller",
        paymentType: "outflow",
        totalAmount: numAmount,
        remainingAfter: remainingToAllocate,
        paymentDate: payDate,
        paymentMethod: paymentMethod || "cash",
        notes: notes || "",
        allocations: allocationDetails,
        paymentIds: [],
      });

      // ── Apply mutations + create individual Payment records ────────────────
      const createdPayments = [];
      const responseAllocations = [];

      for (let i = 0; i < stockUpdates.length; i++) {
        const { stock, newPaidAmount, newRemaining, newStatus } = stockUpdates[i];

        stock.paidAmount = newPaidAmount;
        stock.remainingAmount = newRemaining;
        stock.status = newStatus;
        await stock.save();

        const paymentNote = notes
          ? `${notes} (FIFO auto-allocated to ${stock.receiptNumber})`
          : `Auto-allocated payment to #${stock.receiptNumber}`;

        const payment = await Payment.create({
          userId: req.user._id,
          type: "outflow",
          partyId: party._id,
          partyType: "Miller",
          relatedType: "Stock",
          relatedId: stock._id,
          referenceNumber: stock.receiptNumber,
          paymentDate: payDate,
          amount: allocationDetails[i].amountAllocated,
          paymentMethod: paymentMethod || "cash",
          notes: paymentNote,
          autoPaymentGroupId: autoGroup._id,
          isAutoAllocation: true,
        });

        if (bankAccountId) {
          const targetBankAccount = await BankAccount.findOne({
            _id: bankAccountId,
            userId: req.user._id,
          });
          if (targetBankAccount) {
            targetBankAccount.currentBalance =
              Number(targetBankAccount.currentBalance || 0) - allocationDetails[i].amountAllocated;
            await targetBankAccount.save();

            await BankTransaction.create({
              userId: req.user._id,
              bankAccountId: targetBankAccount._id,
              type: "supplier_payment",
              amount: allocationDetails[i].amountAllocated,
              balanceAfter: targetBankAccount.currentBalance,
              relatedType: "Payment",
              relatedId: payment._id,
              partyName: party.name,
              referenceNumber: stock.receiptNumber,
              paymentMethod: paymentMethod || "bank_transfer",
              date: payDate,
              notes: paymentNote,
            });
          }
        }

        createdPayments.push(payment);
        responseAllocations.push({
          stockId: stock._id,
          receiptNumber: stock.receiptNumber,
          date: stock.date,
          allocatedAmount: allocationDetails[i].amountAllocated,
          newRemaining,
          status: newStatus,
          isFullyPaid: newStatus === "paid",
        });
      }

      // ── Store paymentIds back on the group ─────────────────────────────────
      autoGroup.paymentIds = createdPayments.map((p) => p._id);
      await autoGroup.save();

      return res.status(201).json({
        success: true,
        message: `Successfully allocated Rs. ${numAmount.toLocaleString()} across ${responseAllocations.length} purchase voucher(s) using FIFO.`,
        data: {
          totalAllocated: numAmount,
          party: { id: party._id, name: party.name, type: party.type },
          paymentDate: payDate,
          autoPaymentGroupId: autoGroup._id,
          allocations: responseAllocations,
          payments: createdPayments,
        },
      });
    }
  } catch (error) {
    console.error("Auto Allocate Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to auto-allocate payment.",
    });
  }
};

// 6. Preview FIFO Allocation
export const getAutoAllocatePreview = async (req, res) => {
  try {
    const { partyId, amount } = req.query;
    if (!partyId) {
      return res.status(400).json({
        success: false,
        message: "Party ID is required.",
      });
    }

    const party = await Party.findOne({
      _id: partyId,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    const numAmount = Number(amount || 0);

    if (party.type === "Buyer") {
      const unpaidSales = await Sales.find({
        buyerId: party._id,
        userId: req.user._id,
        remainingAmount: { $gt: 0 },
      }).sort({ date: 1, createdAt: 1 });

      const totalOutstanding = unpaidSales.reduce(
        (sum, s) => sum + Number(s.remainingAmount || 0),
        0
      );

      let remainingToAllocate = numAmount;
      const preview = unpaidSales.map((sale) => {
        const remaining = Number(sale.remainingAmount);
        let willApply = 0;
        let newRemaining = remaining;
        let newStatus = sale.status;

        if (remainingToAllocate > 0) {
          willApply = Math.min(remainingToAllocate, remaining);
          newRemaining = remaining - willApply;
          newStatus = newRemaining <= 0 ? "paid" : "partial";
          remainingToAllocate -= willApply;
        }

        return {
          id: sale._id,
          referenceNumber: sale.billNumber,
          date: sale.date,
          itemName: sale.itemName,
          totalAmount: sale.totalAmount,
          currentRemaining: remaining,
          amountToAllocate: willApply,
          newRemaining,
          currentStatus: sale.status,
          projectedStatus: newStatus,
          isFullyCleared: newRemaining <= 0 && willApply > 0,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          party: { id: party._id, name: party.name, type: party.type },
          totalOutstanding,
          inputAmount: numAmount,
          unallocatedRemainder: remainingToAllocate,
          invoices: preview,
        },
      });
    } else {
      const unpaidStocks = await Stock.find({
        millerId: party._id,
        userId: req.user._id,
        remainingAmount: { $gt: 0 },
      }).sort({ date: 1, createdAt: 1 });

      const totalOutstanding = unpaidStocks.reduce(
        (sum, s) => sum + Number(s.remainingAmount || 0),
        0
      );

      let remainingToAllocate = numAmount;
      const preview = unpaidStocks.map((stock) => {
        const remaining = Number(stock.remainingAmount);
        let willApply = 0;
        let newRemaining = remaining;
        let newStatus = stock.status;

        if (remainingToAllocate > 0) {
          willApply = Math.min(remainingToAllocate, remaining);
          newRemaining = remaining - willApply;
          newStatus = newRemaining <= 0 ? "paid" : "partial";
          remainingToAllocate -= willApply;
        }

        return {
          id: stock._id,
          referenceNumber: stock.receiptNumber,
          date: stock.date,
          itemName: stock.itemName,
          totalAmount: stock.totalAmount,
          currentRemaining: remaining,
          amountToAllocate: willApply,
          newRemaining,
          currentStatus: stock.status,
          projectedStatus: newStatus,
          isFullyCleared: newRemaining <= 0 && willApply > 0,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          party: { id: party._id, name: party.name, type: party.type },
          totalOutstanding,
          inputAmount: numAmount,
          unallocatedRemainder: remainingToAllocate,
          invoices: preview,
        },
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate allocation preview.",
    });
  }
};

// 7. Get Auto Payment Groups (audit history for FIFO payments)
export const getAutoPaymentGroups = async (req, res) => {
  try {
    const { partyId } = req.query;

    if (!partyId) {
      return res.status(400).json({
        success: false,
        message: "partyId is required.",
      });
    }

    const groups = await AutoPaymentGroup.find({
      userId: req.user._id,
      partyId,
    }).sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error("Get Auto Payment Groups Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch auto payment groups.",
    });
  }
};
