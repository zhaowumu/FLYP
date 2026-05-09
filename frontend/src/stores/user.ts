import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, register, getUserInfo } from '../api/user'
import { getPermissions } from '../api/permission'

export interface User {
  id: number
  username: string
  realName: string
  phone: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(JSON.parse(localStorage.getItem('user') || 'null'))
  const permissions = ref<any>(JSON.parse(localStorage.getItem('permissions') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isPM = computed(() => user.value?.role === 'admin' || user.value?.role === 'project_manager')

  function getTaskPermission(action: string, extra: { isAssignee?: boolean; isCreator?: boolean } = {}): boolean {
    if (!permissions.value || !user.value) return false
    const role = user.value.role
    const isAdminOrPM = role === 'admin' || role === 'project_manager'

    const rolePerms = permissions.value[role]
    const roleHas = rolePerms?.task?.[action] ?? false

    // 关系级权限：由 extra 中的实际布尔值判断（组件需传入 isAssignee.value / isCreator.value）
    const relationPerms: Record<string, boolean> = {
      complete: extra.isAssignee || false,
      reopen: extra.isCreator || false,
      close: extra.isCreator || false,
      transfer: (extra.isAssignee || false) || (extra.isCreator || false),
      changePriority: isAdminOrPM || (extra.isCreator || false),
      changeStatus: isAdminOrPM || (extra.isCreator || false),
      comment: true,
      delete: false,
    }

    return roleHas || (relationPerms[action] ?? false)
  }

  function getBugPermission(action: string, extra: { isReporter?: boolean; isAssignee?: boolean } = {}): boolean {
    if (!permissions.value || !user.value) return false
    const role = user.value.role
    const isAdminOrPM = role === 'admin' || role === 'project_manager'

    const rolePerms = permissions.value[role]
    const roleHas = rolePerms?.bug?.[action] ?? false

    // 关系级权限：由 extra 中的实际布尔值判断（组件需传入 isReporter.value / isAssignee.value）
    const relationPerms: Record<string, boolean> = {
      fix: extra.isAssignee || false,
      reopen: extra.isReporter || false,
      verify: extra.isReporter || false,
      close: extra.isReporter || false,
      transfer: (extra.isReporter || false) || (extra.isAssignee || false),
      changeSeverity: isAdminOrPM || (extra.isReporter || false),
      changeStatus: isAdminOrPM || (extra.isReporter || false),
      comment: true,
      delete: false,
    }

    return roleHas || (relationPerms[action] ?? false)
  }

  function getProjectPermission(action: string): boolean {
    if (!permissions.value || !user.value) return false
    const rolePerms = permissions.value[user.value.role]
    return rolePerms?.project?.[action] ?? false
  }

  async function loginAction(username: string, password: string) {
    try {
      const res = await login(username, password)
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('token', token.value)
      localStorage.setItem('user', JSON.stringify(user.value))

      const permRes = await getPermissions()
      permissions.value = permRes.data
      localStorage.setItem('permissions', JSON.stringify(permissions.value))

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

      const permRes = await getPermissions()
      permissions.value = permRes.data
      localStorage.setItem('permissions', JSON.stringify(permissions.value))
    } catch (error) {
      console.error('Failed to fetch user info:', error)
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    permissions.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
  }

  return {
    token,
    user,
    permissions,
    isLoggedIn,
    isAdmin,
    isPM,
    getTaskPermission,
    getBugPermission,
    getProjectPermission,
    loginAction,
    registerAction,
    fetchUserInfo,
    logout
  }
})
