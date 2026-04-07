import { Router } from "express";
import { systemConfigController } from "../controllers/systemConfigController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, systemConfigController.getConfig);
router.put("/", authMiddleware, systemConfigController.updateConfig);
router.get("/dingtalk", authMiddleware, systemConfigController.getDingTalkConfig);
router.put("/dingtalk", authMiddleware, systemConfigController.updateDingTalkConfig);
router.post("/dingtalk/test", authMiddleware, systemConfigController.testDingTalkNotification);

export default router;
