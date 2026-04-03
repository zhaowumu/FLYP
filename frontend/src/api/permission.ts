import api from './index'

export const getPermissions = () => api.get('/permissions')

export const updatePermissions = (permissions: any) => api.put('/permissions', permissions)
