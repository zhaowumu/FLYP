import { Router } from "express";
import { projectController } from "../controllers/projectController";
import { roleMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", roleMiddleware(["admin", "project_manager"]), projectController.createProject);
router.get("/", projectController.getAllProjects);
router.get("/:id", projectController.getProjectById);
router.put("/:id", projectController.updateProject);
router.patch("/:id/archive", projectController.archiveProject);
router.patch("/:id/managers", projectController.updateManagers);
router.delete("/:id", roleMiddleware(["admin"]), projectController.deleteProject);

export default router;
