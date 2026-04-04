import api from './index'

export const getTasks = (params?: any) => {
  return api.get('/tasks', { params })
}

export const getTask = (id: number) => {
  return api.get(`/tasks/${id}`)
}

export const createTask = (taskData: any) => {
  return api.post('/tasks', taskData)
}

export const updateTask = (id: number, taskData: any) => {
  return api.put(`/tasks/${id}`, taskData)
}

export const updateTaskStatus = (id: number, status: string, log?: any) => {
  return api.patch(`/tasks/${id}/status`, { status, log })
}

export const deleteTask = (id: number) => {
  return api.delete(`/tasks/${id}`)
}

export const addSubtask = (parentId: number, taskData: any) => {
  return api.post(`/tasks/${parentId}/subtasks`, taskData)
}

export const getTaskDependencies = (id: number) => {
  return api.get(`/tasks/${id}/dependencies`)
}

export const addComment = (id: number, log: any) => {
  return api.post(`/tasks/${id}/comments`, log)
}

export const extendDueDate = (id: number, data: { newDueDate: string; remark?: string }) => {
  return api.patch(`/tasks/${id}/extend`, data)
}