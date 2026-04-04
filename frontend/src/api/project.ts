import api from './index'

export const getProjects = () => {
  return api.get('/projects')
}

export const getProject = (id: number) => {
  return api.get(`/projects/${id}`)
}

export const createProject = (projectData: any) => {
  return api.post('/projects', projectData)
}

export const updateProject = (id: number, projectData: any) => {
  return api.put(`/projects/${id}`, projectData)
}

export const deleteProject = (id: number) => {
  return api.delete(`/projects/${id}`)
}

export const archiveProject = (id: number) => {
  return api.patch(`/projects/${id}/archive`)
}