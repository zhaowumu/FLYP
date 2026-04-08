"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskController_1 = require("../controllers/taskController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/", (0, authMiddleware_1.taskPermissionMiddleware)("create"), taskController_1.taskController.createTask);
router.get("/", taskController_1.taskController.getAllTasks);
router.get("/:id", taskController_1.taskController.getTaskById);
router.put("/:id", taskController_1.taskController.updateTask);
router.patch("/:id/status", taskController_1.taskController.updateTaskStatus);
router.post("/:id/comments", taskController_1.taskController.addComment);
router.delete("/:id", (0, authMiddleware_1.taskPermissionMiddleware)("delete"), taskController_1.taskController.deleteTask);
router.post("/:id/subtasks", taskController_1.taskController.addSubtask);
router.patch("/:id/extend", taskController_1.taskController.extendDueDate);
exports.default = router;
//# sourceMappingURL=taskRoutes.js.map