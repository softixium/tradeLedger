import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    username: { type: String, trim: true, lowercase: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      select: false,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
    },
  },
  { timestamps: true },
);

UserSchema.index({ username: 1 }, { unique: true, sparse: true, name: "username_1" });

const User =
  mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
