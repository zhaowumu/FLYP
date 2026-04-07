"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const backupController_1 = require("../controllers/backupController");
const router = (0, express_1.Router)();
// 备份数据
router.get("/export", backupController_1.backupController.backup);
// 恢复数据
router.post("/import", backupController_1.backupController.restore);
// 清空数据库
router.delete("/clear", backupController_1.backupController.clearDatabase);
// 清空所有数据库（包含用户）
router.delete("/clear-all", backupController_1.backupController.clearAllDatabase);
exports.default = router;
//# sourceMappingURL=backupRoutes.js.map