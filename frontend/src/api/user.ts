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

// 获取当前用户信息
export const getCurrentUser = () => {
  return api.get('/users/me')
}

// 更新个人资料（头像，姓名/手机号仅管理员可修改）
export const updateProfile = (data: { avatar?: string }) => {
  return api.put('/users/profile', data)
}

// 修改密码
export const changePassword = (data: { currentPassword: string; newPassword: string }) => {
  return api.put('/users/password', data)
}

// 上传头像文件
export const uploadAvatar = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
