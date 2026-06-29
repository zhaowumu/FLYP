import cron, { ScheduledTask } from "node-cron";
import fs from "fs";
import path from "path";
// @ts-expect-error better-sqlite3 类型声明缺失
import BetterSqlite3 from "better-sqlite3";
import { uploadBackupToGitee } from "./giteeBackupService";
const { ZipArchive } = require("archiver");
import { config } from "../config";

// 数据库文件路径和备份目录
const DB_PATH = path.join(__dirname, "../../data/newbee.db");
const BACKUP_DIR = path.join(__dirname, "../../data/backups");
const UPLOADS_PATH = path.join(__dirname, "../../uploads");
const MAX_DB_BACKUPS = 30; // 数据库备份保留 30 份
const MAX_UPLOADS_BACKUPS = 10; // 上传文件备份保留 10 份

let cronTask: ScheduledTask | null = null;

/**
 * 确保备份目录存在
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * 生成备份文件名
 */
/** 压缩 uploads 目录为 zip */
function zipUploads(zipPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!fs.existsSync(UPLOADS_PATH)) { resolve(null); return; }
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on("close", () => resolve(zipPath));
    archive.on("error", (err: Error) => {
      console.error("[AutoBackup] compress uploads failed:", err.message);
      resolve(null);
    });
    archive.pipe(output);
    archive.directory(UPLOADS_PATH, "uploads");
    archive.finalize();
  });
}
/** 复制文件到远程共享目录 */
function copyToRemoteFile(localPath: string, filename: string): void {
  const remoteDir = config.backup.remotePath;
  if (!remoteDir) return;
  try {
    if (!fs.existsSync(remoteDir)) {
      fs.mkdirSync(remoteDir, { recursive: true });
    }
    const destPath = path.join(remoteDir, filename);
    fs.copyFileSync(localPath, destPath);
    const stat = fs.statSync(destPath);
    console.log("[AutoBackup] remote backup ok: " + filename + " (" + (stat.size / 1024).toFixed(1) + " KB)");
  } catch (err: any) {
    console.warn("[AutoBackup] remote backup failed:", err.message);
  }
}


function getBackupFilename(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `newbee_auto_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.db`;
}

/**
 * 执行一次数据库备份
 * - 先 WAL checkpoint 确保数据完整
 * - 拷贝 db 文件到备份目录
 * - 清理超出数量限制的旧备份
 * - 如果云端备份已启用，异步上传到 Gitee
 */
