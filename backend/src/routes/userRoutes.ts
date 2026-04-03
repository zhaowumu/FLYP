import { Router } from "express";
import { userController } from "../controllers/userController";

const router = Router();

// 用户注册
router.post("/register", userController.register);

// 用户登录
router.post("/login", userController.login);

// 获取所有用户
router.get("/", userController.getAllUsers);

// 获取用户详情
router.get("/:id", userController.getUserById);

// 更新用户信息
router.put("/:id", userController.updateUser);

// 删除用户
router.delete("/:id", userController.deleteUser);

export default router;