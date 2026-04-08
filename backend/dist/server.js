"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const database_1 = require("./config/database");
const User_1 = require("./entities/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const startServer = async () => {
    try {
        // 初始化数据库连接
        await database_1.AppDataSource.initialize();
        console.log("Database connection established");
        // 创建默认管理员用户
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const adminExists = await userRepository.findOne({ where: { username: "admin" } });
        if (!adminExists) {
            const hashedPassword = await bcryptjs_1.default.hash("123456", 10);
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
        app_1.app.listen(config_1.config.server.port, "0.0.0.0", () => {
            console.log(`Server is running on port ${config_1.config.server.port}`);
        });
    }
    catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map