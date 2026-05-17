import fs from 'fs'
import path from 'path'
import { AppDataSource } from '../config/database'

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
  // 去除开头的 / ，拼接到 cwd
  const relativePath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath
  return path.join(process.cwd(), relativePath)
}

/**
 * 查询数据库中所有引用了指定文件路径的记录数
 * 返回仍被引用的文件路径集合
 */
export async function findReferencedUrls(filePaths: string[]): Promise<Set<string>> {
  if (filePaths.length === 0) return new Set()

  const referenced = new Set<string>()

  // 需要检查的表和字段（SQLite 列名为驼峰，与 TypeORM 实体属性名一致）
  const checks: { table: string; column: string }[] = [
    { table: 'task', column: 'description' },
    { table: 'bug', column: 'description' },
    { table: 'bug', column: 'reproduceSteps' },
    { table: 'operation_log', column: 'remark' },
  ]

  for (const { table, column } of checks) {
    for (const fp of filePaths) {
      // 用 LIKE 模糊匹配，检查是否有任何记录引用了该文件
      const result = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM ${table} WHERE ${column} LIKE ?`,
        [`%${fp}%`]
      )
      if (result[0]?.cnt > 0) {
        referenced.add(fp)
      }
    }
  }

  return referenced
}

/**
 * 删除磁盘上不被任何数据库记录引用的文件
 * 返回已删除的文件路径列表
 */
export async function deleteUnreferencedFiles(urls: string[]): Promise<string[]> {
  const referenced = await findReferencedUrls(urls)
  const deleted: string[] = []

  for (const url of urls) {
    // 如果仍被引用，跳过
    if (referenced.has(url)) continue

    const filePath = urlToFilePath(url)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        deleted.push(url)
      }
    } catch (err) {
      console.error(`删除文件失败: ${filePath}`, err)
    }
  }

  return deleted
}

/**
 * 全量扫描清理：扫描 uploads 目录，找出不被任何数据库记录引用的孤儿文件
 * 返回已删除的文件路径列表
 */
export async function cleanAllOrphanedFiles(): Promise<{ deleted: string[]; total: number; orphaned: number }> {
  const uploadsDir = path.join(process.cwd(), 'uploads')
  const allFiles: string[] = []

  // 扫描 images、videos、avatars 三个子目录
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

  // 找出所有仍被引用的文件
  const referenced = await findReferencedUrls(allFiles)

  // 删除未被引用的文件
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
      console.error(`删除文件失败: ${filePath}`, err)
    }
  }

  return { deleted, total, orphaned: allFiles.length - referenced.size }
}