function performBackup(): boolean {
  try {
    // 检查数据库文件是否存在
    if (!fs.existsSync(DB_PATH)) {
      console.warn("[AutoBackup] 数据库文件不存在，跳过备份");
      return false;
    }

    ensureBackupDir();

    // WAL checkpoint: 将 WAL 日志刷入主文件，确保备份完整
    try {
      const db = new BetterSqlite3(DB_PATH, { readonly: true });
      db.pragma("wal_checkpoint(TRUNCATE)");
      db.close();
    } catch (e) {
      console.warn("[AutoBackup] WAL checkpoint 失败（数据库可能不在 WAL 模式），继续备份:", (e as Error).message);
    }

    // 拷贝数据库文件
    const filename = getBackupFilename();
    const destPath = path.join(BACKUP_DIR, filename);
    fs.copyFileSync(DB_PATH, destPath);

    const stats = fs.statSync(destPath);
    console.log(`[AutoBackup] 备份成功: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
    copyToRemoteFile(destPath, filename);

    // 压缩 uploads 目录
    const zipFilename = filename.replace(".db", "_uploads.zip");
    const zipPath = path.join(BACKUP_DIR, zipFilename);
    zipUploads(zipPath).then((result) => {
      if (result) {
        const zStats = fs.statSync(zipPath);
        console.log(`[AutoBackup] 上传文件备份成功: ${zipFilename} (${(zStats.size / 1024).toFixed(1)} KB)`);
        copyToRemoteFile(zipPath, zipFilename);
      } else {
        console.log("[AutoBackup] 上传文件目录为空或不存在，跳过");
        try { fs.unlinkSync(zipPath); } catch {}
      }
    });

    // 清理旧备份
    cleanOldBackups();

    // 异步上传到 Gitee（不阻塞备份流程）
    uploadBackupToGitee(destPath).then(result => {
      if (result.success) {
        console.log(`[AutoBackup] 云端备份: ${result.message}`);
      } else {
        console.warn(`[AutoBackup] 云端备份跳过: ${result.message}`);
      }
    }).catch(err => {
      console.error("[AutoBackup] 云端备份异常:", err);
    });

    return true;
  } catch (error) {
    console.error("[AutoBackup] 备份失败:", error);
    return false;
  }
}

/**
 * 清理超出数量限制的旧备份文件
 */
function cleanOldBackups() {
  ensureBackupDir();
  const allFiles = fs.readdirSync(BACKUP_DIR);

  // 清理数据库备份：保留 MAX_DB_BACKUPS 份
  const dbFiles = allFiles
    .filter(f => f.startsWith("newbee_auto_") && f.endsWith(".db"))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (dbFiles.length > MAX_DB_BACKUPS) {
    for (const file of dbFiles.slice(MAX_DB_BACKUPS)) {
      try { fs.unlinkSync(file.path); } catch {}
      console.log("[AutoBackup] 已删除旧数据库备份: " + file.name);
    }
  }

  // 清理上传文件备份：保留 MAX_UPLOADS_BACKUPS 份
  const zipFiles = allFiles
    .filter(f => f.startsWith("newbee_auto_") && f.endsWith("_uploads.zip"))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (zipFiles.length > MAX_UPLOADS_BACKUPS) {
    for (const file of zipFiles.slice(MAX_UPLOADS_BACKUPS)) {
      try { fs.unlinkSync(file.path); } catch {}
      console.log("[AutoBackup] 已删除旧上传文件备份: " + file.name);
    }
  }
}

/**
 * 启动定时自动备份
 * @param schedule cron 表达式，默认每天凌晨 3 点
 */
export function startAutoBackup(schedule: string = "0 3 * * *"): boolean {
  if (cronTask) {
    console.log("[AutoBackup] 定时备份已在运行中");
    return false;
  }

  // 验证 cron 表达式
  if (!cron.validate(schedule)) {
    console.error(`[AutoBackup] 无效的 cron 表达式: ${schedule}`);
    return false;
  }

  ensureBackupDir();

  // 立即执行一次启动时备份
  performBackup();

  // 设置定时任务
  cronTask = cron.schedule(schedule, () => {
    console.log(`[AutoBackup] 定时任务触发，开始备份...`);
    performBackup();
  });

  console.log(`[AutoBackup] 定时备份已启动，cron: "${schedule}"，保留最近 ${MAX_DB_BACKUPS} 份`);
  return true;
}

/**
 * 停止定时自动备份
 */
export function stopAutoBackup(): boolean {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log("[AutoBackup] 定时备份已停止");
    return true;
  }
  return false;
}

/**
 * 获取自动备份状态
 */
export function getAutoBackupStatus(): { running: boolean; schedule: string; backupCount: number } {
  const running = cronTask !== null;
  let backupCount = 0;

  if (fs.existsSync(BACKUP_DIR)) {
    backupCount = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("newbee_auto_") && f.endsWith(".db")).length;
  }

  return {
    running,
    schedule: running ? "0 3 * * *" : "",
    backupCount,
  };
}

/**
 * 获取备份文件列表
 */
export function getBackupList(): Array<{ name: string; size: number; date: string }> {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith(".db") || f.endsWith("_uploads.zip"))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        size: stat.size,
        date: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 删除指定备份文件
 */
export function deleteBackup(filename: string): boolean {
  const filePath = path.join(BACKUP_DIR, filename);
  // 安全校验：防止路径穿越
  if (!filename.endsWith(".db") || path.basename(filename) !== filename) {
    return false;
  }
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * 下载指定备份文件，返回文件 buffer
 */
export function getBackupFile(filename: string): Buffer | null {
  const filePath = path.join(BACKUP_DIR, filename);
  // 安全校验
  if (!filename.endsWith(".db") || path.basename(filename) !== filename) {
    return null;
  }
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null;
}

export { performBackup };
