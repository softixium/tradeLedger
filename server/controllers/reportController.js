import BankTransaction from "../models/BankTransaction.js";
import Expense from "../models/Expense.js";
import Party from "../models/party.js";
import Payment from "../models/payment.js";
import Sales from "../models/sales.js";
import Stock from "../models/stock.js";

export const getBusinessReport = async (req, res) => {
  try {
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    if (!req.query.startDate || !req.query.endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: "Valid start and end dates are required." });
    }
    if (startDate > endDate) {
      return res.status(400).json({ success: false, message: "Start date must be on or before the end date." });
    }

    const userId = req.user._id;
    const [purchases, sales, payments, expenses, bankTransactions] = await Promise.all([
      Stock.find({ userId, date: { $gte: startDate, $lte: endDate } })
        .populate("millerId", "name type phone")
        .sort({ date: 1, createdAt: 1 }),
      Sales.find({ userId, date: { $gte: startDate, $lte: endDate } })
        .populate("buyerId", "name type phone")
        .populate("stockId", "itemName receiptNumber")
        .sort({ date: 1, createdAt: 1 }),
      Payment.find({ userId, paymentDate: { $gte: startDate, $lte: endDate } })
        .populate("partyId", "name type phone")
        .sort({ paymentDate: 1, createdAt: 1 }),
      Expense.find({ userId, date: { $gte: startDate, $lte: endDate } })
        .sort({ date: 1, createdAt: 1 }),
      BankTransaction.find({ userId, date: { $gte: startDate, $lte: endDate } })
        .populate("bankAccountId", "accountName bankName")
        .sort({ date: 1, createdAt: 1 }),
    ]);

    const partyIds = new Set();
    purchases.forEach((purchase) => purchase.millerId?._id && partyIds.add(String(purchase.millerId._id)));
    sales.forEach((sale) => sale.buyerId?._id && partyIds.add(String(sale.buyerId._id)));
    payments.forEach((payment) => payment.partyId?._id && partyIds.add(String(payment.partyId._id)));
    const parties = partyIds.size
      ? await Party.find({ userId, _id: { $in: [...partyIds] } }).select("name type phone address").sort({ name: 1 })
      : [];

    const sum = (records, field) => records.reduce((total, record) => total + Number(record[field] || 0), 0);
    const grossProfit = sum(sales, "profit");
    const totalExpenses = sum(expenses, "amount");
    const totalPaymentsIn = payments.filter((payment) => payment.type === "inflow").reduce((total, payment) => total + Number(payment.amount || 0), 0);
    const totalPaymentsOut = payments.filter((payment) => payment.type === "outflow").reduce((total, payment) => total + Number(payment.amount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          purchaseCount: purchases.length,
          totalPurchases: sum(purchases, "totalAmount"),
          totalPurchasedQuantity: sum(purchases, "totalQuantity"),
          totalPurchasedWeight: sum(purchases, "totalWeight"),
          salesCount: sales.length,
          totalSales: sum(sales, "totalAmount"),
          totalSoldQuantity: sum(sales, "quantity"),
          totalSoldWeight: sum(sales, "weight"),
          grossProfit,
          totalExpenses,
          netProfit: grossProfit - totalExpenses,
          paymentsIn: totalPaymentsIn,
          paymentsOut: totalPaymentsOut,
          paymentCount: payments.length,
          expenseCount: expenses.length,
          partyCount: parties.length,
          bankTransactionCount: bankTransactions.length,
        },
        purchases,
        sales,
        payments,
        expenses,
        bankTransactions,
        parties,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to generate business report." });
  }
};
