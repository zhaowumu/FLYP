"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadController = exports.uploadVideo = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// 确保上传目录存在
const imageUploadDir = path_1.default.join(process.cwd(), "uploads", "images");
const videoUploadDir = path_1.default.join(process.cwd(), "uploads", "videos");
if (!fs_1.default.existsSync(imageUploadDir)) {
    fs_1.default.mkdirSync(imageUploadDir, { recursive: true });
}
if (!fs_1.default.existsSync(videoUploadDir)) {
    fs_1.default.mkdirSync(videoUploadDir, { recursive: true });
}
// 图片存储配置
const imageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imageUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    },
});
// 视频存储配置
const videoStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, videoUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    },
});
// 图片文件过滤器
const imageFileFilter = (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("不支持的图片格式"));
    }
};
// 视频文件过滤器
const videoFileFilter = (req, file, cb) => {
    const allowedMimes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("不支持的视频格式"));
    }
};
// 创建图片上传 multer 实例
exports.upload = (0, multer_1.default)({
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});
// 创建视频上传 multer 实例
exports.uploadVideo = (0, multer_1.default)({
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
    },
});
exports.uploadController = {
    // 上传单张图片
    async uploadImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    errno: 1,
                    message: "没有上传文件",
                });
            }
            const imageUrl = `/uploads/images/${req.file.filename}`;
            // wangEditor v5 要求的返回格式 (data 必须是数组)
            res.json({
                errno: 0,
                data: [{
                        url: imageUrl,
                        alt: req.file.originalname,
                        href: imageUrl,
                    }],
            });
        }
        catch (error) {
            console.error("Upload image error:", error);
            res.status(500).json({
                errno: 1,
                message: "上传失败",
            });
        }
    },
    // 上传多张图片
    async uploadImages(req, res) {
        try {
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({
                    errno: 1,
                    message: "没有上传文件",
                });
            }
            const urls = req.files.map((file) => ({
                url: `/uploads/images/${file.filename}`,
                alt: file.originalname,
                href: `/uploads/images/${file.filename}`,
            }));
            res.json({
                errno: 0,
                data: urls,
            });
        }
        catch (error) {
            console.error("Upload images error:", error);
            res.status(500).json({
                errno: 1,
                message: "上传失败",
            });
        }
    },
    // 上传视频
    async uploadVideo(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    errno: 1,
                    message: "没有上传文件",
                });
            }
            const videoUrl = `/uploads/videos/${req.file.filename}`;
            // wangEditor v5 要求的返回格式 (data 必须是数组)
            res.json({
                errno: 0,
                data: [{
                        url: videoUrl,
                        poster: "",
                    }],
            });
        }
        catch (error) {
            console.error("Upload video error:", error);
            res.status(500).json({
                errno: 1,
                message: "上传失败",
            });
        }
    },
};
//# sourceMappingURL=uploadController.js.map