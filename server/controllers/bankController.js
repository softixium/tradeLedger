import BankAccount from "../models/BankAccount.js";
import BankTransaction from "../models/BankTransaction.js";

// 1. Create a Bank Account or Cash Account
export const createAccount = async (req, res) => {
  try {
    const { accountName, accountNumber, bankName, initialBalance, notes, isDefault } =
      req.body;

    if (!accountName || !accountName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Account name is required.",
      });
    }

    const initBal = Number(initialBalance || 0);
    if (!Number.isFinite(initBal) || initBal < 0) {
      return res.status(400).json({ success: false, message: "Initial balance must be a non-negative number." });
    }

    const existingAccountsCount = await BankAccount.countDocuments({
      userId: req.user._id,
    });

    const account = await BankAccount.create({
      userId: req.user._id,
      accountName: accountName.trim(),
      accountNumber: accountNumber ? accountNumber.trim() : "",
      bankName: bankName ? bankName.trim() : "",
      initialBalance: initBal,
      currentBalance: initBal,
      isDefault: existingAccountsCount === 0 ? true : !!isDefault,
      notes: notes || "",
    });

    // If initial balance > 0, log initial transaction
    if (initBal > 0) {
      await BankTransaction.create({
        userId: req.user._id,
        bankAccountId: account._id,
        type: "initial_balance",
        amount: initBal,
        balanceAfter: initBal,
        relatedType: "Initial",
        referenceNumber: "INIT-BAL",
        paymentMethod: "other",
        date: new Date(),
        notes: "Initial opening balance",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Bank account created successfully.",
      data: account,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create bank account.",
    });
  }
};

// 2. Get All Bank Accounts & Balances
export const getAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    const totalBalance = accounts.reduce(
      (sum, acc) => sum + Number(acc.currentBalance || 0),
      0
    );

    return res.status(200).json({
      success: true,
      count: accounts.length,
      totalBalance,
      data: accounts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bank accounts.",
    });
  }
};

// 3. Add Manual Transaction (Deposit or Withdrawal)
export const addTransaction = async (req, res) => {
  try {
    const {
      bankAccountId,
      type, // "deposit" or "withdrawal"
      amount,
      paymentMethod,
      referenceNumber,
      date,
      notes,
    } = req.body;

    const numAmount = Number(amount);
    if (!bankAccountId || !type || !Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Bank Account, transaction type, and a valid amount are required.",
      });
    }

    const account = await BankAccount.findOne({
      _id: bankAccountId,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found.",
      });
    }

    let newBalance = Number(account.currentBalance || 0);

    if (type === "deposit") {
      newBalance += numAmount;
    } else if (type === "withdrawal") {
      if (numAmount > newBalance) {
        return res.status(400).json({
          success: false,
          message: `Withdrawal amount (Rs. ${numAmount}) exceeds current bank balance (Rs. ${newBalance}).`,
        });
      }
      newBalance -= numAmount;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Must be deposit or withdrawal.",
      });
    }

    const updated = await BankAccount.findOneAndUpdate(
      { _id: account._id, userId: req.user._id, currentBalance: account.currentBalance },
      { $set: { currentBalance: newBalance } },
      { new: true }
    );
    if (!updated) return res.status(409).json({ success: false, message: "Account balance changed concurrently. Refresh and retry." });

    let transaction;
    try {
      transaction = await BankTransaction.create({
      userId: req.user._id,
      bankAccountId: account._id,
      type,
      amount: numAmount,
      balanceAfter: newBalance,
      relatedType: "Direct",
      referenceNumber: referenceNumber || (type === "deposit" ? "DEP" : "WTH"),
      paymentMethod: paymentMethod || "bank_transfer",
      date: date ? new Date(date) : new Date(),
      notes: notes || "",
      });
    } catch (error) {
      await BankAccount.updateOne({ _id: account._id, userId: req.user._id, currentBalance: newBalance }, { $set: { currentBalance: account.currentBalance } });
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} recorded successfully.`,
      data: transaction,
      accountBalance: newBalance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record transaction.",
    });
  }
};

// 4. Get Bank Transaction Ledger
export const getTransactions = async (req, res) => {
  try {
    const { bankAccountId, type, startDate, endDate } = req.query;

    const filter = { userId: req.user._id };

    if (bankAccountId) filter.bankAccountId = bankAccountId;
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const transactions = await BankTransaction.find(filter)
      .populate("bankAccountId", "accountName bankName accountNumber")
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bank transactions.",
    });
  }
};

// 5. Delete / Revert Bank Transaction
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await BankTransaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    if (transaction.type === "initial_balance") {
      return res.status(409).json({ success: false, message: "Opening balance entries cannot be deleted. Create a correcting transaction instead." });
    }

    const account = await BankAccount.findOne({
      _id: transaction.bankAccountId,
      userId: req.user._id,
    });

    if (account) {
      if (
        transaction.type === "deposit" ||
        transaction.type === "customer_receipt" ||
        transaction.type === "initial_balance"
      ) {
        account.currentBalance = Math.max(
          0,
          Number(account.currentBalance || 0) - Number(transaction.amount)
        );
      } else if (
        transaction.type === "withdrawal" ||
        transaction.type === "supplier_payment"
      ) {
        account.currentBalance =
          Number(account.currentBalance || 0) + Number(transaction.amount);
      }
      await account.save();
    }

    await transaction.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Transaction deleted and bank balance restored successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete transaction.",
    });
  }
};
