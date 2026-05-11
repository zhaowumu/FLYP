import { Router } from "express";
import multer from "multer";
import { backupController } from "../controllers/backupController";
import { authMiddleware, roleMiddleware } from "../middleware/authMiddleware";

const router = Router();

// 配置 multer 用于内存存储（恢复数据库文件）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 限制 100MB
});

// 只读操作（所有已登录用户可访问）
router.get("/status", authMiddleware, backupController.status);
router.get("/list", authMiddleware, backupController.list);
router.get("/export", authMiddleware, backupController.backup);
router.get("/download/:filename", authMiddleware, backupController.download);
router.post("/backup-now", authMiddleware, backupController.backupNow);

// 写操作（仅管理员可访问）
router.post("/import", authMiddleware, roleMiddleware(["admin"]), upload.single("file"), backupController.restore);
router.delete("/file/:filename", authMiddleware, roleMiddleware(["admin"]), backupController.deleteBackupFile);
router.delete("/clear", authMiddleware, roleMiddleware(["admin"]), backupController.clearDatabase);
router.delete("/clear-all", authMiddleware, roleMiddleware(["admin"]), backupController.clearAllDatabase);

export default router;
