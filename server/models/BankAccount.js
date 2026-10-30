import mongoose from "mongoose";

const BankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true, // e.g. "Meezan Bank - Main", "Cash in Hand"
    },
    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },
    bankName: {
      type: String,
      trim: true,
      default: "", // e.g. "Meezan Bank", "HBL", "Cash"
    },
    currentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.BankAccount ||
  mongoose.model("BankAccount", BankAccountSchema);
