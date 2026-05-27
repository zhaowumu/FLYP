import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

// 确保上传目录存在
const imageUploadDir = path.join(process.cwd(), "uploads", "images");
const videoUploadDir = path.join(process.cwd(), "uploads", "videos");
const avatarUploadDir = path.join(process.cwd(), "uploads", "avatars");

[imageUploadDir, videoUploadDir, avatarUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 图片存储配置（先存临时文件，压缩后移动到目标目录）
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  },
});

// 视频存储配置（不压缩，直接存）
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  },
});

// 头像存储配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = "avatar_" + Date.now() + "_" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
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

export const upload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // raw file max 20MB, compressed result will be much smaller
});

export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 视频上限 50MB
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * 压缩图片文件（原地替换）
 * - 内容图片：短边 ≤ 1920px，质量 80
 * - 头像：短边 ≤ 400px，质量 80
 * - GIF 跳过压缩
 * - BMP 转为 JPEG
 */
async function compressImage(filePath: string, isAvatar: boolean): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();

  // GIF 动图不压缩
  if (ext === ".gif") return;

  const maxSize = isAvatar ? 400 : 1920;

  let pipeline = sharp(filePath, { animated: false });

  // 获取元数据判断是否需要 resize
  const metadata = await pipeline.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const longerSide = Math.max(width, height);

  if (longerSide > maxSize) {
    pipeline = pipeline.resize(maxSize, maxSize, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // 根据原始格式选择输出编码
  const outputExt = ext === ".bmp" ? ".jpg" : ext;
  const outputPath = filePath.replace(ext, outputExt);

  switch (outputExt) {
    case ".jpg":
    case ".jpeg":
      pipeline = pipeline.jpeg({ quality: 80, progressive: true, mozjpeg: true });
      break;
    case ".png":
      pipeline = pipeline.png({ quality: 80, palette: true, compressionLevel: 9 });
      break;
    case ".webp":
      pipeline = pipeline.webp({ quality: 80 });
      break;
    default:
      pipeline = pipeline.jpeg({ quality: 80, progressive: true });
  }

  const tmpPath = filePath + ".tmp";
  await pipeline.toFile(tmpPath);

  // 用压缩后的文件替换原文件
  const originalSize = fs.statSync(filePath).size;
  const compressedSize = fs.statSync(tmpPath).size;

  if (compressedSize < originalSize) {
    fs.unlinkSync(filePath);
    fs.renameSync(tmpPath, outputPath);
    console.log(
      `[compress] ${path.basename(filePath)}: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${Math.round((1 - compressedSize / originalSize) * 100)}% saved)`
    );
  } else {
    // 压缩后反而更大，保留原始文件
    fs.unlinkSync(tmpPath);
    if (outputPath !== filePath && fs.existsSync(filePath)) {
      fs.renameSync(filePath, outputPath);
    }
  }
}

/**
 * 获取文件相对 URL 路径
 */
function getUrlPath(dirName: string, filePath: string): string {
  return `/uploads/${dirName}/${path.basename(filePath)}`;
}

export const uploadController = {
  // 上传单张图片
  async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ errno: 1, message: "没有上传文件" });
      }

      const filePath = req.file.path;
      await compressImage(filePath, false);
      const imageUrl = getUrlPath("images", req.file.path);

      res.json({
        errno: 0,
        data: [{ url: imageUrl, alt: req.file.originalname, href: imageUrl }],
      });
    } catch (error) {
      console.error("Upload image error:", error);
      res.status(500).json({ errno: 1, message: "上传失败" });
    }
  },

  // 上传多张图片
  async uploadImages(req: Request, res: Response) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ errno: 1, message: "没有上传文件" });
      }

      // 并行压缩所有图片
      await Promise.all(
        req.files.map(async (file) => {
          await compressImage(file.path, false);
        })
      );

      const urls = req.files.map((file) => ({
        url: getUrlPath("images", file.path),
        alt: file.originalname,
        href: getUrlPath("images", file.path),
      }));

      res.json({ errno: 0, data: urls });
    } catch (error) {
      console.error("Upload images error:", error);
      res.status(500).json({ errno: 1, message: "上传失败" });
    }
  },

  // 上传视频（不压缩，仅限制大小）
  async uploadVideo(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ errno: 1, message: "没有上传文件" });
      }

      const videoUrl = getUrlPath("videos", req.file.path);

      res.json({
        errno: 0,
        data: [{ url: videoUrl, poster: "" }],
      });
    } catch (error) {
      console.error("Upload video error:", error);
      res.status(500).json({ errno: 1, message: "上传失败" });
    }
  },

  // 上传头像
  async uploadAvatar(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "没有上传文件" });
      }

      await compressImage(req.file.path, true);
      const avatarUrl = getUrlPath("avatars", req.file.path);

      res.json({ url: avatarUrl });
    } catch (error) {
      console.error("Upload avatar error:", error);
      res.status(500).json({ error: "头像上传失败" });
    }
  },
};
