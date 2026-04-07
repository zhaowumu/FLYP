"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
// 用户注册
router.post("/register", userController_1.userController.register);
// 用户登录
router.post("/login", userController_1.userController.login);
// 获取所有用户
router.get("/", userController_1.userController.getAllUsers);
// 获取用户详情
router.get("/:id", userController_1.userController.getUserById);
// 更新用户信息
router.put("/:id", userController_1.userController.updateUser);
// 删除用户
router.delete("/:id", userController_1.userController.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map