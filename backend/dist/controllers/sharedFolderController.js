"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedFolderController = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.sharedFolderController = {
    async listFolder(req, res) {
        try {
            const folderPath = req.query.path;
            if (!folderPath) {
                res.status(400).json({ error: "缺少路径参数" });
                return;
            }
            const normalizedPath = path_1.default.normalize(folderPath);
            if (!fs_1.default.existsSync(normalizedPath)) {
                res.status(404).json({ error: "文件夹不存在" });
                return;
            }
            const stat = fs_1.default.statSync(normalizedPath);
            if (!stat.isDirectory()) {
                res.status(400).json({ error: "路径不是文件夹" });
                return;
            }
            const entries = fs_1.default.readdirSync(normalizedPath, { withFileTypes: true });
            const items = entries.map((entry) => {
                const fullPath = path_1.default.join(normalizedPath, entry.name);
                let size = 0;
                let modifiedAt = "";
                try {
                    const entryStat = fs_1.default.statSync(fullPath);
                    size = entryStat.size;
                    modifiedAt = entryStat.mtime.toISOString();
                }
                catch {
                    // ignore
                }
                return {
                    name: entry.name,
                    isDirectory: entry.isDirectory(),
                    size,
                    modifiedAt,
                    path: fullPath,
                };
            });
            items.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            });
            res.json({
                path: normalizedPath,
                items,
            });
        }
        catch (error) {
            console.error("Error listing folder:", error);
            res.status(500).json({ error: error.message || "读取文件夹失败" });
        }
    },
    async downloadFile(req, res) {
        try {
            const filePath = req.query.path;
            if (!filePath) {
                res.status(400).json({ error: "缺少路径参数" });
                return;
            }
            const normalizedPath = path_1.default.normalize(filePath);
            if (!fs_1.default.existsSync(normalizedPath)) {
                res.status(404).json({ error: "文件不存在" });
                return;
            }
            const stat = fs_1.default.statSync(normalizedPath);
            if (stat.isDirectory()) {
                res.status(400).json({ error: "不能下载文件夹" });
                return;
            }
            res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(path_1.default.basename(normalizedPath))}"`);
            res.setHeader("Content-Length", stat.size.toString());
            res.sendFile(normalizedPath);
        }
        catch (error) {
            console.error("Error downloading file:", error);
            res.status(500).json({ error: error.message || "下载失败" });
        }
    },
};
//# sourceMappingURL=sharedFolderController.js.map