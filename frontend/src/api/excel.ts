import api from './index'

export const exportAll = (format?: string) => {
  return api.get('/excel/export/all', {
    params: { format },
    responseType: 'blob'
  })
}

export const backupData = () => {
  return api.get('/backup/export', {
    responseType: 'blob'
  })
}

export const restoreData = (data: any) => {
  return api.post('/backup/import', data)
}

export const clearDatabase = () => {
  return api.delete('/backup/clear')
}

export const clearAllDatabase = () => {
  return api.delete('/backup/clear-all')
}
