/**
 * 批量压缩已有图片 + 同步数据库引用
 * 用法: npm run compress  或  npx ts-node scripts/compress-existing.ts
 *
 * - 图片目录 (uploads/images):   短边 ≤ 1920px, quality 80
 * - 头像目录 (uploads/avatars):  短边 ≤ 400px,  quality 80
 * - GIF 跳过, BMP → JPEG (同步更新 DB 中所有引用)
 * - 视频 (uploads/videos):       仅统计，不压缩（需 ffmpeg）
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

const BASE = path.join(__dirname, "..", "uploads");

interface CompressResult {
  finalPath: string;
  originalBytes: number;
  compressedBytes: number;
  oldExt: string;
  newExt: string;
  skipped?: string;
}

let _dataSource: any = null;
async function getDataSource() {
  if (!_dataSource) {
    // 延迟加载：只有需要更新 DB 引用时才连接
    await import("reflect-metadata");
    const { AppDataSource } = await import("../src/config/database");
    await AppDataSource.initialize();
    _dataSource = AppDataSource;
  }
  return _dataSource;
}

async function destroyDataSource() {
  if (_dataSource) {
    await _dataSource.destroy();
    _dataSource = null;
  }
}

/** 与 uploadController 保持一致的压缩逻辑，返回详细结果 */
async function compressOne(filePath: string, maxSize: number): Promise<CompressResult> {
  const ext = path.extname(filePath).toLowerCase();
  const originalBytes = fs.statSync(filePath).size;

  if (ext === ".gif") {
    return { finalPath: filePath, originalBytes, compressedBytes: originalBytes, oldExt: ext, newExt: ext, skipped: "GIF" };
  }

  let pipeline = sharp(filePath, { animated: false });
  const metadata = await pipeline.metadata();
  const longerSide = Math.max(metadata.width || 0, metadata.height || 0);

  if (longerSide > maxSize) {
    pipeline = pipeline.resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true });
  }

  const outputExt = ext === ".bmp" ? ".jpg" : ext;

  switch (outputExt) {
    case ".jpg": case ".jpeg": pipeline = pipeline.jpeg({ quality: 80, progressive: true, mozjpeg: true }); break;
    case ".png":  pipeline = pipeline.png({ quality: 80, palette: true, compressionLevel: 9 }); break;
    case ".webp": pipeline = pipeline.webp({ quality: 80 }); break;
    default:      pipeline = pipeline.jpeg({ quality: 80, progressive: true }); break;
  }

  const tmpPath = filePath + ".tmp";
  await pipeline.toFile(tmpPath);

  const compressedBytes = fs.statSync(tmpPath).size;

  if (compressedBytes < originalBytes) {
    fs.unlinkSync(filePath);
    const outputPath = path.join(path.dirname(filePath), path.basename(filePath, ext) + outputExt);
    fs.renameSync(tmpPath, outputPath);
    return { finalPath: outputPath, originalBytes, compressedBytes, oldExt: ext, newExt: outputExt };
  } else {
    fs.unlinkSync(tmpPath);
    if (outputExt !== ext) {
      const outputPath = path.join(path.dirname(filePath), path.basename(filePath, ext) + outputExt);
      fs.renameSync(filePath, outputPath);
      return { finalPath: outputPath, originalBytes, compressedBytes: originalBytes, oldExt: ext, newExt: outputExt, skipped: "无法压缩（已优化）" };
    }
    return { finalPath: filePath, originalBytes, compressedBytes: originalBytes, oldExt: ext, newExt: ext, skipped: "无法压缩（已优化）" };
  }
}

