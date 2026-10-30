import express from "express";
import {
  createAccount,
  getAccounts,
  addTransaction,
  getTransactions,
  deleteTransaction,
} from "../controllers/bankController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/accounts", protect, createAccount);
router.get("/accounts", protect, getAccounts);

router.post("/transactions", protect, addTransaction);
router.get("/transactions", protect, getTransactions);
router.delete("/transactions/:id", protect, deleteTransaction);

export default router;
