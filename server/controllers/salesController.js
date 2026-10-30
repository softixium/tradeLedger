import Sales from "../models/sales.js";
import Stock from "../models/stock.js";
import Party from "../models/party.js";
import Payment from "../models/Payment.js";
import generateBillNumber from "../utils/generateBillNumber.js";

export const createSale = async (req, res) => {
  try {
    const {
      date,
      buyerId,
      items, // Array of items for multi-item sale invoice
      // Single-item fallback fields:
      stockId,
      itemName,
      quantity,
      weight,
      rate,
      purchaseRate,
      totalAmount,
      profit,
      bhardanaRate,
      bhardana,
      paidAmount,
      remainingAmount,
      status,
      paymentType,
      dueDays,
      dueDate,
    } = req.body;

    // Buyer Check
    const buyer = await Party.findOne({
      _id: buyerId,
      userId: req.user._id,
      type: "Buyer",
    });

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: "Buyer not found",
      });
    }

    const billNumber = await generateBillNumber(req.user._id);
    const saleDate = date ? new Date(date) : new Date();

    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    if (!calculatedDueDate) {
      if (paymentType === "udhar") {
        const days = Number(dueDays || 0);
        calculatedDueDate = new Date(saleDate.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        calculatedDueDate = saleDate;
      }
    }

    // MULTI-ITEM SALES INVOICE
    if (Array.isArray(items) && items.length > 0) {
      if (items.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.rate)) || Number(item.rate) <= 0)) {
        return res.status(400).json({ success: false, message: "Every item must have a positive quantity and rate." });
      }
      if (!Number.isFinite(Number(paidAmount || 0)) || Number(paidAmount || 0) < 0) {
        return res.status(400).json({ success: false, message: "Paid amount must be a non-negative number." });
      }
      // Validate all stocks first to ensure enough stock is available for each item
      const stockDocs = [];
      const stocksById = new Map();
      const requestedByStock = new Map();
      for (const item of items) {
        const key = String(item.stockId);
        requestedByStock.set(key, (requestedByStock.get(key) || 0) + Number(item.quantity));
        let stock = stocksById.get(key);
        if (!stock) {
          stock = await Stock.findOne({
            _id: item.stockId,
            userId: req.user._id,
          });
          if (stock) stocksById.set(key, stock);
        }

        if (!stock) {
          return res.status(404).json({
            success: false,
            message: `Stock item not found for ID: ${item.stockId}`,
          });
        }

        if (requestedByStock.get(key) > Number(stock.remainingQuantity)) {
          return res.status(400).json({
            success: false,
            message: `Only ${stock.remainingQuantity} quantity available for "${stock.itemName}". You requested ${requestedByStock.get(key)} in this invoice.`,
          });
        }

        stockDocs.push(stock);
      }

      const overallPaidAmount = Number(paidAmount || 0);
      const totalBillAmount = items.reduce((sum, item, index) => {
        const stock = stockDocs[index];
        const qty = Number(item.quantity);
        const weight = Number(item.weight || qty * Number(stock.weightPerKatta || 0));
        const amount = weight * Number(item.rate) + Number(item.bhardana || qty * Number(item.bhardanaRate || 0));
        return sum + amount;
      }, 0);
      if (overallPaidAmount > totalBillAmount) {
        return res.status(400).json({ success: false, message: "Paid amount cannot exceed invoice total." });
      }
      let remainingPaymentToDistribute = overallPaidAmount;
      const createdSales = [];
      const deductionsByStock = new Map();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const stock = stockDocs[i];

        const itemQty = Number(item.quantity);
        const itemWeight = Number(item.weight || (itemQty * Number(stock.weightPerKatta || 0)));
        const itemRate = Number(item.rate);
        const itemPurchaseRate = Number(stock.purchaseRate || item.purchaseRate || 0);
        const itemBhardanaRate = Number(item.bhardanaRate || 0);
        const itemBhardana = Number(item.bhardana || (itemQty * itemBhardanaRate));
        const itemTotalAmount = itemWeight * itemRate + itemBhardana;
        const itemProfit = (itemRate - itemPurchaseRate) * itemWeight;

        // Distribute paid amount across items
        let itemPaid = 0;
        if (remainingPaymentToDistribute > 0) {
          itemPaid = Math.min(remainingPaymentToDistribute, itemTotalAmount);
          remainingPaymentToDistribute -= itemPaid;
        }

        const itemRemaining = Math.max(0, itemTotalAmount - itemPaid);
        let itemStatus = status || "unpaid";
        if (itemRemaining <= 0) {
          itemStatus = "paid";
        } else if (itemPaid > 0) {
          itemStatus = "partial";
        } else {
          itemStatus = "unpaid";
        }

        const createdSaleItem = await Sales.create({
          userId: req.user._id,
          billNumber,
          groupBillNumber: billNumber,
          date: saleDate,
          buyerId,
          stockId: stock._id,
          itemName: item.itemName || stock.itemName,
          quantity: itemQty,
          weight: itemWeight,
          rate: itemRate,
          purchaseRate: itemPurchaseRate,
          totalAmount: itemTotalAmount,
          profit: itemProfit,
          bhardanaRate: itemBhardanaRate,
          bhardana: itemBhardana,
          paidAmount: itemPaid,
          remainingAmount: itemRemaining,
          status: itemStatus,
          paymentType: paymentType || "cash",
          dueDays: Number(dueDays || 0),
          dueDate: calculatedDueDate,
        });

        const stockKey = String(stock._id);
        const deduction = deductionsByStock.get(stockKey) || { stock, quantity: 0, weight: 0 };
        deduction.quantity += itemQty;
        deduction.weight += itemWeight;
        deductionsByStock.set(stockKey, deduction);

        createdSales.push(createdSaleItem);
      }

      // Apply one summed deduction per stock batch. This avoids stale per-line
      // documents overwriting earlier deductions when a batch appears multiple times.
      for (const { stock, quantity: soldQuantity, weight: soldWeight } of deductionsByStock.values()) {
        stock.remainingQuantity = Math.max(0, Number(stock.remainingQuantity) - soldQuantity);
        stock.remainingWeight = Math.max(0, Number(stock.remainingWeight) - soldWeight);
        if (stock.remainingQuantity === 0) stock.remainingWeight = 0;
        await stock.save();
      }

      // Record payment inflow transaction if any payment was collected
      if (overallPaidAmount > 0) {
        for (const saleItem of createdSales) {
          if (saleItem.paidAmount <= 0) continue;
          await Payment.create({
          userId: req.user._id,
          type: "inflow",
          partyId: buyerId,
          partyType: "Buyer",
          relatedType: "Sale",
          relatedId: saleItem._id,
          referenceNumber: billNumber,
          paymentDate: saleDate,
          amount: saleItem.paidAmount,
          paymentMethod: "cash",
          notes: `Initial payment on multi-item sales invoice (${createdSales.length} items)`,
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: `Sale invoice #${billNumber} created successfully with ${createdSales.length} items.`,
        data: createdSales[0],
        items: createdSales,
        billNumber,
      });
    }

    // SINGLE-ITEM SALE (Backwards Compatibility)
    const stock = await Stock.findOne({
      _id: stockId,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    if (Number(quantity) > Number(stock.remainingQuantity)) {
      return res.status(400).json({
        success: false,
        message: `Only ${stock.remainingQuantity} quantity available.`,
      });
    }

    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0 || !Number.isFinite(Number(weight)) || Number(weight) <= 0 || !Number.isFinite(Number(rate)) || Number(rate) <= 0 || !Number.isFinite(Number(paidAmount || 0)) || Number(paidAmount || 0) < 0) {
      return res.status(400).json({ success: false, message: "Sale quantities and amounts must be valid positive values, and paid amount cannot exceed total." });
    }

    const singlePaidAmount = Number(paidAmount || 0);
    const singleTotalAmount = Number(weight) * Number(rate) + Number(bhardana || 0);
    if (!Number.isFinite(singleTotalAmount) || singleTotalAmount <= 0 || singlePaidAmount > singleTotalAmount) return res.status(400).json({ success: false, message: "Paid amount cannot exceed the calculated sale total." });
    const sale = await Sales.create({
      userId: req.user._id,

      billNumber,
      groupBillNumber: billNumber,

      date: saleDate,

      buyerId,

      stockId,

      itemName: itemName || stock.itemName,

      quantity: Number(quantity),

      weight: Number(weight),

      rate: Number(rate),

      purchaseRate: Number(purchaseRate || stock.purchaseRate),

      totalAmount: singleTotalAmount,

      profit: (Number(rate) - Number(purchaseRate || stock.purchaseRate)) * Number(weight),

      bhardanaRate: Number(bhardanaRate || 0),

      bhardana: Number(bhardana || 0),

      paidAmount: singlePaidAmount,

      remainingAmount: Math.max(0, singleTotalAmount - singlePaidAmount),

      status: singlePaidAmount >= singleTotalAmount ? "paid" : singlePaidAmount > 0 ? "partial" : "unpaid",

      paymentType,

      dueDays: Number(dueDays || 0),

      dueDate: calculatedDueDate,
    });

    // If initial payment was made, record payment transaction
    if (Number(paidAmount) > 0) {
      await Payment.create({
        userId: req.user._id,
        type: "inflow",
        partyId: buyerId,
        partyType: "Buyer",
        relatedType: "Sale",
        relatedId: sale._id,
        referenceNumber: billNumber,
        paymentDate: saleDate,
        amount: Number(paidAmount),
        paymentMethod: "cash",
        notes: "Initial payment on invoice creation",
      });
    }

    // Update Stock
    stock.remainingQuantity =
      Number(stock.remainingQuantity) - Number(quantity);

    stock.remainingWeight =
      Number(stock.remainingWeight) - Number(weight);

    if (stock.remainingQuantity <= 0) {
      stock.remainingQuantity = 0;
      stock.remainingWeight = 0;
    }

    await stock.save();

    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: sale,
      items: [sale],
      billNumber,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBuyers = async (req, res) => {
  try {
    const buyers = await Party.find({
      userId: req.user._id,
      type: "Buyer",
    })
      .select("name")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: buyers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSales = async (req, res) => {
  try {
    const sales = await Sales.find({
      userId: req.user._id,
    })
      .populate("buyerId", "name")
      .populate("stockId", "itemName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSaleItem = async (req, res) => {
  try {
    const sale = await Sales.findOne({ _id: req.params.id, userId: req.user._id });
    if (!sale) return res.status(404).json({ success: false, message: "Invoice item not found." });

    const invoiceItems = await Sales.find({ userId: req.user._id, billNumber: sale.billNumber }).select("_id");
    const invoiceIds = invoiceItems.map((item) => item._id);
    if (await Payment.exists({ userId: req.user._id, relatedType: "Sale", relatedId: { $in: invoiceIds } })) {
      return res.status(409).json({ success: false, message: "This bill has recorded payments. Remove or correct them before editing its items." });
    }

    const itemName = String(req.body.itemName || "").trim();
    const quantity = Number(req.body.quantity);
    const weight = Number(req.body.weight);
    const rate = Number(req.body.rate);
    const bhardana = Number(req.body.bhardana || 0);
    if (!itemName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(rate) || rate <= 0 || !Number.isFinite(bhardana) || bhardana < 0) {
      return res.status(400).json({ success: false, message: "Enter an item name and valid quantity, weight, rate, and Bhardana." });
    }

    const stock = await Stock.findOne({ _id: sale.stockId, userId: req.user._id });
    if (!stock) return res.status(404).json({ success: false, message: "The linked stock item was not found." });
    const otherSales = await Sales.find({ userId: req.user._id, stockId: sale.stockId, _id: { $ne: sale._id } }).select("quantity weight");
    const otherQuantity = otherSales.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const otherWeight = otherSales.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (otherQuantity + quantity > Number(stock.totalQuantity) || otherWeight + weight > Number(stock.totalWeight)) {
      return res.status(400).json({ success: false, message: "This change would exceed the available stock." });
    }

    const totalAmount = weight * rate + bhardana;
    const paidAmount = Number(sale.paidAmount || 0);
    if (paidAmount > totalAmount) return res.status(400).json({ success: false, message: "The updated total cannot be less than the amount already paid." });

    sale.itemName = itemName;
    sale.quantity = quantity;
    sale.weight = weight;
    sale.rate = rate;
    sale.bhardana = bhardana;
    sale.totalAmount = totalAmount;
    sale.profit = (rate - Number(sale.purchaseRate || 0)) * weight;
    sale.remainingAmount = Math.max(0, totalAmount - paidAmount);
    sale.status = sale.remainingAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
    await sale.save();

    stock.remainingQuantity = Math.max(0, Number(stock.totalQuantity) - otherQuantity - quantity);
    stock.remainingWeight = Math.max(0, Number(stock.totalWeight) - otherWeight - weight);
    await stock.save();
    return res.status(200).json({ success: true, message: "Invoice item updated successfully.", data: sale });
  } catch (error) {
    console.error("Update Invoice Item Error:", error);
    return res.status(500).json({ success: false, message: "Could not update this invoice item." });
  }
};

export const deleteSale = async (req, res) => {
  try {
    const sale = await Sales.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const invoiceItems = await Sales.find({ userId: req.user._id, billNumber: sale.billNumber });
    const invoiceIds = invoiceItems.map((item) => item._id);
    const linkedPayments = await Payment.find({ userId: req.user._id, relatedType: "Sale", relatedId: { $in: invoiceIds } });
    if (linkedPayments.length) {
      return res.status(409).json({ success: false, message: "This invoice has recorded payments. Delete or reconcile its payments before deleting the invoice." });
    }
    const stockTotals = new Map();
    invoiceItems.forEach((item) => {
      const key = String(item.stockId);
      const current = stockTotals.get(key) || { quantity: 0, weight: 0 };
      current.quantity += Number(item.quantity || 0);
      current.weight += Number(item.weight || 0);
      stockTotals.set(key, current);
    });
    for (const [stockId, totals] of stockTotals) {
      await Stock.updateOne({ _id: stockId, userId: req.user._id }, { $inc: { remainingQuantity: totals.quantity, remainingWeight: totals.weight } });
    }
    await Sales.deleteMany({ userId: req.user._id, billNumber: sale.billNumber });

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await Sales.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate("buyerId", "name phone address")
      .populate({
        path: "stockId",
        populate: { path: "millerId", select: "name phone address" },
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const payments = await Payment.find({
      userId: req.user._id,
      $or: [
        { relatedId: sale._id },
        { referenceNumber: sale.billNumber },
      ],
    }).sort({ paymentDate: -1, createdAt: -1 });

    // If this sale invoice had multiple items under the same bill, fetch them
    let siblingItems = [];
    if (sale.billNumber) {
      siblingItems = await Sales.find({
        userId: req.user._id,
        billNumber: sale.billNumber,
      }).populate({
        path: "stockId",
        populate: { path: "millerId", select: "name phone address" },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...sale.toObject(),
        payments,
        items: siblingItems.length > 1 ? siblingItems : [sale],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

