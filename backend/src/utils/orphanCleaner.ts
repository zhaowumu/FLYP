import fs from 'fs'
import path from 'path'
import { AppDataSource } from '../config/database'
import { logger } from '../services/logger'

/**
 * 从 HTML 内容中提取所有 /uploads/ 路径的文件 URL
 */
export function extractUploadUrls(html: string): string[] {
  if (!html) return []
  const regex = /\/uploads\/(images|videos|avatars)\/[^\s"'<>]+/g
  const matches = html.match(regex)
  return matches ? [...new Set(matches)] : []
}

/**
 * 将 URL 路径转换为磁盘物理路径
 * /uploads/images/xxx.jpg -> process.cwd()/uploads/images/xxx.jpg
 */
export function urlToFilePath(urlPath: string): string {
  const relativePath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath
  return path.join(process.cwd(), relativePath)
}

/**
 * 查询数据库中"有效引用"了指定文件路径的记录
 * 有效引用 = 任务/Bug描述中的引用 + 操作日志中目标实体仍存在的引用
 * 返回仍被有效引用的文件路径集合
 */
export async function findReferencedUrls(filePaths: string[]): Promise<Set<string>> {
  if (filePaths.length === 0) return new Set()

  const referenced = new Set<string>()

  // 1. 任务和 Bug 描述中的引用（实体存在即有效）
  const entityChecks: { table: string; column: string }[] = [
    { table: 'task', column: 'description' },
    { table: 'bug', column: 'description' },
    { table: 'bug', column: 'reproduceSteps' },
  ]

  for (const { table, column } of entityChecks) {
    for (const fp of filePaths) {
      const result = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM ${table} WHERE ${column} LIKE ?`,
        [`%${fp}%`]
      )
      if (result[0]?.cnt > 0) {
        referenced.add(fp)
      }
    }
  }

  // 2. 操作日志中的引用（仅目标实体仍存在时才算有效）
  for (const fp of filePaths) {
    // 如果已经被任务/Bug引用，不需要再查操作日志
    if (referenced.has(fp)) continue

    // 查找引用了该文件且目标实体仍存在的操作日志
    const result = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM operation_log
       WHERE remark LIKE ?
       AND (
         (targetType = 'task' AND targetId IN (SELECT id FROM task))
         OR (targetType = 'bug' AND targetId IN (SELECT id FROM bug))
       )`,
      [`%${fp}%`]
    )
    if (result[0]?.cnt > 0) {
      referenced.add(fp)
    }
  }

  return referenced
}

/**
 * 删除磁盘上不被任何有效引用引用的文件
 * 返回已删除的文件路径列表
 */
export async function deleteUnreferencedFiles(urls: string[]): Promise<string[]> {
  const referenced = await findReferencedUrls(urls)
  const deleted: string[] = []

  for (const url of urls) {
    if (referenced.has(url)) continue

    const filePath = urlToFilePath(url)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        deleted.push(url)
      }
    } catch (err) {
      logger.error(`删除文件失败: ${filePath}`, err)
    }
  }

  return deleted
}

/**
 * 全量扫描清理：扫描 uploads 目录，找出不被任何有效引用的孤儿文件
 * 有效引用 = 任务/Bug描述 + 目标实体仍存在的操作日志
 * 返回已删除的文件路径列表
 */
export async function cleanAllOrphanedFiles(): Promise<{ deleted: string[]; total: number; orphaned: number }> {
  const uploadsDir = path.join(process.cwd(), 'uploads')
  const allFiles: string[] = []

  const subDirs = ['images', 'videos', 'avatars']
  for (const subDir of subDirs) {
    const dirPath = path.join(uploadsDir, subDir)
    if (!fs.existsSync(dirPath)) continue

    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      allFiles.push(`/uploads/${subDir}/${file}`)
    }
  }

  const total = allFiles.length
  if (total === 0) return { deleted: [], total: 0, orphaned: 0 }

  const referenced = await findReferencedUrls(allFiles)

  const deleted: string[] = []
  for (const url of allFiles) {
    if (referenced.has(url)) continue

    const filePath = urlToFilePath(url)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        deleted.push(url)
      }
    } catch (err) {
      logger.error(`删除文件失败: ${filePath}`, err)
    }
  }

  return { deleted, total, orphaned: allFiles.length - referenced.size }
}
