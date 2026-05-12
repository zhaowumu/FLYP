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

export const addComment = (id: number, log: any) => {
  return api.post(`/tasks/${id}/comments`, log)
}

export const extendDueDate = (id: number, data: { newDueDate: string; remark?: string }) => {
  return api.patch(`/tasks/${id}/extend`, data)
}

export const getTaskCategories = () => {
  return api.get('/tasks/categories')
}

export const rejectTask = (id: number, data: { assigneeIds: number[]; remark?: string }) => {
  return api.patch(`/tasks/${id}/reject`, data)
}

export const restartTask = (id: number, data: { assigneeIds: number[]; remark?: string }) => {
  return api.patch(`/tasks/${id}/restart`, data)
}

export const submitForTest = (id: number, data: { assigneeIds: number[]; remark?: string }) => {
  return api.patch(`/tasks/${id}/status`, {
    status: 'testing',
    assigneeIds: data.assigneeIds,
    log: { action: 'submit_test', remark: data.remark || '' }
  })
}

export const passTestTask = (id: number, data: { remark?: string }) => {
  return api.patch(`/tasks/${id}/pass-test`, data)
}

export const rejectTestTask = (id: number, data: { assigneeIds: number[]; remark?: string }) => {
  return api.patch(`/tasks/${id}/reject-test`, data)
}
