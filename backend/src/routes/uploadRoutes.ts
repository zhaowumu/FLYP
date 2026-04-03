import { Router } from "express";
import { uploadController, upload, uploadVideo } from "../controllers/uploadController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// 上传单张图片
router.post("/image", authMiddleware, upload.single("file"), uploadController.uploadImage);

// 上传多张图片
router.post("/images", authMiddleware, upload.array("files", 10), uploadController.uploadImages);

// 上传视频
router.post("/video", authMiddleware, uploadVideo.single("file"), uploadController.uploadVideo);

export default router;
