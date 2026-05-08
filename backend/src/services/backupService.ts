import cron, { ScheduledTask } from "node-cron";
import fs from "fs";
import path from "path";
// @ts-expect-error better-sqlite3 类型声明缺失
import BetterSqlite3 from "better-sqlite3";

// 数据库文件路径和备份目录
const DB_PATH = path.join(__dirname, "../../data/newbee.db");
const BACKUP_DIR = path.join(__dirname, "../../data/backups");
const MAX_BACKUPS = 30; // 最多保留 30 份自动备份

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

    // 清理旧备份
    cleanOldBackups();

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
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith("newbee_auto_") && f.endsWith(".db"))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime); // 按时间降序

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      fs.unlinkSync(file.path);
      console.log(`[AutoBackup] 已删除旧备份: ${file.name}`);
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

  console.log(`[AutoBackup] 定时备份已启动，cron: "${schedule}"，保留最近 ${MAX_BACKUPS} 份`);
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
    .filter(f => f.endsWith(".db"))
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
