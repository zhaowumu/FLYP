import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDir = path.join(process.cwd(), "uploads", "markdown");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith(".md") || file.mimetype === "text/markdown") {
      cb(null, true);
    } else {
      cb(new Error("只支持 .md 文件"));
    }
  },
});

export const markdownController = {
  async uploadMarkdown(req: Request, res: Response) {
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

  async readMarkdown(req: Request, res: Response) {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        res.status(400).json({ error: "缺少路径参数" });
        return;
      }

      const normalizedPath = path.normalize(filePath);

      if (!fs.existsSync(normalizedPath)) {
        res.status(404).json({ error: "文件不存在" });
        return;
      }

      const stat = fs.statSync(normalizedPath);
      if (!stat.isFile()) {
        res.status(400).json({ error: "路径不是文件" });
        return;
      }

      const content = fs.readFileSync(normalizedPath, "utf-8");
      res.json({
        content,
        filename: path.basename(normalizedPath),
        updatedAt: stat.mtime.toISOString(),
      });
    } catch (error: any) {
      console.error("Error reading markdown:", error);
      res.status(500).json({ error: error.message || "读取文件失败" });
    }
  },

  async listMarkdown(req: Request, res: Response) {
    try {
      const entries = fs.readdirSync(uploadDir, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => {
          const fullPath = path.join(uploadDir, e.name);
          const stat = fs.statSync(fullPath);
          return {
            name: e.name,
            path: fullPath,
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      res.json(files);
    } catch (error: any) {
      console.error("Error listing markdown files:", error);
      res.status(500).json({ error: error.message || "列出文件失败" });
    }
  },
};
