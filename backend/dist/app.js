"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const authMiddleware_1 = require("./middleware/authMiddleware");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const bugRoutes_1 = __importDefault(require("./routes/bugRoutes"));
const excelRoutes_1 = __importDefault(require("./routes/excelRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const backupRoutes_1 = __importDefault(require("./routes/backupRoutes"));
const permissionRoutes_1 = __importDefault(require("./routes/permissionRoutes"));
const customLinkRoutes_1 = __importDefault(require("./routes/customLinkRoutes"));
const sharedFolderRoutes_1 = __importDefault(require("./routes/sharedFolderRoutes"));
const markdownRoutes_1 = __importDefault(require("./routes/markdownRoutes"));
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
const systemConfigRoutes_1 = __importDefault(require("./routes/systemConfigRoutes"));
const app = (0, express_1.default)();
exports.app = app;
// 中间件
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
app.use((0, cors_1.default)({ origin: config_1.config.cors.origin }));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 静态文件服务 - 提供上传的图片
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
// 公开路由（不需要认证）
app.use("/api/users", userRoutes_1.default);
// 需要认证的路由
app.use("/api/projects", authMiddleware_1.authMiddleware, projectRoutes_1.default);
app.use("/api/tasks", authMiddleware_1.authMiddleware, taskRoutes_1.default);
app.use("/api/bugs", authMiddleware_1.authMiddleware, bugRoutes_1.default);
app.use("/api/excel", authMiddleware_1.authMiddleware, excelRoutes_1.default);
app.use("/api/upload", authMiddleware_1.authMiddleware, uploadRoutes_1.default);
app.use("/api/backup", authMiddleware_1.authMiddleware, backupRoutes_1.default);
app.use("/api/permissions", authMiddleware_1.authMiddleware, permissionRoutes_1.default);
app.use("/api/custom-links", authMiddleware_1.authMiddleware, customLinkRoutes_1.default);
app.use("/api/shared-folder", authMiddleware_1.authMiddleware, sharedFolderRoutes_1.default);
app.use("/api/markdown", authMiddleware_1.authMiddleware, markdownRoutes_1.default);
app.use("/api/system-config", authMiddleware_1.authMiddleware, systemConfigRoutes_1.default);
app.use("/api/search", authMiddleware_1.authMiddleware, searchRoutes_1.default);
// 健康检查
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});
//# sourceMappingURL=app.js.map