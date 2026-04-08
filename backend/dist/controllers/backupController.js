"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupController = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
// 数据库文件路径
const DB_PATH = path_1.default.join(__dirname, "../../data/flyp.db");
exports.backupController = {
    // 备份数据库文件
    async backup(req, res) {
        try {
            if (!fs_1.default.existsSync(DB_PATH)) {
                return res.status(404).json({ error: "数据库文件不存在" });
            }
            const stats = fs_1.default.statSync(DB_PATH);
            const fileBuffer = fs_1.default.readFileSync(DB_PATH);
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename=flyp_backup_${timestamp}.db`);
            res.setHeader("Content-Length", stats.size);
            res.send(fileBuffer);
        }
        catch (error) {
            console.error("Error backing up database:", error);
            res.status(500).json({ error: "备份失败" });
        }
    },
    // 恢复数据库文件
    async restore(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "请上传备份文件" });
            }
            // 先关闭数据库连接
            if (database_1.AppDataSource.isInitialized) {
                await database_1.AppDataSource.destroy();
            }
            // 写入新数据库文件
            fs_1.default.writeFileSync(DB_PATH, req.file.buffer);
            console.log("Database restored from backup file");
            // 重新连接数据库
            await database_1.AppDataSource.initialize();
            console.log("Database reconnected");
            res.json({ success: true, message: "数据恢复成功" });
        }
        catch (error) {
            console.error("Error restoring database:", error);
            // 尝试重新连接数据库
            try {
                if (!database_1.AppDataSource.isInitialized) {
                    await database_1.AppDataSource.initialize();
                }
            }
            catch (e) {
                console.error("Failed to reconnect database:", e);
            }
            res.status(500).json({ error: "恢复失败: " + error.message });
        }
    },
    // 清空业务数据（保留用户）
    async clearDatabase(req, res) {
        try {
            // 先关闭数据库连接
            if (database_1.AppDataSource.isInitialized) {
                await database_1.AppDataSource.destroy();
            }
            // 删除数据库文件
            if (fs_1.default.existsSync(DB_PATH)) {
                fs_1.default.unlinkSync(DB_PATH);
                console.log("Database file deleted");
            }
            // 重新连接，TypeORM 会自动创建表结构
            await database_1.AppDataSource.initialize();
            console.log("Database recreated");
            res.json({ success: true, message: "数据库已清空（用户数据保留）" });
        }
        catch (error) {
            console.error("Error clearing database:", error);
            // 尝试重新连接
            try {
                if (!database_1.AppDataSource.isInitialized) {
                    await database_1.AppDataSource.initialize();
                }
            }
            catch (e) {
                console.error("Failed to reconnect database:", e);
            }
            res.status(500).json({ error: "清空失败: " + error.message });
        }
    },
    // 清空所有数据（包含用户）
    async clearAllDatabase(req, res) {
        try {
            // 先关闭数据库连接
            if (database_1.AppDataSource.isInitialized) {
                await database_1.AppDataSource.destroy();
            }
            // 删除数据库文件
            if (fs_1.default.existsSync(DB_PATH)) {
                fs_1.default.unlinkSync(DB_PATH);
                console.log("Database file deleted");
            }
            // 重新连接，TypeORM 会自动创建表结构
            await database_1.AppDataSource.initialize();
            console.log("Database recreated");
            res.json({ success: true, message: "所有数据已清空（包含用户），重启服务后自动创建管理员账户" });
        }
        catch (error) {
            console.error("Error clearing all database:", error);
            // 尝试重新连接
            try {
                if (!database_1.AppDataSource.isInitialized) {
                    await database_1.AppDataSource.initialize();
                }
            }
            catch (e) {
                console.error("Failed to reconnect database:", e);
            }
            res.status(500).json({ error: "清空失败: " + error.message });
        }
    },
};
//# sourceMappingURL=backupController.js.map