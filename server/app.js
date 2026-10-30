import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import partyRoutes from "./routes/partyRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import bankRoutes from "./routes/bankRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://tradeledger-ten-sigma.vercel.app",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim()),
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "trade-ledger-server" });
});

app.use("/api", async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("API database connection failed:", error);
    res.status(503).json({ message: "API is temporarily unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/party", partyRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reports", reportRoutes);


export default app;
