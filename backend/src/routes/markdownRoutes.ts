import { Router } from "express";
import { markdownController } from "../controllers/markdownController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/read", authMiddleware, markdownController.readMarkdown);
router.get("/list", authMiddleware, markdownController.listMarkdown);
router.post("/upload", authMiddleware, markdownController.uploadMarkdown);

export default router;
