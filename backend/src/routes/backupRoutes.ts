import { Router } from "express";
import multer from "multer";
import { backupController } from "../controllers/backupController";

const router = Router();

// 配置 multer 用于内存存储（恢复数据库文件）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 限制 100MB
});

// 备份数据库文件
router.get("/export", backupController.backup);

// 恢复数据库文件
router.post("/import", upload.single("file"), backupController.restore);

// 清空数据库（保留用户）
router.delete("/clear", backupController.clearDatabase);

// 清空所有数据（包含用户）
router.delete("/clear-all", backupController.clearAllDatabase);

export default router;
