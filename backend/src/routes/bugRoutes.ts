import { Router } from "express";
import { bugController } from "../controllers/bugController";
import { bugPermissionMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", bugPermissionMiddleware("create"), bugController.createBug);

router.get("/", bugController.getAllBugs);

router.get("/categories", bugController.getCategories);

router.get("/stats", bugController.getBugStats);

router.get("/:id", bugController.getBugById);

router.put("/:id", bugController.updateBug);

router.patch("/:id/status", bugController.updateBugStatus);

router.post("/:id/comments", bugController.addComment);

router.patch("/:id/assign", bugController.assignBug);

router.delete("/:id", bugPermissionMiddleware("delete"), bugController.deleteBug);

router.patch("/:id/extend", bugController.extendDueDate);

export default router;
