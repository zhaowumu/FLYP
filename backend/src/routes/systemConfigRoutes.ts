import { Router } from "express";
import { systemConfigController } from "../controllers/systemConfigController";
import { authMiddleware, roleMiddleware } from "../middleware/authMiddleware";

const router = Router();

// 通用配置（所有已登录用户可读/写）
router.get("/", authMiddleware, systemConfigController.getConfig);
router.put("/", authMiddleware, systemConfigController.updateConfig);

// 钉钉配置（所有已登录用户可配置）
router.get("/dingtalk", authMiddleware, systemConfigController.getDingTalkConfig);
router.put("/dingtalk", authMiddleware, systemConfigController.updateDingTalkConfig);
router.post("/dingtalk/test", authMiddleware, systemConfigController.testDingTalkNotification);

// Gitee 云备份（仅管理员，涉及敏感 Token）
router.get("/gitee-backup", authMiddleware, roleMiddleware(["admin"]), systemConfigController.getGiteeBackupConfig);
router.put("/gitee-backup", authMiddleware, roleMiddleware(["admin"]), systemConfigController.updateGiteeBackupConfig);
router.post("/gitee-backup/test", authMiddleware, roleMiddleware(["admin"]), systemConfigController.testGiteeBackupConnection);

export default router;
