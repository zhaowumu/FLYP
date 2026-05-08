import { Router } from "express";
import multer from "multer";
import { backupController } from "../controllers/backupController";

const router = Router();

// 配置 multer 用于内存存储（恢复数据库文件）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 限制 100MB
});

// 自动备份状态
router.get("/status", backupController.status);

// 备份文件列表
router.get("/list", backupController.list);

// 备份数据库文件（手动下载当前 db）
router.get("/export", backupController.backup);

// 下载指定备份文件
router.get("/download/:filename", backupController.download);

// 恢复数据库文件
router.post("/import", upload.single("file"), backupController.restore);

// 立即执行一次备份
router.post("/backup-now", backupController.backupNow);

// 删除指定备份文件
router.delete("/file/:filename", backupController.deleteBackupFile);

// 清空数据库（保留用户）
router.delete("/clear", backupController.clearDatabase);

// 清空所有数据（包含用户）
router.delete("/clear-all", backupController.clearAllDatabase);

export default router;
