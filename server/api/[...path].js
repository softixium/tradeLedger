import app from "../app.js";
import connectDB from "../config/db.js";

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("API request failed:", error);
    return res.status(503).json({
      message: "API is temporarily unavailable",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
}

