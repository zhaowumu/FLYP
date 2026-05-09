import api from './index'

export const getOperationLogs = (params?: any) => {
  return api.get('/operation-logs', { params })
}
