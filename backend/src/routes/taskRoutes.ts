import { Router } from "express";
import { taskController } from "../controllers/taskController";
import { roleMiddleware } from "../middleware/authMiddleware";

const ALL_ROLES = ["admin", "project_manager", "developer", "designer", "artist", "model", "vfx", "animation", "concept_art", "ui", "level_design", "sound", "tech_art", "tester", "operations"];
const router = Router();

router.post("/", roleMiddleware(ALL_ROLES), taskController.createTask);

router.get("/", taskController.getAllTasks);

router.get("/categories", taskController.getCategories);

router.get("/:id", taskController.getTaskById);

router.put("/:id", taskController.updateTask);

router.patch("/:id/status", taskController.updateTaskStatus);

router.post("/:id/comments", taskController.addComment);

router.delete("/:id", roleMiddleware(["admin", "project_manager"]), taskController.deleteTask);

router.post("/:id/subtasks", taskController.addSubtask);

router.patch("/:id/extend", taskController.extendDueDate);

router.patch("/:id/reject", taskController.rejectTask);

router.patch("/:id/restart", taskController.restartTask);

router.patch("/:id/pass-test", taskController.passTestTask);

router.patch("/:id/reject-test", taskController.rejectTestTask);

export default router;
