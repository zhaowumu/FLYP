import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";

// 数据库文件路径
const DB_PATH = path.join(__dirname, "../../data/newbee.db");

export const backupController = {
  // 备份数据库文件
  async backup(req: Request, res: Response) {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return res.status(404).json({ error: "数据库文件不存在" });
      }

      const stats = fs.statSync(DB_PATH);
      const fileBuffer = fs.readFileSync(DB_PATH);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename=newbee_backup_${timestamp}.db`);
      res.setHeader("Content-Length", stats.size);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error backing up database:", error);
      res.status(500).json({ error: "备份失败" });
    }
  },

  // 恢复数据库文件
  async restore(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "请上传备份文件" });
      }

      // 先关闭数据库连接
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }

      // 写入新数据库文件
      fs.writeFileSync(DB_PATH, req.file.buffer);
      console.log("Database restored from backup file");

      // 重新连接数据库
      await AppDataSource.initialize();
      console.log("Database reconnected");

      res.json({ success: true, message: "数据恢复成功" });
    } catch (error) {
      console.error("Error restoring database:", error);
      // 尝试重新连接数据库
      try {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }
      } catch (e) {
        console.error("Failed to reconnect database:", e);
      }
      res.status(500).json({ error: "恢复失败: " + (error as Error).message });
    }
  },

  // 清空业务数据（保留用户）
  async clearDatabase(req: Request, res: Response) {
    try {
      // 先关闭数据库连接
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }

      // 删除数据库文件
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log("Database file deleted");
      }

      // 重新连接，TypeORM 会自动创建表结构
      await AppDataSource.initialize();
      console.log("Database recreated");

      res.json({ success: true, message: "数据库已清空（用户数据保留）" });
    } catch (error) {
      console.error("Error clearing database:", error);
      // 尝试重新连接
      try {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }
      } catch (e) {
        console.error("Failed to reconnect database:", e);
      }
      res.status(500).json({ error: "清空失败: " + (error as Error).message });
    }
  },

  // 清空所有数据（包含用户）
  async clearAllDatabase(req: Request, res: Response) {
    try {
      // 先关闭数据库连接
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }

      // 删除数据库文件
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log("Database file deleted");
      }

      // 重新连接，TypeORM 会自动创建表结构
      await AppDataSource.initialize();
      console.log("Database recreated");

      res.json({ success: true, message: "所有数据已清空（包含用户），重启服务后自动创建管理员账户" });
    } catch (error) {
      console.error("Error clearing all database:", error);
      // 尝试重新连接
      try {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }
      } catch (e) {
        console.error("Failed to reconnect database:", e);
      }
      res.status(500).json({ error: "清空失败: " + (error as Error).message });
    }
  },
};
