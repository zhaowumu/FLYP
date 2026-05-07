import api from './index'

export const getBugs = (params?: any) => {
  return api.get('/bugs', { params })
}

export const getBug = (id: number) => {
  return api.get(`/bugs/${id}`)
}

export const createBug = (bugData: any) => {
  return api.post('/bugs', bugData)
}

export const updateBug = (id: number, bugData: any) => {
  return api.put(`/bugs/${id}`, bugData)
}

export const updateBugStatus = (id: number, status: string, log?: any) => {
  return api.patch(`/bugs/${id}/status`, { status, log })
}

export const assignBug = (id: number, assigneeId: number) => {
  return api.patch(`/bugs/${id}/assign`, { assigneeId })
}

export const deleteBug = (id: number) => {
  return api.delete(`/bugs/${id}`)
}

export const getBugStats = (params?: any) => {
  return api.get('/bugs/stats', { params })
}

export const addComment = (id: number, log: any) => {
  return api.post(`/bugs/${id}/comments`, log)
}

export const extendDueDate = (id: number, data: { newDueDate: string; remark?: string }) => {
  return api.patch(`/bugs/${id}/extend`, data)
}

export const getBugCategories = () => {
  return api.get('/bugs/categories')
}
