"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const systemConfigController_1 = require("../controllers/systemConfigController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authMiddleware, systemConfigController_1.systemConfigController.getConfig);
router.put("/", authMiddleware_1.authMiddleware, systemConfigController_1.systemConfigController.updateConfig);
router.get("/dingtalk", authMiddleware_1.authMiddleware, systemConfigController_1.systemConfigController.getDingTalkConfig);
router.put("/dingtalk", authMiddleware_1.authMiddleware, systemConfigController_1.systemConfigController.updateDingTalkConfig);
router.post("/dingtalk/test", authMiddleware_1.authMiddleware, systemConfigController_1.systemConfigController.testDingTalkNotification);
exports.default = router;
//# sourceMappingURL=systemConfigRoutes.js.map