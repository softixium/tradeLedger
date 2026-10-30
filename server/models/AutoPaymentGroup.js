import mongoose from "mongoose";

const AllocationDetailSchema = new mongoose.Schema(
  {
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedType",
      required: true,
    },
    relatedType: {
      type: String,
      enum: ["Sale", "Stock"],
      required: true,
    },
    referenceNumber: { type: String, default: "" },
    itemName: { type: String, default: "" },
    billTotal: { type: Number, default: 0 },
    amountAllocated: { type: Number, required: true },
    newPaidAmount: { type: Number, default: 0 },
    newRemainingAmount: { type: Number, default: 0 },
    statusAfter: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "partial",
    },
    isFullySettled: { type: Boolean, default: false },
  },
  { _id: false }
);

const AutoPaymentGroupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },
    partyType: {
      type: String,
      enum: ["Buyer", "Miller"],
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["inflow", "outflow"],
      required: true,
    },
    totalAmount: { type: Number, required: true },
    remainingAfter: { type: Number, default: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "cheque", "online", "other"],
      default: "cash",
    },
    notes: { type: String, default: "" },
    allocations: [AllocationDetailSchema],
    paymentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.AutoPaymentGroup ||
  mongoose.model("AutoPaymentGroup", AutoPaymentGroupSchema);
