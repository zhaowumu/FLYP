import { Router } from "express";
import { taskController } from "../controllers/taskController";
import { taskPermissionMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", taskPermissionMiddleware("create"), taskController.createTask);

router.get("/", taskController.getAllTasks);

router.get("/categories", taskController.getCategories);

router.get("/:id", taskController.getTaskById);

router.put("/:id", taskController.updateTask);

router.patch("/:id/status", taskController.updateTaskStatus);

router.post("/:id/comments", taskController.addComment);

router.delete("/:id", taskPermissionMiddleware("delete"), taskController.deleteTask);

router.post("/:id/subtasks", taskController.addSubtask);

router.patch("/:id/extend", taskController.extendDueDate);

export default router;
