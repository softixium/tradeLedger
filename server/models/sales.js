import mongoose from "mongoose";

const SalesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    billNumber: {
      type: String,
      required: true,
      trim: true,
    },

    groupBillNumber: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      required: true,
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },

    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },

    itemName: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    weight: {
      type: Number,
      required: true,
    },

    rate: {
      type: Number,
      required: true,
    },

    purchaseRate: {
      type: Number,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    profit: {
      type: Number,
      required: true,
      default: 0,
    },

    bhardanaRate: {
      type: Number,
      default: 0,
    },

    bhardana: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "unpaid",
    },

    paymentType: {
      type: String,
      enum: ["cash", "udhar"],
      default: "cash",
    },

    dueDays: {
      type: Number,
      default: 0,
    },

    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One sales invoice can contain multiple items, and each user has an
// independent bill sequence.
SalesSchema.index({ userId: 1, billNumber: 1 });

export default mongoose.models.Sales ||
  mongoose.model("Sales", SalesSchema);
