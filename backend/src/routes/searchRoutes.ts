import { Router } from "express";
import { searchController } from "../controllers/searchController";

const router = Router();

router.get("/", searchController.globalSearch);

export default router;
