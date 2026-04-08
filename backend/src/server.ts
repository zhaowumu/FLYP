import { app } from "./app";
import { config } from "./config";
import { AppDataSource } from "./config/database";
import { User } from "./entities/User";
import bcrypt from "bcryptjs";

const startServer = async () => {
  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log("Database connection established");

    // 创建默认管理员用户
    const userRepository = AppDataSource.getRepository(User);
    const adminExists = await userRepository.findOne({ where: { username: "admin" } });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      const admin = userRepository.create({
        username: "admin",
        password: hashedPassword,
        realName: "管理员",
        phone: "13800138000",
        role: "admin",
        isActive: true,
      });
      await userRepository.save(admin);
      console.log("Default admin user created: admin / 123456");
    }

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