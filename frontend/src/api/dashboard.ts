import api from './index'

export const getDashboard = () => {
  return api.get('/dashboard')
}

export const getLeaderboard = () => {
  return api.get('/dashboard/leaderboard')
}
