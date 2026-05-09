import { Router } from "express";
import { getOperationLogs } from "../controllers/operationLogController";

const router = Router();

router.get("/", getOperationLogs);

export default router;
