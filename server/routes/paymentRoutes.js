import express from "express";
import {
  recordPayment,
  getPayments,
  deletePayment,
  getPaymentDashboardSummary,
  autoAllocatePayment,
  getAutoAllocatePreview,
  getAutoPaymentGroups,
} from "../controllers/paymentController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, recordPayment);
router.post("/allocate", protect, autoAllocatePayment);
router.get("/allocate-preview", protect, getAutoAllocatePreview);
router.get("/auto-groups", protect, getAutoPaymentGroups);
router.get("/", protect, getPayments);
router.get("/summary", protect, getPaymentDashboardSummary);
router.delete("/:id", protect, deletePayment);

export default router;
