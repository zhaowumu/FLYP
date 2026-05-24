import { Router } from "express";
import { getDashboard, getLeaderboard } from "../controllers/dashboardController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, getDashboard);
router.get("/leaderboard", authMiddleware, getLeaderboard);

export default router;
