import { Router } from "express";
import { logger } from "../services/logger";
import { uploadController, upload, uploadVideo, uploadAvatar } from "../controllers/uploadController";
import { authMiddleware, roleMiddleware } from "../middleware/authMiddleware";
import { cleanAllOrphanedFiles } from "../utils/orphanCleaner";

const router = Router();

// 上传单张图片
router.post("/image", authMiddleware, upload.single("file"), uploadController.uploadImage);

// 上传多张图片
router.post("/images", authMiddleware, upload.array("files", 10), uploadController.uploadImages);

// 上传视频
router.post("/video", authMiddleware, uploadVideo.single("file"), uploadController.uploadVideo);

// 上传头像
router.post("/avatar", authMiddleware, uploadAvatar.single("file"), uploadController.uploadAvatar);

// 清理孤儿文件（仅管理员）
router.post("/cleanup-orphaned", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  try {
    const result = await cleanAllOrphanedFiles();
    res.json({
      message: `清理完成：共 ${result.total} 个文件，${result.orphaned} 个孤儿文件，已删除 ${result.deleted.length} 个`,
      ...result
    });
  } catch (error) {
    logger.error("清理孤儿文件失败:", error);
    res.status(500).json({ error: "清理孤儿文件失败" });
  }
});

export default router;
