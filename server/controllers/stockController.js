import Stock from "../models/stock.js";
import Party from "../models/party.js";
import Sales from "../models/sales.js";
import Payment from "../models/Payment.js";
import generateReceiptNumber from "../utils/generateReciptNumber.js";

export const createStock = async (req, res) => {
  try {
    const {
      date,
      millerId,
      items, // Array of items for multi-item purchase bill
      // Single-item fallback fields:
      itemName,
      totalQuantity,
      weightPerKatta,
      totalWeight,
      purchaseRate,
      totalAmount,
      bhardanaRate,
      bhardana,
      paidAmount,
      paymentType,
      dueDays,
      dueDate,
      status,
    } = req.body;

    const miller = await Party.findOne({
      _id: millerId,
      userId: req.user._id,
      type: "Miller",
    });

    if (!miller) {
      return res.status(404).json({
        success: false,
        message: "Miller not found",
      });
    }

    const receiptNumber = await generateReceiptNumber(req.user._id);
    const stockDate = date ? new Date(date) : new Date();

    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    if (!calculatedDueDate) {
      if (paymentType === "udhar" || paymentType === "Udhar") {
        const days = Number(dueDays || 0);
        calculatedDueDate = new Date(stockDate.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        calculatedDueDate = stockDate;
      }
    }

    // MULTI-ITEM PURCHASE BILL
    if (Array.isArray(items) && items.length > 0) {
      if (!items.every((it) => String(it.itemName || "").trim() && Number.isFinite(Number(it.totalQuantity)) && Number(it.totalQuantity) > 0 && Number.isFinite(Number(it.weightPerKatta)) && Number(it.weightPerKatta) > 0 && Number.isFinite(Number(it.purchaseRate)) && Number(it.purchaseRate) > 0)) {
        return res.status(400).json({ success: false, message: "Each stock item requires a name, positive quantity, weight, and purchase rate." });
      }
      const overallPaidAmount = Number(paidAmount || 0);
      const overallTotalAmount = items.reduce((sum, it) => {
        const wt = Number(it.totalWeight || (Number(it.totalQuantity || 0) * Number(it.weightPerKatta || 0)));
        const rateAmt = wt * Number(it.purchaseRate || 0);
        const bhardanaAmt = Number(it.bhardana || (Number(it.totalQuantity || 0) * Number(it.bhardanaRate || 0)));
        return sum + rateAmt + bhardanaAmt;
      }, 0);
      if (!Number.isFinite(overallPaidAmount) || overallPaidAmount < 0 || overallPaidAmount > overallTotalAmount) {
        return res.status(400).json({ success: false, message: "Paid amount must be between zero and the purchase total." });
      }

      // Allocate paid amount proportionally or sequentially across items
      let remainingPaymentToDistribute = overallPaidAmount;
      const createdStocks = [];

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const itemQuantity = Number(it.totalQuantity);
        const itemWeightPerKatta = Number(it.weightPerKatta);
        const itemTotalWeight = Number(it.totalWeight || itemQuantity * itemWeightPerKatta);
        const itemPurchaseRate = Number(it.purchaseRate);
        const itemBhardanaRate = Number(it.bhardanaRate || 0);
        const itemBhardana = Number(it.bhardana || itemQuantity * itemBhardanaRate);
        const itemTotalAmount = itemTotalWeight * itemPurchaseRate + itemBhardana;

        // Determine this item's share of paid amount
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

        const createdItem = await Stock.create({
          userId: req.user._id,
          date: stockDate,
          millerId,
          itemName: it.itemName,
          totalQuantity: itemQuantity,
          weightPerKatta: itemWeightPerKatta,
          totalWeight: itemTotalWeight,
          purchaseRate: itemPurchaseRate,
          totalAmount: itemTotalAmount,
          remainingQuantity: it.remainingQuantity != null ? Number(it.remainingQuantity) : itemQuantity,
          remainingWeight: it.remainingWeight != null ? Number(it.remainingWeight) : itemTotalWeight,
          remainingAmount: itemRemaining,
          bhardanaRate: itemBhardanaRate,
          bhardana: itemBhardana,
          paidAmount: itemPaid,
          paymentType: paymentType ? paymentType.toLowerCase() : "cash",
          dueDays: Number(dueDays || 0),
          dueDate: calculatedDueDate,
          status: itemStatus,
          receiptNumber,
          groupReceiptNumber: receiptNumber,
        });

        createdStocks.push(createdItem);
      }

      // Record outflow payment for initial payment
      if (overallPaidAmount > 0) {
        for (const stockItem of createdStocks) {
          if (stockItem.paidAmount <= 0) continue;
          await Payment.create({
          userId: req.user._id,
          type: "outflow",
          partyId: millerId,
          partyType: "Miller",
          relatedType: "Stock",
          relatedId: stockItem._id,
          referenceNumber: receiptNumber,
          paymentDate: stockDate,
          amount: stockItem.paidAmount,
          paymentMethod: "cash",
          notes: `Initial payment on multi-item purchase receipt (${createdStocks.length} items)`,
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: `Successfully purchased ${createdStocks.length} stock item(s) under receipt #${receiptNumber}.`,
        data: createdStocks[0],
        items: createdStocks,
        receiptNumber,
      });
    }

    // SINGLE-ITEM PURCHASE (Backwards Compatibility)
    const singleTotal = Number(totalWeight || Number(totalQuantity) * Number(weightPerKatta)) * Number(purchaseRate) + Number(bhardana || Number(totalQuantity) * Number(bhardanaRate || 0));
    const singlePaid = Number(paidAmount || 0);
    if (!String(itemName || "").trim() || !Number.isFinite(Number(totalQuantity)) || Number(totalQuantity) <= 0 || !Number.isFinite(Number(weightPerKatta)) || Number(weightPerKatta) <= 0 || !Number.isFinite(Number(purchaseRate)) || Number(purchaseRate) <= 0 || !Number.isFinite(singleTotal) || singleTotal <= 0 || !Number.isFinite(singlePaid) || singlePaid < 0 || singlePaid > singleTotal) {
      return res.status(400).json({ success: false, message: "Stock quantities and amounts must be valid positive values, and paid amount cannot exceed total." });
    }
    const singleQuantity = Number(totalQuantity);
    const singleWeight = Number(totalWeight || singleQuantity * Number(weightPerKatta));
    const singlePaidAmount = Number(paidAmount || 0);
    const stock = await Stock.create({
      userId: req.user._id,

      date: stockDate,
      millerId,

      itemName,

      totalQuantity: Number(totalQuantity),
      weightPerKatta: Number(weightPerKatta),
      totalWeight: singleWeight,

      purchaseRate: Number(purchaseRate),
      totalAmount: singleTotal,

      remainingQuantity: singleQuantity,
      remainingWeight: singleWeight,
      remainingAmount: Math.max(0, singleTotal - singlePaidAmount),

      bhardanaRate: Number(bhardanaRate || 0),
      bhardana: Number(bhardana || 0),

      paidAmount: singlePaidAmount,

      paymentType: paymentType ? paymentType.toLowerCase() : "cash",
      dueDays: Number(dueDays || 0),
      dueDate: calculatedDueDate,

      status: singlePaidAmount >= singleTotal ? "paid" : singlePaidAmount > 0 ? "partial" : "unpaid",

      receiptNumber,
      groupReceiptNumber: receiptNumber,
    });

    // If initial payment was made to supplier, log payment transaction
    if (Number(paidAmount) > 0) {
      await Payment.create({
        userId: req.user._id,
        type: "outflow",
        partyId: millerId,
        partyType: "Miller",
        relatedType: "Stock",
        relatedId: stock._id,
        referenceNumber: receiptNumber,
        paymentDate: stockDate,
        amount: Number(paidAmount),
        paymentMethod: "cash",
        notes: "Initial payment on stock purchase",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Stock added successfully.",
      data: stock,
      items: [stock],
      receiptNumber,
    });
  } catch (error) {
    console.error("Create Stock Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating stock.",
      error: error.message,
    });
  }
};

export const getMillers = async (req, res) => {
  try {
    const millers = await Party.find({
      userId: req.user._id,
      type: "Miller",
    })
      .select("name")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: millers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMillerDetails = async (req, res) => {
  try {
    const miller = await Party.findOne({
      _id: req.params.id,
      userId: req.user._id,
      type: "Miller",
    });

    if (!miller) {
      return res.status(404).json({
        success: false,
        message: "Miller not found",
      });
    }

    const stocks = await Stock.find({
      userId: req.user._id,
      millerId: req.params.id,
    }).sort({
      createdAt: -1,
    });

    const summary = {
      totalKatte: 0,
      totalWeight: 0,
      remainingKatte: 0,
      remainingWeight: 0,
      totalAmount: 0,
      paidAmount: 0,
    };

    stocks.forEach((stock) => {
      summary.totalKatte += stock.katte;
      summary.totalWeight += stock.totalWeight;
      summary.remainingKatte += stock.remainingKatte;
      summary.remainingWeight += stock.remainingWeight;
      summary.totalAmount += stock.totalAmount;
      summary.paidAmount += stock.paidAmount;
    });

    summary.pendingAmount = summary.totalAmount - summary.paidAmount;

    res.status(200).json({
      success: true,

      party: miller,

      summary,

      stocks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({
      userId: req.user._id,
    })
      .populate("millerId", "name phone address")
      .sort({ createdAt: -1 });

    const soldTotals = await Sales.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$stockId", quantity: { $sum: "$quantity" }, weight: { $sum: "$weight" } } },
    ]);
    const soldByStock = new Map(soldTotals.map((entry) => [String(entry._id), entry]));
    const reconciledStocks = stocks.map((stock) => {
      const sold = soldByStock.get(String(stock._id)) || { quantity: 0, weight: 0 };
      return {
        ...stock.toObject(),
        remainingQuantity: Math.max(0, Number(stock.totalQuantity || 0) - Number(sold.quantity || 0)),
        remainingWeight: Math.max(0, Number(stock.totalWeight || 0) - Number(sold.weight || 0)),
      };
    });

    res.status(200).json({
      success: true,
      count: reconciledStocks.length,
      data: reconciledStocks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("millerId", "name phone address");

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const salesFromStock = await Sales.find({
      stockId: stock._id,
      userId: req.user._id,
    })
      .populate("buyerId", "name phone")
      .sort({ date: -1, createdAt: -1 });

    const payments = await Payment.find({
      userId: req.user._id,
      $or: [
        { relatedId: stock._id },
        { referenceNumber: stock.receiptNumber },
      ],
    }).sort({ paymentDate: -1, createdAt: -1 });

    // If this purchase had multiple items under the same receipt, fetch them
    let siblingItems = [];
    if (stock.receiptNumber) {
      siblingItems = await Stock.find({
        userId: req.user._id,
        receiptNumber: stock.receiptNumber,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...stock.toObject(),
        sales: salesFromStock,
        payments,
        items: siblingItems.length > 1 ? siblingItems : [stock],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const editStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const {
      date,
      millerId,
      itemName,
      totalQuantity,
      weightPerKatta,
      totalWeight,
      purchaseRate,
      totalAmount,
      remainingQuantity,
      remainingWeight,
      remainingAmount,
      bhardanaRate,
      bhardana,
      paidAmount,
      paymentType,
      dueDays,
      status,
    } = req.body;

    // Check Miller
    const miller = await Party.findOne({
      _id: millerId,
      userId: req.user._id,
      type: "Miller",
    });

    if (!miller) {
      return res.status(404).json({
        success: false,
        message: "Miller not found",
      });
    }

    const nextTotalQuantity = Number(totalQuantity);
    const nextTotalWeight = Number(totalWeight);
    if (!Number.isFinite(nextTotalQuantity) || nextTotalQuantity <= 0 || !Number.isFinite(nextTotalWeight) || nextTotalWeight <= 0) {
      return res.status(400).json({ success: false, message: "Total quantity and total weight must be positive numbers." });
    }

    // Rebuild remaining inventory from the sales ledger. Never accept remaining
    // quantities from the edit form because it can be stale and restore sold stock.
    const stockSales = await Sales.find({ userId: req.user._id, stockId: stock._id }).select("quantity weight");
    const soldQuantity = stockSales.reduce((sum, sale) => sum + Number(sale.quantity || 0), 0);
    const soldWeight = stockSales.reduce((sum, sale) => sum + Number(sale.weight || 0), 0);
    if (soldQuantity > nextTotalQuantity || soldWeight > nextTotalWeight) {
      return res.status(400).json({ success: false, message: "Total stock cannot be less than the quantity already sold." });
    }

    stock.date = date;
    stock.millerId = millerId;
    stock.itemName = itemName;

    stock.totalQuantity = nextTotalQuantity;
    stock.weightPerKatta = weightPerKatta;
    stock.totalWeight = nextTotalWeight;

    stock.purchaseRate = purchaseRate;
    stock.totalAmount = totalAmount;

    stock.remainingQuantity = nextTotalQuantity - soldQuantity;
    stock.remainingWeight = nextTotalWeight - soldWeight;

    stock.bhardanaRate = bhardanaRate;
    stock.bhardana = bhardana;

    stock.paidAmount = paidAmount;
    stock.remainingAmount = Math.max(0, Number(totalAmount) - Number(paidAmount || 0));

    stock.paymentType = paymentType;
    stock.dueDays = dueDays;

    stock.status = stock.remainingAmount <= 0 ? "paid" : Number(paidAmount || 0) > 0 ? "partial" : "unpaid";

    await stock.save();

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully.",
      data: stock,
    });
  } catch (error) {
    console.error("Edit Stock Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating stock.",
      error: error.message,
    });
  }
};
export const updateStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const {
      remainingQuantity,
      remainingWeight,
    } = req.body;

    // Validation
    if (
      remainingQuantity === undefined ||
      remainingWeight === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Remaining Quantity and Remaining Weight are required",
      });
    }

    if (
      Number(remainingQuantity) < 0 ||
      Number(remainingWeight) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Remaining values cannot be negative",
      });
    }

    if (Number(remainingQuantity) > stock.totalQuantity) {
      return res.status(400).json({
        success: false,
        message: "Remaining Quantity cannot be greater than Total Quantity",
      });
    }

    if (Number(remainingWeight) > stock.totalWeight) {
      return res.status(400).json({
        success: false,
        message: "Remaining Weight cannot be greater than Total Weight",
      });
    }

    stock.remainingQuantity = Number(remainingQuantity);
    stock.remainingWeight = Number(remainingWeight);

    await stock.save();

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: stock,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    await stock.deleteOne();

    res.status(200).json({
      success: true,
      message: "Stock deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
