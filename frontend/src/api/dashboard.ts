import api from './index'

export const getDashboard = () => {
  return api.get('/dashboard')
}
