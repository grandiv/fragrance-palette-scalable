import express from "express";
import {
  generateFormula,
  getUserFormulas,
  getGenerationStatus,
} from "../controllers/formulaController.js";

const router = express.Router();

router.post("/generate", generateFormula);
router.get("/status/:taskId", getGenerationStatus);
router.get("/", getUserFormulas);

export default router;
