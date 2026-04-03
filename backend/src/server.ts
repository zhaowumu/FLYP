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

    // 创建测试用户（每个角色一个）
    const testUsers = [
      { username: "test1", realName: "测试管理员", phone: "13800138001", role: "admin" },
      { username: "test2", realName: "测试项目经理", phone: "13800138002", role: "project_manager" },
      { username: "test3", realName: "测试开发", phone: "13800138003", role: "developer" },
      { username: "test4", realName: "测试测试员", phone: "13800138004", role: "tester" },
    ];

    for (const tu of testUsers) {
      const exists = await userRepository.findOne({ where: { username: tu.username } });
      if (!exists) {
        const hashedPassword = await bcrypt.hash("123456", 10);
        const user = userRepository.create({
          username: tu.username,
          password: hashedPassword,
          realName: tu.realName,
          phone: tu.phone,
          role: tu.role,
          isActive: true,
        });
        await userRepository.save(user);
        console.log(`Test user created: ${tu.username} / 123456 (${tu.role})`);
      }
    }

    // 启动服务器
    app.listen(config.server.port, () => {
      console.log(`Server is running on port ${config.server.port}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();