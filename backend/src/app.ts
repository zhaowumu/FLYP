import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { AppDataSource } from "./config/database";
import { authMiddleware } from "./middleware/authMiddleware";
import userRoutes from "./routes/userRoutes";
import projectRoutes from "./routes/projectRoutes";
import taskRoutes from "./routes/taskRoutes";
import bugRoutes from "./routes/bugRoutes";
import excelRoutes from "./routes/excelRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import backupRoutes from "./routes/backupRoutes";
import permissionRoutes from "./routes/permissionRoutes";
import customLinkRoutes from "./routes/customLinkRoutes";
import sharedFolderRoutes from "./routes/sharedFolderRoutes";
import markdownRoutes from "./routes/markdownRoutes";
import searchRoutes from "./routes/searchRoutes";
import systemConfigRoutes from "./routes/systemConfigRoutes";

const app = express();

// 中间件
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: config.cors.origin }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供上传的图片
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 公开路由（不需要认证）
app.use("/api/users", userRoutes);

// 需要认证的路由
app.use("/api/projects", authMiddleware, projectRoutes);
app.use("/api/tasks", authMiddleware, taskRoutes);
app.use("/api/bugs", authMiddleware, bugRoutes);
app.use("/api/excel", authMiddleware, excelRoutes);
app.use("/api/upload", authMiddleware, uploadRoutes);
app.use("/api/backup", authMiddleware, backupRoutes);
app.use("/api/permissions", authMiddleware, permissionRoutes);
app.use("/api/custom-links", authMiddleware, customLinkRoutes);
app.use("/api/shared-folder", authMiddleware, sharedFolderRoutes);
app.use("/api/markdown", authMiddleware, markdownRoutes);
app.use("/api/system-config", authMiddleware, systemConfigRoutes);
app.use("/api/search", authMiddleware, searchRoutes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

export { app };