import { Router } from "express";
import { customLinkController } from "../controllers/customLinkController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, customLinkController.getCustomLinks);
router.put("/", authMiddleware, customLinkController.updateCustomLinks);

export default router;
