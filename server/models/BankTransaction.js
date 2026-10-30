import mongoose from "mongoose";

const BankTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "supplier_payment", "customer_receipt", "initial_balance"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    relatedType: {
      type: String,
      enum: ["Sale", "Stock", "Payment", "Direct", "Initial"],
      default: "Direct",
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    partyName: {
      type: String,
      trim: true,
      default: "",
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "cheque", "online", "other"],
      default: "bank_transfer",
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.BankTransaction ||
  mongoose.model("BankTransaction", BankTransactionSchema);
