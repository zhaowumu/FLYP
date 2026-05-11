import { Router } from "express";
import { projectController } from "../controllers/projectController";
import { projectPermissionMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", projectPermissionMiddleware("create"), projectController.createProject);
router.get("/", projectController.getAllProjects);
router.get("/:id", projectController.getProjectById);
router.put("/:id", projectController.updateProject);
router.patch("/:id/archive", projectController.archiveProject);
router.patch("/:id/managers", projectController.updateManagers);
router.delete("/:id", projectPermissionMiddleware("delete"), projectController.deleteProject);

export default router;
