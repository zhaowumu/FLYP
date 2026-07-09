import { app } from "./app";
import { config } from "./config";
import { AppDataSource } from "./config/database";
import { User } from "./entities/User";
import bcrypt from "bcryptjs";
import { startAutoBackup } from "./services/backupService";
import { logger } from "./services/logger";
import fs from "fs";
import path from "path";

// 全局崩溃捕获
process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION: " + error.message, { stack: error.stack });
  // 等日志写完再退出
  setTimeout(() => process.exit(1), 1000);
});

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("UNHANDLED REJECTION: " + error.message, { stack: error.stack });
});

const startServer = async () => {
  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    logger.info("Database connection established");

    // 创建默认用户（仅在数据库为空时）
    const userRepository = AppDataSource.getRepository(User);
    const userCount = await userRepository.count();

    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      const defaultUsers = userRepository.create([
        { username: "admin",  password: hashedPassword, realName: "管理员", role: "admin",           isActive: true },
        { username: "test01", password: hashedPassword, realName: "项目经理", role: "project_manager", isActive: true },
        { username: "test02", password: hashedPassword, realName: "程序",   role: "developer",       isActive: true },
        { username: "test03", password: hashedPassword, realName: "策划",   role: "designer",        isActive: true },
        { username: "test04", password: hashedPassword, realName: "美术",   role: "artist",          isActive: true },
        { username: "test05", password: hashedPassword, realName: "测试",   role: "tester",          isActive: true },
      ]);
      await userRepository.save(defaultUsers);
      console.log("Default users created:");
      console.log("  admin  / 123456 / 管理员 / admin");
      console.log("  test01 / 123456 / 项目经理 / project_manager");
      console.log("  test02 / 123456 / 程序 / developer");
      console.log("  test03 / 123456 / 策划 / designer");
      console.log("  test04 / 123456 / 美术 / artist");
      console.log("  test05 / 123456 / 测试 / tester");
    }

    // 清理数据库中的孤儿头像引用（关联文件已不存在时置空）
    try {
      const usersWithAvatar = await userRepository.createQueryBuilder("user").where("user.avatar IS NOT NULL").getMany();
      const avatarDir = path.join(__dirname, "../uploads/avatars");
      for (const user of usersWithAvatar) {
        if (user.avatar) {
          const filename = path.basename(user.avatar);
          if (!fs.existsSync(path.join(avatarDir, filename))) {
            logger.warn(`Avatar file not found for user ${user.realName} (${user.username}): ${user.avatar}, clearing`);
            user.avatar = null as any;
            await userRepository.save(user);
          }
        }
      }
    } catch (e) {
      logger.warn("Avatar cleanup check failed (non-fatal): " + e);
    }

    // 启动定时自动备份（每天凌晨 3 点），测试环境可通过 AUTO_BACKUP_ENABLED=false 关闭
    if (config.backup.autoBackup) {
      startAutoBackup("0 3 * * *");
    } else {
      logger.info("Auto backup disabled (AUTO_BACKUP_ENABLED=false)");
    }

    // 启动服务器
    app.listen(config.server.port, "0.0.0.0", () => {
      logger.info(`Server is running on port ${config.server.port}`);
    });
  } catch (error) {
    logger.error("Error starting server: " + error);
    process.exit(1);
  }
};

startServer();
