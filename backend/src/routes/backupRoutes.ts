import { Router } from "express";
import { backupController } from "../controllers/backupController";

const router = Router();

// 备份数据
router.get("/export", backupController.backup);

// 恢复数据
router.post("/import", backupController.restore);

// 清空数据库
router.delete("/clear", backupController.clearDatabase);

export default router;
