import { Router } from "express";
import { bugController } from "../controllers/bugController";
import { roleMiddleware } from "../middleware/authMiddleware";

const ALL_ROLES = ["admin", "project_manager", "developer", "designer", "artist", "model", "vfx", "animation", "concept_art", "ui", "level_design", "sound", "tech_art", "tester", "operations"];
const router = Router();

router.post("/", roleMiddleware(ALL_ROLES), bugController.createBug);

router.get("/", bugController.getAllBugs);

router.get("/categories", bugController.getCategories);

router.get("/stats", bugController.getBugStats);

router.get("/:id", bugController.getBugById);

router.put("/:id", bugController.updateBug);

router.patch("/:id/status", bugController.updateBugStatus);

router.post("/:id/comments", bugController.addComment);

router.patch("/:id/assign", bugController.assignBug);

router.delete("/:id", roleMiddleware(["admin", "project_manager"]), bugController.deleteBug);

router.patch("/:id/extend", bugController.extendDueDate);

router.patch("/:id/reject", bugController.rejectBug);

router.patch("/:id/restart", bugController.restartBug);

export default router;
