import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// 确保上传目录存在
const imageUploadDir = path.join(process.cwd(), "uploads", "images");
const videoUploadDir = path.join(process.cwd(), "uploads", "videos");

if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}
if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

// 头像上传目录
const avatarUploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

// 图片存储配置
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// 视频存储配置
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// 图片文件过滤器
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("不支持的图片格式"));
  }
};

// 视频文件过滤器
const videoFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("不支持的视频格式"));
  }
};

// 创建图片上传 multer 实例
export const upload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// 创建视频上传 multer 实例
export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// 头像存储配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = "avatar_" + Date.now() + "_" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// 头像上传 multer 实例（仅允许图片）
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const uploadController = {
  // 上传单张图片
  async uploadImage(req: Request, res: Response) {
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
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({
        errno: 1,
        message: "上传失败",
      });
    }
  },

  // 上传多张图片
  async uploadImages(req: Request, res: Response) {
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
    } catch (error) {
      console.error("Upload images error:", error);
      res.status(500).json({
        errno: 1,
        message: "上传失败",
      });
    }
  },

  // 上传视频
  async uploadVideo(req: Request, res: Response) {
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
    } catch (error) {
      console.error("Upload video error:", error);
      res.status(500).json({
        errno: 1,
        message: "上传失败",
      });
    }
  },

  // 上传头像
  async uploadAvatar(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "没有上传文件" });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      res.json({ url: avatarUrl });
    } catch (error) {
      console.error("Upload avatar error:", error);
      res.status(500).json({ error: "头像上传失败" });
    }
  },
};
