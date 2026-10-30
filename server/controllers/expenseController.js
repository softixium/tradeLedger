import Expense from "../models/Expense.js";

export const createExpense = async (req, res) => {
  try {
    const { title, category, amount, date, notes } = req.body;
    const numericAmount = Number(amount);
    const expenseDate = date ? new Date(date) : new Date();

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Expense description is required." });
    }
    if (typeof category !== "string" || !category.trim()) {
      return res.status(400).json({ success: false, message: "Expense category is required." });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a positive number." });
    }
    if (Number.isNaN(expenseDate.getTime())) {
      return res.status(400).json({ success: false, message: "A valid expense date is required." });
    }

    const expense = await Expense.create({
      userId: req.user._id,
      title: title.trim(),
      category: category.trim(),
      amount: numericAmount,
      date: expenseDate,
      notes: typeof notes === "string" ? notes.trim() : "",
    });

    return res.status(201).json({ success: true, data: expense });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create expense." });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        if (Number.isNaN(startDate.getTime())) return res.status(400).json({ success: false, message: "Invalid start date." });
        filter.date.$gte = startDate;
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        if (Number.isNaN(endDate.getTime())) return res.status(400).json({ success: false, message: "Invalid end date." });
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    return res.status(200).json({ success: true, count: expenses.length, total, data: expenses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load expenses." });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found." });
    return res.status(200).json({ success: true, message: "Expense deleted." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete expense." });
  }
};
