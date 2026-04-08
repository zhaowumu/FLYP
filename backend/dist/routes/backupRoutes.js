"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const backupController_1 = require("../controllers/backupController");
const router = (0, express_1.Router)();
// 配置 multer 用于内存存储（恢复数据库文件）
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 限制 100MB
});
// 备份数据库文件
router.get("/export", backupController_1.backupController.backup);
// 恢复数据库文件
router.post("/import", upload.single("file"), backupController_1.backupController.restore);
// 清空数据库（保留用户）
router.delete("/clear", backupController_1.backupController.clearDatabase);
// 清空所有数据（包含用户）
router.delete("/clear-all", backupController_1.backupController.clearAllDatabase);
exports.default = router;
//# sourceMappingURL=backupRoutes.js.map