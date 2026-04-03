import { Router } from "express";
import multer from "multer";
import { excelController } from "../controllers/excelController";

const router = Router();

// 配置multer
const upload = multer({ storage: multer.memoryStorage() });

// 导出任务到Excel
router.get("/export/tasks", excelController.exportTasks);

// 导出BUG到Excel
router.get("/export/bugs", excelController.exportBugs);

// 导出全部数据到Excel（多Sheet）
router.get("/export/all", excelController.exportAll);

// 从Excel导入任务
router.post("/import/tasks", upload.single("file"), excelController.importTasks);

// 从Excel导入BUG
router.post("/import/bugs", upload.single("file"), excelController.importBugs);

// 下载任务导入模板
router.get("/template/tasks", excelController.downloadTaskTemplate);

// 下载BUG导入模板
router.get("/template/bugs", excelController.downloadBugTemplate);

export default router;