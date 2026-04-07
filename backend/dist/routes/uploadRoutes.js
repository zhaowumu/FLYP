"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uploadController_1 = require("../controllers/uploadController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// 上传单张图片
router.post("/image", authMiddleware_1.authMiddleware, uploadController_1.upload.single("file"), uploadController_1.uploadController.uploadImage);
// 上传多张图片
router.post("/images", authMiddleware_1.authMiddleware, uploadController_1.upload.array("files", 10), uploadController_1.uploadController.uploadImages);
// 上传视频
router.post("/video", authMiddleware_1.authMiddleware, uploadController_1.uploadVideo.single("file"), uploadController_1.uploadController.uploadVideo);
exports.default = router;
//# sourceMappingURL=uploadRoutes.js.map