import { Request, Response } from "express";
import fs from "fs";
import path from "path";

export const sharedFolderController = {
  async listFolder(req: Request, res: Response) {
    try {
      const folderPath = req.query.path as string;

      if (!folderPath) {
        res.status(400).json({ error: "缺少路径参数" });
        return;
      }

      const normalizedPath = path.normalize(folderPath);

      if (!fs.existsSync(normalizedPath)) {
        res.status(404).json({ error: "文件夹不存在" });
        return;
      }

      const stat = fs.statSync(normalizedPath);
      if (!stat.isDirectory()) {
        res.status(400).json({ error: "路径不是文件夹" });
        return;
      }

      const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });
      const items = entries.map((entry) => {
        const fullPath = path.join(normalizedPath, entry.name);
        let size = 0;
        let modifiedAt = "";
        try {
          const entryStat = fs.statSync(fullPath);
          size = entryStat.size;
          modifiedAt = entryStat.mtime.toISOString();
        } catch {
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
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      res.json({
        path: normalizedPath,
        items,
      });
    } catch (error: any) {
      console.error("Error listing folder:", error);
      res.status(500).json({ error: error.message || "读取文件夹失败" });
    }
  },

  async downloadFile(req: Request, res: Response) {
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
      if (stat.isDirectory()) {
        res.status(400).json({ error: "不能下载文件夹" });
        return;
      }

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(path.basename(normalizedPath))}"`);
      res.setHeader("Content-Length", stat.size.toString());
      res.sendFile(normalizedPath);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: error.message || "下载失败" });
    }
  },
};
