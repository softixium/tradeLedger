import express from "express";
import { getBusinessReport } from "../controllers/reportController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/business", protect, getBusinessReport);

export default router;
