import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getUserInfo, updateProfile } from '../api/user'

export interface User {
  id: number
  username: string
  realName: string
  avatar: string | null
  phone: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isPM = computed(() => user.value?.role === 'admin' || user.value?.role === 'project_manager')

  function getTaskPermission(action: string, extra: { isAssignee?: boolean; isCreator?: boolean } = {}): boolean {
    if (!user.value) return false
    const isAdminOrPM = user.value.role === 'admin' || user.value.role === 'project_manager'

    const perms: Record<string, boolean> = {
      create: true,
      complete: extra.isAssignee || false,
      reopen: extra.isCreator || false,
      reject: extra.isCreator || false,
      assign: isAdminOrPM || (extra.isCreator || false),
      restart: true,
      close: isAdminOrPM || (extra.isCreator || false),
      transfer: extra.isAssignee || false,
      feedback: extra.isAssignee || false,
      submitTest: isAdminOrPM || (extra.isCreator || false),
      passTest: extra.isAssignee || false,
      rejectTest: isAdminOrPM || (extra.isAssignee || false),
      changePriority: isAdminOrPM || (extra.isCreator || false),
      changeStatus: isAdminOrPM || (extra.isCreator || false),
      comment: true,
      delete: isAdminOrPM,
      extendDueDate: isAdminOrPM,
    }

    return perms[action] ?? false
  }

  function getBugPermission(action: string, extra: { isReporter?: boolean; isAssignee?: boolean } = {}): boolean {
    if (!user.value) return false
    const isAdminOrPM = user.value.role === 'admin' || user.value.role === 'project_manager'

    const perms: Record<string, boolean> = {
      create: true,
      fix: extra.isAssignee || false,
      reopen: extra.isReporter || false,
      assign: isAdminOrPM || (extra.isReporter || false),
      rejectBug: isAdminOrPM || (extra.isReporter || false),
      restartBug: true,
      verify: extra.isReporter || false,
      close: isAdminOrPM || (extra.isReporter || false),
      transfer: extra.isAssignee || false,
      feedback: extra.isAssignee || false,
      changeSeverity: isAdminOrPM || (extra.isReporter || false),
      changeStatus: isAdminOrPM || (extra.isReporter || false),
      comment: true,
      delete: isAdminOrPM,
      extendDueDate: isAdminOrPM,
    }

    return perms[action] ?? false
  }

  function getProjectPermission(action: string): boolean {
    if (!user.value) return false
    if (action === 'create') return user.value.role === 'admin' || user.value.role === 'project_manager'
    if (action === 'delete') return user.value.role === 'admin'
    return false
  }

  async function loginAction(username: string, password: string) {
    try {
      const res = await login(username, password)
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))

      return res.data
    } catch (error) {
      throw error
    }
  }

  async function registerAction(userData: any) {
    try {
      const res = await register(userData)
      return res.data
    } catch (error) {
      throw error
    }
  }

  async function fetchUserInfo() {
    try {
      if (!user.value?.id) return
      const res = await getUserInfo(user.value.id)
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    }
  }

  async function updateProfileAction(data: { realName?: string; avatar?: string }) {
    try {
      const res = await updateProfile(data)
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(user.value))
      return res.data
    } catch (error) {
      throw error
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    isPM,
    getTaskPermission,
    getBugPermission,
    getProjectPermission,
    loginAction,
    registerAction,
    fetchUserInfo,
    updateProfileAction,
    logout
  }
})
