import { app } from "./app";
import { config } from "./config";
import { AppDataSource } from "./config/database";
import { User } from "./entities/User";
import bcrypt from "bcryptjs";
import { startAutoBackup } from "./services/backupService";

const startServer = async () => {
  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log("Database connection established");

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

    // 启动定时自动备份（每天凌晨 3 点）
    startAutoBackup("0 3 * * *");

    // 启动服务器
    app.listen(config.server.port, "0.0.0.0", () => {
      console.log(`Server is running on port ${config.server.port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();
