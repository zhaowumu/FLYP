import { Router } from "express";
import { excelController } from "../controllers/excelController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/export/all", authMiddleware, excelController.exportAll);

export default router;
