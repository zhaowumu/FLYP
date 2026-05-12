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
export const updateDingTalkConfig = (config: { webhook: string; secret: string; keyword: string; baseUrl: string; notify: Record<string, { enabled: boolean; template: string }> }) =>
  api.put('/system-config/dingtalk', config)

// 按类型测试钉钉通知（type: "create_task" | "create_bug" | "assign_task" | "complete_task" | "reject_task" | "submit_test_task" | "pass_test_task" | "restart_task" | "assign_bug" | "fix_bug" | "verify_bug" | "reject_bug" | "restart_bug"，不传则发通用测试）
// template: 用户自定义模板内容，为空则使用默认模板
export const testDingTalkByType = (type?: string, template?: string) =>
  api.post('/system-config/dingtalk/test', { type, template })

// Gitee 云备份
export const getGiteeBackupConfig = () => api.get('/system-config/gitee-backup')
export const updateGiteeBackupConfig = (config: { enabled: boolean; token: string; owner: string; repo: string; branch: string }) => api.put('/system-config/gitee-backup', config)
export const testGiteeBackupConnection = (config: { token: string; owner: string; repo: string; branch: string }) => api.post('/system-config/gitee-backup/test', config, { timeout: 15000 })

export default api
