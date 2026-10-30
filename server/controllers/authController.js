import bcrypt from "bcryptjs";
import User from "../models/user.js";
import generateToken from "../utils/generateToken.js";

const usernamePattern = /^[a-z0-9._-]{3,30}$/;

const authUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  firstName: user.firstName || user.name?.trim().split(/\s+/)[0] || "",
  lastName: user.lastName || user.name?.trim().split(/\s+/).slice(1).join(" ") || "",
  username: user.username,
  token: generateToken(user._id),
});

export const registerUser = async (req, res) => {
  try {
    const firstName = typeof req.body.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName = typeof req.body.lastName === "string" ? req.body.lastName.trim() : "";
    const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const { password } = req.body;

    if (!firstName || firstName.length > 60 || !lastName || lastName.length > 60) {
      return res.status(400).json({ message: "First name and last name are required (60 characters maximum each)." });
    }
    if (!usernamePattern.test(username)) {
      return res.status(400).json({ message: "Username must be 3–30 characters and use only letters, numbers, dots, underscores, or hyphens." });
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: "Password must be between 8 and 72 characters." });
    }

    if (await User.findOne({ username }).select("_id")) {
      return res.status(409).json({ message: "That username is already in use." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      username,
      password: hashedPassword,
    });

    return res.status(201).json(authUserResponse(user));
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.username) {
      return res.status(409).json({ message: "That username is already in use." });
    }
    return res.status(500).json({ message: "Account creation failed. Please try again." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const identifier = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const { password } = req.body;
    if (!identifier || typeof password !== "string" || password.length > 72) {
      return res.status(400).json({ message: "Invalid username or password." });
    }

    let user = await User.findOne({ username: identifier }).select("+password");

    // Existing accounts can use their former email as the username once; the response
    // supplies the migrated username so future sign-ins can use it instead.
    if (!user && identifier.includes("@")) {
      user = await User.findOne({ email: identifier }).select("+email +password");
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    if (!user.username) {
      const base = (identifier.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 25) || `user${String(user._id).slice(-6)}`);
      let username = base.length < 3 ? `${base}user` : base;
      let suffix = 1;
      while (await User.exists({ username, _id: { $ne: user._id } })) {
        username = `${base.slice(0, 25)}${suffix++}`;
      }
      user.username = username;
      const parts = (user.name || "Business User").trim().split(/\s+/);
      user.firstName = user.firstName || parts[0];
      user.lastName = user.lastName || parts.slice(1).join(" ");
      await user.save();
    }

    return res.status(200).json(authUserResponse(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Username update conflict. Please sign in again." });
    }
    return res.status(500).json({ message: "Sign-in failed. Please try again." });
  }
};

export const getProfile = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};
