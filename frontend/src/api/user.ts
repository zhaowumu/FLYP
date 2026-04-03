import api from './index'

export const login = (username: string, password: string) => {
  return api.post('/users/login', { username, password })
}

export const register = (userData: any) => {
  return api.post('/users/register', userData)
}

export const getUsers = () => {
  return api.get('/users')
}

export const getUserInfo = (id: number) => {
  return api.get(`/users/${id}`)
}

export const updateUser = (id: number, userData: any) => {
  return api.put(`/users/${id}`, userData)
}

export const deleteUser = (id: number) => {
  return api.delete(`/users/${id}`)
}