/** 更新数据库中所有引用旧 URL 的记录 */
async function updateReferences(oldUrl: string, newUrl: string): Promise<number> {
  const ds = await getDataSource();
  let total = 0;

  const columns = [
    { table: "task", column: "description" },
    { table: "bug", column: "description" },
    { table: "bug", column: "reproduceSteps" },
  ];

  for (const { table, column } of columns) {
    const result = await ds.query(
      `UPDATE ${table} SET ${column} = REPLACE(${column}, ?, ?) WHERE ${column} LIKE ?`,
      [oldUrl, newUrl, `%${oldUrl}%`]
    );
    total += (result.changes || result.affectedRows || 0);
  }

  const logResult = await ds.query(
    `UPDATE operation_log SET remark = REPLACE(remark, ?, ?) WHERE remark LIKE ?`,
    [oldUrl, newUrl, `%${oldUrl}%`]
  );
  total += (logResult.changes || logResult.affectedRows || 0);

  return total;
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

function fmtPct(saved: number, total: number): string {
  if (total === 0) return "0%";
  return Math.round((saved / total) * 100) + "%";
}

async function main() {
  // 检查 sharp 是否可用
  try {
    require.resolve("sharp");
  } catch {
    console.error("错误: 未安装 sharp，请先运行 npm install");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║         NewBee 图片批量压缩工具              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");

  const imageDir = path.join(BASE, "images");
  const avatarDir = path.join(BASE, "avatars");
  const videoDir = path.join(BASE, "videos");

  const tasks: { dir: string; maxSize: number; label: string; urlPrefix: string }[] = [
    { dir: imageDir, maxSize: 1920, label: "图片 (images/)", urlPrefix: "/uploads/images/" },
    { dir: avatarDir, maxSize: 400, label: "头像 (avatars/)", urlPrefix: "/uploads/avatars/" },
  ];

  const stats = {
    totalOriginal: 0,
    totalCompressed: 0,
    countCompressed: 0,
    countSkipped: 0,
    countFailed: 0,
    refUpdates: 0,
  };

  for (const { dir, maxSize, label, urlPrefix } of tasks) {
    if (!fs.existsSync(dir)) {
      console.log(`  ${label}  目录不存在，跳过\n`);
      continue;
    }

    const files = fs.readdirSync(dir)
      .map(f => path.join(dir, f))
      .filter(f => fs.statSync(f).isFile());

    if (files.length === 0) {
      console.log(`  ${label}  无文件\n`);
      continue;
    }

    console.log(`  ${label}  (${files.length} 个文件)\n`);

    const maxNameLen = Math.min(Math.max(...files.map(f => path.basename(f).length), 30), 56);

    for (const file of files) {
      const oldName = path.basename(file);
      const oldUrl = urlPrefix + oldName;
      try {
        const r = await compressOne(file, maxSize);
        const newName = path.basename(r.finalPath);
        const newUrl = urlPrefix + newName;

        stats.totalOriginal += r.originalBytes;
        stats.totalCompressed += r.compressedBytes;

        const nameCol = oldName.padEnd(Math.min(maxNameLen + 2, 58));

        if (r.skipped === "GIF") {
          stats.countSkipped++;
          console.log(`    ${nameCol} ${fmtSize(r.originalBytes).padStart(9)} → GIF 跳过`);
        } else if (r.skipped) {
          stats.countSkipped++;
        } else {
          stats.countCompressed++;
          const saved = r.originalBytes - r.compressedBytes;
          console.log(`    ${nameCol} ${fmtSize(r.originalBytes).padStart(9)} → ${fmtSize(r.compressedBytes).padStart(9)}  (${fmtPct(saved, r.originalBytes).padStart(4)})`);
        }

        // 扩展名变更 → 同步 DB 引用（如 BMP→JPG）
        if (r.oldExt !== r.newExt && r.skipped !== "GIF") {
          try {
            const refs = await updateReferences(oldUrl, newUrl);
            stats.refUpdates += refs;
            if (refs > 0) {
              console.log(`      ↳ DB 引用已同步: ${refs} 处`);
            }
          } catch (err: any) {
            console.error(`      ↳ DB 引用同步失败: ${err.message}`);
          }
        }
      } catch (err: any) {
        stats.countFailed++;
        console.error(`    ${oldName.padEnd(Math.min(maxNameLen + 2, 58))} ERROR  ${err.message}`);
        if (fs.existsSync(file)) {
          const sz = fs.statSync(file).size;
          stats.totalOriginal += sz;
          stats.totalCompressed += sz;
        }
      }
    }
    console.log("");
  }

  // 视频
  let videoTotal = 0;
  if (fs.existsSync(videoDir)) {
    const videos = fs.readdirSync(videoDir)
      .map(f => path.join(videoDir, f))
      .filter(f => fs.statSync(f).isFile());
    if (videos.length > 0) {
      console.log(`  视频 (videos/)  ${videos.length} 个文件（不压缩，需 ffmpeg）:\n`);
      for (const v of videos) {
        const bytes = fs.statSync(v).size;
        videoTotal += bytes;
        console.log(`    ${path.basename(v)}  ${fmtSize(bytes)}`);
      }
      console.log("");
    }
  }

  const imageSaved = stats.totalOriginal - stats.totalCompressed;
  const totalNow = stats.totalCompressed + videoTotal;
  const totalBefore = stats.totalOriginal + videoTotal;

  console.log("─────────────────────────────────────────────────");
  console.log("  压 缩 汇 总");
  console.log("─────────────────────────────────────────────────");
  console.log(`  图片文件:    ${stats.countCompressed + stats.countSkipped + stats.countFailed} 个`);
  console.log(`    ├ 已压缩:  ${stats.countCompressed}`);
  console.log(`    ├ 已跳过:  ${stats.countSkipped}`);
  if (stats.countFailed > 0) console.log(`    └ 失败:    ${stats.countFailed}`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  图片原始:    ${fmtSize(stats.totalOriginal).padStart(10)}`);
  console.log(`  图片压缩后:  ${fmtSize(stats.totalCompressed).padStart(10)}`);
  if (imageSaved > 0) {
    console.log(`  图片节约:    ${fmtSize(imageSaved).padStart(10)}  (${fmtPct(imageSaved, stats.totalOriginal)})`);
  }
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  视频大小:    ${fmtSize(videoTotal).padStart(10)}  (未压缩)`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  全部当前:    ${fmtSize(totalNow).padStart(10)}`);
  if (imageSaved > 0) {
    console.log(`  整体节约:    ${fmtSize(imageSaved).padStart(10)}  (${fmtPct(imageSaved, totalBefore)})`);
  }
  if (stats.refUpdates > 0) {
    console.log(`  DB 引用同步: ${stats.refUpdates} 处`);
  }
  console.log("");

  await destroyDataSource();
}

main().catch(async (err) => {
  console.error("压缩脚本异常:", err.message || err);
  await destroyDataSource();
  process.exit(1);
});
