import { Router } from "express";
import { userController } from "../controllers/userController";
import { authMiddleware, roleMiddleware } from "../middleware/authMiddleware";

const router = Router();

// 用户注册（公开）
router.post("/register", userController.register);

// 用户登录（公开）
router.post("/login", userController.login);

// 获取当前用户信息（需认证）
router.get("/me", authMiddleware, userController.getCurrentUser);

// 更新当前用户个人资料（姓名、头像）（需认证）
router.put("/profile", authMiddleware, userController.updateProfile);

// 修改密码（需认证）
router.put("/password", authMiddleware, userController.changePassword);

// 获取所有用户（需认证）
router.get("/", authMiddleware, userController.getAllUsers);

// 获取用户详情（需认证）
router.get("/:id", authMiddleware, userController.getUserById);

// 更新用户信息（需管理员权限）
// 转移任务/缺陷负责人（仅 admin）
router.post("/transfer-tasks", authMiddleware, roleMiddleware(["admin"]), userController.transferTasks);

router.put("/:id", authMiddleware, roleMiddleware(["admin"]), userController.updateUser);

// 删除用户（需管理员权限）
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), userController.deleteUser);

export default router;
