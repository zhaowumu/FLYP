"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const userRepository = database_1.AppDataSource.getRepository(User_1.User);
exports.userController = {
    // 用户注册
    async register(req, res) {
        try {
            const { username, password, realName, phone, role } = req.body;
            // 检查用户名是否已存在
            const existingUser = await userRepository.findOne({ where: { username } });
            if (existingUser) {
                return res.status(400).json({ error: "Username already exists" });
            }
            // 加密密码
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            // 创建用户
            const user = userRepository.create({
                username,
                password: hashedPassword,
                realName,
                phone,
                role: role || "developer",
            });
            await userRepository.save(user);
            // 返回用户信息（不包含密码）
            const { password: _, ...userWithoutPassword } = user;
            res.status(201).json(userWithoutPassword);
        }
        catch (error) {
            console.error("Error registering user:", error);
            res.status(500).json({ error: "Failed to register user" });
        }
    },
    // 用户登录
    async login(req, res) {
        try {
            const { username, password } = req.body;
            // 查找用户
            const user = await userRepository.findOne({ where: { username } });
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            // 验证密码
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: "Invalid credentials" });
            }
            // 生成JWT token
            const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    realName: user.realName,
                    phone: user.phone,
                    role: user.role,
                },
            });
        }
        catch (error) {
            console.error("Error logging in:", error);
            res.status(500).json({ error: "Failed to login" });
        }
    },
    // 获取所有用户
    async getAllUsers(req, res) {
        try {
            const users = await userRepository.find({
                select: ["id", "username", "realName", "phone", "role", "isActive", "createdAt"],
            });
            res.json(users);
        }
        catch (error) {
            console.error("Error getting users:", error);
            res.status(500).json({ error: "Failed to get users" });
        }
    },
    // 获取用户详情
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await userRepository.findOne({
                where: { id: parseInt(id) },
            });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        }
        catch (error) {
            console.error("Error getting user:", error);
            res.status(500).json({ error: "Failed to get user" });
        }
    },
    // 更新用户信息
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            // 如果更新密码，需要加密
            if (updateData.password) {
                updateData.password = await bcryptjs_1.default.hash(updateData.password, 10);
            }
            await userRepository.update(id, updateData);
            const updatedUser = await userRepository.findOne({
                where: { id: parseInt(id) },
                select: ["id", "username", "realName", "phone", "role", "isActive", "createdAt"],
            });
            res.json(updatedUser);
        }
        catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ error: "Failed to update user" });
        }
    },
    // 删除用户
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            await userRepository.delete(id);
            res.json({ message: "User deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ error: "Failed to delete user" });
        }
    },
};
//# sourceMappingURL=userController.js.map