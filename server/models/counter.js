import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  sequence: {
    type: Number,
    default: 0,
  },
});

CounterSchema.index({ name: 1, userId: 1 }, { unique: true });

export default mongoose.models.Counter ||
  mongoose.model("Counter", CounterSchema);
