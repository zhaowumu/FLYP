import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const getDingTalkConfig = () => api.get('/system-config/dingtalk')
export const updateDingTalkConfig = (config: { webhook: string; secret: string; keyword: string }) => api.put('/system-config/dingtalk', config)

// Gitee 云备份
export const getGiteeBackupConfig = () => api.get('/system-config/gitee-backup')
export const updateGiteeBackupConfig = (config: { enabled: boolean; token: string; owner: string; repo: string; branch: string }) => api.put('/system-config/gitee-backup', config)
export const testGiteeBackupConnection = (config: { token: string; owner: string; repo: string; branch: string }) => api.post('/system-config/gitee-backup/test', config, { timeout: 15000 })

export default api
