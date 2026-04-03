import api from './index'

export const exportTasks = (projectId?: number) => {
  return api.get('/excel/export/tasks', {
    params: { projectId },
    responseType: 'blob'
  })
}

export const exportBugs = (projectId?: number) => {
  return api.get('/excel/export/bugs', {
    params: { projectId },
    responseType: 'blob'
  })
}

export const importTasks = (file: File, projectId: number) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId.toString())
  return api.post('/excel/import/tasks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const importBugs = (file: File, projectId: number) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId.toString())
  return api.post('/excel/import/bugs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const downloadTaskTemplate = () => {
  return api.get('/excel/template/tasks', {
    responseType: 'blob'
  })
}

export const downloadBugTemplate = () => {
  return api.get('/excel/template/bugs', {
    responseType: 'blob'
  })
}

// 备份数据
export const backupData = () => {
  return api.get('/backup/export', {
    responseType: 'blob'
  })
}

// 恢复数据
export const restoreData = (data: any) => {
  return api.post('/backup/import', data)
}

// 导出全部数据（多Sheet）
export const exportAll = () => {
  return api.get('/excel/export/all', {
    responseType: 'blob'
  })
}

// 清空数据库
export const clearDatabase = () => {
  return api.delete('/backup/clear')
}