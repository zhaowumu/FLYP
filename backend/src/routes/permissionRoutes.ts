import { Router } from "express";
import { permissionController } from "../controllers/permissionController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, permissionController.getPermissions);
router.put("/", authMiddleware, permissionController.updatePermissions);

export default router;
