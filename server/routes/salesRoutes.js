import express from "express";
import {
  createSale,
  getBuyers,
  getSales,
  getSaleById,
  deleteSale,
  updateSaleItem,
} from "../controllers/salesController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createSale);
router.post("/createInvoice", protect, createSale);
router.get("/buyers", protect, getBuyers);
router.put("/:id", protect, updateSaleItem);
router.get("/", protect, getSales);
router.get("/:id", protect, getSaleById);
router.delete("/:id", protect, deleteSale);

export default router;
