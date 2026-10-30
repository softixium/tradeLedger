import Party from "../models/party.js";
import Sales from "../models/sales.js";
import Stock from "../models/stock.js";
import Payment from "../models/Payment.js";

export const createParty = async (req, res) => {
  try {
    const { name, type, phone, address } = req.body;

    const party = await Party.create({
      userId: req.user._id,
      name,
      type,
      phone,
      address,
    });

    res.status(201).json({ 
      success: true,
      message: "Party created successfully",
      data: party,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getParties = async (req, res) => {
  try {
    const parties = await Party.find({
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: parties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPartyById = async (req, res) => {
  try {
    const party = await Party.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    res.status(200).json({
      success: true,
      data: party,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateParty = async (req, res) => {
  try {
    const party = await Party.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        ...(req.body.name !== undefined ? { name: String(req.body.name).trim() } : {}),
        ...(req.body.type !== undefined ? { type: req.body.type } : {}),
        ...(req.body.phone !== undefined ? { phone: req.body.phone } : {}),
        ...(req.body.address !== undefined ? { address: req.body.address } : {}),
      },
      { new: true, runValidators: true, context: "query" },
    );

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Party updated successfully",
      data: party,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteParty = async (req, res) => {
  try {
    const existing = await Party.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) return res.status(404).json({ success: false, message: "Party not found" });
    const [salesCount, stockCount, paymentCount] = await Promise.all([
      Sales.countDocuments({ userId: req.user._id, buyerId: existing._id }),
      Stock.countDocuments({ userId: req.user._id, millerId: existing._id }),
      Payment.countDocuments({ userId: req.user._id, partyId: existing._id }),
    ]);
    if (salesCount || stockCount || paymentCount) {
      return res.status(409).json({ success: false, message: "Party has linked sales, stock, or payments and cannot be deleted." });
    }
    const party = await Party.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Party deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPartyDetails = async (req, res) => {
  try {
    const party = await Party.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({ success: false, message: "Party not found" });
    }

    // Get all sales for this party (if buyer) with stock source and miller details
    const sales = await Sales.find({
      buyerId: party._id,
      userId: req.user._id,
    })
      .populate({
        path: "stockId",
        populate: { path: "millerId", select: "name phone address" },
      })
      .populate("buyerId", "name phone address")
      .sort({ date: -1, createdAt: -1 });

    // Get all stock purchases for this party (if miller/supplier)
    const stocks = await Stock.find({
      millerId: party._id,
      userId: req.user._id,
    })
      .populate("millerId", "name phone address")
      .sort({ date: -1, createdAt: -1 });

    // For miller stocks, fetch sales drawing from those stock batches (stock movement)
    const stockIds = stocks.map((s) => s._id);
    const stockSales = await Sales.find({
      stockId: { $in: stockIds },
      userId: req.user._id,
    })
      .populate("buyerId", "name phone")
      .sort({ date: -1, createdAt: -1 });

    // Get all payments involving this party
    const payments = await Payment.find({
      partyId: party._id,
      userId: req.user._id,
    })
      .populate("partyId", "name type phone")
      .sort({ paymentDate: -1, createdAt: -1 });

    // Financial aggregates
    const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const totalSalesCollected = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const totalSalesRemaining = sales.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);

    const totalPurchases = stocks.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalPurchasesPaid = stocks.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const totalPurchasesRemaining = stocks.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);

    const totalPaymentsIn = payments
      .filter((p) => p.type === "inflow")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaymentsOut = payments
      .filter((p) => p.type === "outflow")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        party,
        financials: {
          totalSales,
          totalProfit,
          totalSalesCollected,
          totalSalesRemaining,
          totalPurchases,
          totalPurchasesPaid,
          totalPurchasesRemaining,
          totalPaymentsIn,
          totalPaymentsOut,
        },
        sales,
        stocks,
        stockSales,
        payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
