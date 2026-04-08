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
