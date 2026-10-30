import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true, default: "", maxlength: 1000 },
  },
  { timestamps: true }
);

ExpenseSchema.index({ userId: 1, date: -1 });

export default mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
