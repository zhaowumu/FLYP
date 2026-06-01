import api from './index'

export const exportAll = (format?: string) => {
  return api.get('/excel/export/all', {
    params: { format },
    responseType: 'blob'
  })
}

// 备份数据库文件
export const backupData = () => {
  return api.get('/backup/export', {
    responseType: 'blob'
  })
}

// 恢复数据库文件
export const restoreData = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/backup/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 清空数据库（保留用户）
export const clearDatabase = () => {
  return api.delete('/backup/clear')
}

// 清空所有数据（包含用户）
export const clearAllDatabase = () => {
  return api.delete('/backup/clear-all')
}

// 获取自动备份状态
export const getBackupStatus = () => {
  return api.get('/backup/status')
}

// 获取备份文件列表
export const getBackupList = () => {
  return api.get('/backup/list')
}

// 下载指定备份文件
export const downloadBackup = (filename: string) => {
  return api.get(`/backup/download/${filename}`, {
    responseType: 'blob'
  })
}

// 删除指定备份文件
export const deleteBackupFile = (filename: string) => {
  return api.delete(`/backup/file/${filename}`)
}

// 开关自动备份
export const toggleAutoBackup = (enabled: boolean) => {
  return api.post('/backup/toggle', { enabled })
}

// 立即执行一次备份
export const backupNow = () => {
  return api.post('/backup/backup-now')
}
