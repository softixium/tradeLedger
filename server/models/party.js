import mongoose from "mongoose";

const PartySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["Buyer", "Miller"],
      required: true,
    },

    phone: {
      type: String,
      default: null,
    },

    address: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Party =
  mongoose.models.Party || mongoose.model("Party", PartySchema);

export default Party;