import { Router } from "express";
import { userController } from "../controllers/userController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// 用户注册
router.post("/register", userController.register);

// 用户登录
router.post("/login", userController.login);

// 获取当前用户信息（需认证）
router.get("/me", authMiddleware, userController.getCurrentUser);

// 更新当前用户个人资料（姓名、头像）（需认证）
router.put("/profile", authMiddleware, userController.updateProfile);

// 修改密码（需认证）
router.put("/password", authMiddleware, userController.changePassword);

// 获取所有用户
router.get("/", userController.getAllUsers);

// 获取用户详情
router.get("/:id", userController.getUserById);

// 更新用户信息
router.put("/:id", userController.updateUser);

// 删除用户
router.delete("/:id", userController.deleteUser);

export default router;