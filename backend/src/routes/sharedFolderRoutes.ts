import { Router } from "express";
import { sharedFolderController } from "../controllers/sharedFolderController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/list", authMiddleware, sharedFolderController.listFolder);
router.get("/download", authMiddleware, sharedFolderController.downloadFile);

export default router;
