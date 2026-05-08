import axios from "axios";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";

const GITEE_API_BASE = "https://gitee.com/api/v5";

interface GiteeBackupConfig {
  enabled: boolean;
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

/**
 * 从 SystemConfig 读取 Gitee 备份配置
 */
async function getGiteeConfig(): Promise<GiteeBackupConfig> {
  const configRepo = AppDataSource.getRepository(SystemConfig);

  const enabledCfg = await configRepo.findOne({ where: { key: "gitee_backup_enabled" } });
  const tokenCfg = await configRepo.findOne({ where: { key: "gitee_backup_token" } });
  const ownerCfg = await configRepo.findOne({ where: { key: "gitee_backup_owner" } });
  const repoCfg = await configRepo.findOne({ where: { key: "gitee_backup_repo" } });
  const branchCfg = await configRepo.findOne({ where: { key: "gitee_backup_branch" } });

  return {
    enabled: enabledCfg?.value === "true",
    token: tokenCfg?.value || "",
    owner: ownerCfg?.value || "",
    repo: repoCfg?.value || "",
    branch: branchCfg?.value || "main",
  };
}

/**
 * 测试 Gitee 连接和仓库访问权限
 */
export async function testGiteeConnection(config: GiteeBackupConfig): Promise<{ success: boolean; message: string; username?: string }> {
  if (!config.token) {
    return { success: false, message: "请填写 Access Token" };
  }
  if (!config.owner || !config.repo) {
    return { success: false, message: "请填写仓库路径（如 username/repo）" };
  }

  try {
    // 1. 验证 token 并获取用户信息
    const userRes = await axios.get(`${GITEE_API_BASE}/user`, {
      params: { access_token: config.token },
      timeout: 10000,
    });

    if (!userRes.data.id) {
      return { success: false, message: "Token 无效，无法获取用户信息" };
    }

    // 2. 验证仓库是否存在且有权限
    const repoRes = await axios.get(`${GITEE_API_BASE}/repos/${config.owner}/${config.repo}`, {
      params: { access_token: config.token },
      timeout: 10000,
    });

    if (!repoRes.data.id) {
      return { success: false, message: `仓库 ${config.owner}/${config.repo} 不存在或无访问权限` };
    }

    // 3. 验证分支是否存在
    const branchRes = await axios.get(
      `${GITEE_API_BASE}/repos/${config.owner}/${config.repo}/branches/${config.branch}`,
      { params: { access_token: config.token }, timeout: 10000 }
    );

    if (!branchRes.data.name) {
      return { success: false, message: `分支 "${config.branch}" 不存在` };
    }

    return {
      success: true,
      message: `连接成功！仓库: ${config.owner}/${config.repo}，分支: ${config.branch}`,
      username: userRes.data.login,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;
    if (status === 401) {
      return { success: false, message: "Token 无效或已过期" };
    }
    if (status === 404) {
      if (msg.includes?.("Branch")) {
        return { success: false, message: `分支 "${config.branch}" 不存在` };
      }
      return { success: false, message: `仓库 ${config.owner}/${config.repo} 不存在或无访问权限` };
    }
    return { success: false, message: `连接失败: ${msg}` };
  }
}

/**
 * 上传备份文件到 Gitee
 * 使用 Gitee API v5 创建/更新文件接口
 * 文件存储路径: backups/YYYY-MM/YYYY-MM-DD_HH-mm-ss.db
 */
export async function uploadBackupToGitee(backupFilePath: string): Promise<{ success: boolean; message: string }> {
  const config = await getGiteeConfig();

  if (!config.enabled) {
    return { success: false, message: "云端备份未启用" };
  }

  if (!config.token || !config.owner || !config.repo) {
    console.warn("[GiteeBackup] 配置不完整，跳过云端备份");
    return { success: false, message: "Gitee 备份配置不完整" };
  }

  try {
    // 读取备份文件并转为 base64
    if (!fs.existsSync(backupFilePath)) {
      return { success: false, message: `备份文件不存在: ${backupFilePath}` };
    }

    const fileBuffer = fs.readFileSync(backupFilePath);
    const fileSizeKB = (fileBuffer.length / 1024).toFixed(1);
    const base64Content = fileBuffer.toString("base64");

    // 生成远程路径
    const filename = path.basename(backupFilePath);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const remotePath = `backups/${y}-${m}/${filename}`;

    // 先检查文件是否已存在（需要 SHA 来更新）
    let sha = "";
    try {
      const existingRes = await axios.get(
        `${GITEE_API_BASE}/repos/${config.owner}/${config.repo}/contents/${remotePath}`,
        { params: { access_token: config.token, ref: config.branch }, timeout: 15000 }
      );
      sha = existingRes.data.sha;
    } catch {
      // 文件不存在，正常创建
    }

    // 创建或更新文件
    const body: any = {
      access_token: config.token,
      message: `数据库备份: ${filename}`,
      content: base64Content,
      branch: config.branch,
    };
    if (sha) {
      body.sha = sha;
    }

    await axios.post(
      `${GITEE_API_BASE}/repos/${config.owner}/${config.repo}/contents/${remotePath}`,
      body,
      { timeout: 30000, maxContentLength: 50 * 1024 * 1024 }
    );

    console.log(`[GiteeBackup] 上传成功: ${remotePath} (${fileSizeKB} KB)`);
    return { success: true, message: `已上传到 Gitee: ${remotePath} (${fileSizeKB} KB)` };
  } catch (error: any) {
    const msg = error.response?.data?.message || error.message;
    console.error(`[GiteeBackup] 上传失败:`, msg);
    return { success: false, message: `上传到 Gitee 失败: ${msg}` };
  }
}

/**
 * 获取 Gitee 备份配置（供 controller 调用）
 */
export async function getGiteeBackupConfig(): Promise<GiteeBackupConfig> {
  return getGiteeConfig();
}

/**
 * 保存 Gitee 备份配置
 */
export async function saveGiteeBackupConfig(config: GiteeBackupConfig): Promise<void> {
  const configRepo = AppDataSource.getRepository(SystemConfig);

  const entries: Array<{ key: string; value: string; description: string }> = [
    { key: "gitee_backup_enabled", value: String(config.enabled), description: "Gitee 云备份开关" },
    { key: "gitee_backup_token", value: config.token, description: "Gitee Access Token" },
    { key: "gitee_backup_owner", value: config.owner, description: "Gitee 仓库用户名" },
    { key: "gitee_backup_repo", value: config.repo, description: "Gitee 仓库名" },
    { key: "gitee_backup_branch", value: config.branch, description: "Gitee 仓库分支" },
  ];

  for (const entry of entries) {
    let existing = await configRepo.findOne({ where: { key: entry.key } });
    if (existing) {
      existing.value = entry.value;
    } else {
      existing = configRepo.create(entry);
    }
    await configRepo.save(existing);
  }
}
