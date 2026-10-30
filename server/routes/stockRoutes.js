import express from "express";
import {
  createStock,
  getMillers,
  getMillerDetails,
  getStocks,
  getStockById,
  updateStock,
  deleteStock,
  editStock,
} from "../controllers/stockController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createStock);

router.get("/millers", protect, getMillers);

router.get("/miller/:id", protect, getMillerDetails);

router.get("/stocks", protect, getStocks);

router.get("/stocks/:id", protect, getStockById);

router.put("/stocks/edit/:id", protect, editStock);

router.put("/stocks/update/:id", protect, updateStock);

router.delete("/stocks/:id", protect, deleteStock);

export default router;
