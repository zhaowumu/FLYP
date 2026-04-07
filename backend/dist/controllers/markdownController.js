"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownController = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const uploadDir = path_1.default.join(process.cwd(), "uploads", "markdown");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.originalname.endsWith(".md") || file.mimetype === "text/markdown") {
            cb(null, true);
        }
        else {
            cb(new Error("只支持 .md 文件"));
        }
    },
});
exports.markdownController = {
    async uploadMarkdown(req, res) {
        upload.single("file")(req, res, (err) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            if (!req.file) {
                res.status(400).json({ error: "没有上传文件" });
                return;
            }
            res.json({
                message: "上传成功",
                filename: req.file.filename,
                path: req.file.path,
                originalName: req.file.originalname,
            });
        });
    },
    async readMarkdown(req, res) {
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
            if (!stat.isFile()) {
                res.status(400).json({ error: "路径不是文件" });
                return;
            }
            const content = fs_1.default.readFileSync(normalizedPath, "utf-8");
            res.json({
                content,
                filename: path_1.default.basename(normalizedPath),
                updatedAt: stat.mtime.toISOString(),
            });
        }
        catch (error) {
            console.error("Error reading markdown:", error);
            res.status(500).json({ error: error.message || "读取文件失败" });
        }
    },
    async listMarkdown(req, res) {
        try {
            const entries = fs_1.default.readdirSync(uploadDir, { withFileTypes: true });
            const files = entries
                .filter((e) => e.isFile() && e.name.endsWith(".md"))
                .map((e) => {
                const fullPath = path_1.default.join(uploadDir, e.name);
                const stat = fs_1.default.statSync(fullPath);
                return {
                    name: e.name,
                    path: fullPath,
                    size: stat.size,
                    updatedAt: stat.mtime.toISOString(),
                };
            })
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            res.json(files);
        }
        catch (error) {
            console.error("Error listing markdown files:", error);
            res.status(500).json({ error: error.message || "列出文件失败" });
        }
    },
};
//# sourceMappingURL=markdownController.js.map