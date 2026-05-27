import { Request, Response } from "express";
import fs from "fs";
import path from "path";

// 共享文件夹根目录，默认指向项目下的 uploads 目录
const sharedRoot = path.resolve(
  process.env.SHARED_FOLDER_ROOT || path.join(process.cwd(), "uploads")
);

function resolveSafe(subPath: string): string {
  if (!subPath) return sharedRoot;
  const resolved = path.resolve(sharedRoot, subPath);
  if (!resolved.startsWith(sharedRoot)) {
    throw new Error("禁止访问目录外的路径");
  }
  return resolved;
}

export const sharedFolderController = {
  async listFolder(req: Request, res: Response) {
    try {
      const folderPath = (req.query.path as string) || "";
      const safePath = resolveSafe(folderPath);

      if (!fs.existsSync(safePath)) {
        res.status(404).json({ error: "文件夹不存在" });
        return;
      }

      const stat = fs.statSync(safePath);
      if (!stat.isDirectory()) {
        res.status(400).json({ error: "路径不是文件夹" });
        return;
      }

      const entries = fs.readdirSync(safePath, { withFileTypes: true });
      const items = entries.map((entry) => {
        const fullPath = path.join(safePath, entry.name);
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
          // 返回相对于 sharedRoot 的路径，而非服务器绝对路径
          path: path.relative(sharedRoot, fullPath),
        };
      });

      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      res.json({
        path: path.relative(sharedRoot, safePath),
        items,
      });
    } catch (error: any) {
      console.error("Error listing folder:", error);
      res.status(403).json({ error: error.message || "读取文件夹失败" });
    }
  },

  async downloadFile(req: Request, res: Response) {
    try {
      const filePath = (req.query.path as string) || "";
      const safePath = resolveSafe(filePath);

      if (!fs.existsSync(safePath)) {
        res.status(404).json({ error: "文件不存在" });
        return;
      }

      const stat = fs.statSync(safePath);
      if (stat.isDirectory()) {
        res.status(400).json({ error: "不能下载文件夹" });
        return;
      }

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(path.basename(safePath))}"`);
      res.setHeader("Content-Length", stat.size.toString());
      res.sendFile(safePath);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      res.status(403).json({ error: error.message || "下载失败" });
    }
  },
};
