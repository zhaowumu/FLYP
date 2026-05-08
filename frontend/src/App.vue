<template>
  <div class="app-container" v-if="userStore.isLoggedIn">
    <el-container class="main-layout">
      <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
        <div class="logo-container">
          <div class="logo-icon">
            <el-icon size="28"><Monitor /></el-icon>
          </div>
          <span class="logo-text" v-show="!isCollapse">NewBee</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          :collapse="isCollapse"
          background-color="#1d1e1f"
          text-color="#a0a3a8"
          active-text-color="#409eff"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataLine /></el-icon>
            <template #title>工作台</template>
          </el-menu-item>
          <el-menu-item index="/projects" v-if="userStore.isPM">
            <el-icon><Folder /></el-icon>
            <template #title>项目管理</template>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><List /></el-icon>
            <template #title>任务管理</template>
          </el-menu-item>
          <el-menu-item index="/bugs">
            <el-icon><Warning /></el-icon>
            <template #title>缺陷管理</template>
          </el-menu-item>
          <el-menu-item index="/users" v-if="userStore.isAdmin">
            <el-icon><User /></el-icon>
            <template #title>成员管理</template>
          </el-menu-item>
          <el-menu-item index="/settings" v-if="userStore.isAdmin">
            <el-icon><Setting /></el-icon>
            <template #title>系统设置</template>
          </el-menu-item>
          <el-menu-item
            v-for="link in customLinks"
            :key="link.url"
            :index="link.url"
          >
            <el-icon><component :is="iconMap[link.icon] || iconMap['Link']" /></el-icon>
            <template #title>{{ link.name }}</template>
          </el-menu-item>
        </el-menu>
        <div class="collapse-btn" @click="isCollapse = !isCollapse">
          <el-icon v-if="isCollapse"><Expand /></el-icon>
          <el-icon v-else><Fold /></el-icon>
        </div>
      </el-aside>
      <el-container class="main-container">
        <el-header class="main-header">
          <div class="header-left">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item>{{ currentRoute }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <div class="search-trigger" @click="searchVisible = true">
              <el-icon><Search /></el-icon>
              <span>搜索...</span>
              <div class="search-shortcut">
                <kbd>⌘</kbd><kbd>K</kbd>
              </div>
            </div>
            <el-dropdown trigger="click">
              <div class="user-dropdown">
                <el-avatar :size="32" class="user-avatar">
                  {{ userStore.user?.realName?.charAt(0) || 'U' }}
                </el-avatar>
                <span class="user-name">{{ userStore.user?.realName || '用户' }}</span>
                <el-icon><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleLogout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
  <div v-else class="login-wrapper">
    <router-view />
  </div>
  <GlobalSearch v-model="searchVisible" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, markRaw, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { getCustomLinks } from './api/customLink'
import { ElMessage } from 'element-plus'
import GlobalSearch from './components/GlobalSearch.vue'
import {
  Link,
  Document,
  Reading,
  Monitor,
  DataAnalysis,
  Tools,
  ChatDotRound,
  FolderOpened,
  Search,
} from '@element-plus/icons-vue'

const iconMap: Record<string, any> = {
  Document: markRaw(Document),
  Link: markRaw(Link),
  Reading: markRaw(Reading),
  Monitor: markRaw(Monitor),
  DataAnalysis: markRaw(DataAnalysis),
  Tools: markRaw(Tools),
  ChatDotRound: markRaw(ChatDotRound),
  FolderOpened: markRaw(FolderOpened),
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)
const customLinks = ref<Array<{ name: string; url: string; icon: string; type: string }>>([])
const searchVisible = ref(false)

const activeMenu = computed(() => route.path)

const currentRoute = computed(() => {
  const routeMap: Record<string, string> = {
    '/dashboard': '工作台',
    '/projects': '项目管理',
    '/tasks': '任务管理',
    '/bugs': '缺陷管理',
    '/users': '成员管理',
    '/settings': '系统设置'
  }
  if (routeMap[route.path]) return routeMap[route.path]
  if (route.path.startsWith('/tasks/')) return '任务详情'
  if (route.path.startsWith('/bugs/')) return '缺陷详情'
  if (route.path.startsWith('/projects/')) return '项目详情'
  return '首页'
})

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const handleMenuSelect = (index: string) => {
  const link = customLinks.value.find(l => l.url === index)
  if (!link) {
    router.push(index)
    return
  }
  if (link.type === 'folder') {
    navigator.clipboard.writeText(link.url).then(() => {
      ElMessage({
        message: `路径已复制到剪贴板，请按 Win+R 粘贴打开`,
        type: 'success',
        duration: 3000,
      })
    }).catch(() => {
      ElMessage.warning('复制失败，请手动复制路径')
    })
  } else if (link.type === 'markdown') {
    router.push({ path: '/markdown', query: { path: link.url, name: link.name } })
  } else {
    window.open(index, '_blank')
  }
}

async function loadCustomLinks() {
  try {
    const res = await getCustomLinks()
    if (res.data) {
      customLinks.value = res.data
    }
  } catch {
    customLinks.value = []
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    loadCustomLinks()
  }
})

watch(() => userStore.isLoggedIn, (val) => {
  if (val) {
    loadCustomLinks()
  }
})

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchVisible.value = true
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    loadCustomLinks()
  }
  document.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-container {
  height: 100vh;
  width: 100vw;
}

.login-wrapper {
  height: 100vh;
  width: 100vw;
}

.main-layout {
  height: 100%;
  width: 100%;
}

.sidebar {
  background-color: #1d1e1f;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
  height: 100%;
}

.logo-container {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background-color: #141414;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-text {
  margin-left: 12px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border-right: none !important;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 220px;
}

.collapse-btn {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0a3a8;
  cursor: pointer;
  border-top: 1px solid #2d2d2d;
}

.collapse-btn:hover {
  background-color: #2d2d2d;
  color: white;
}

.main-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-header {
  height: 56px;
  min-height: 56px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  color: #909399;
  font-size: 14px;
  transition: all 0.2s;
}

.search-trigger:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.search-trigger .el-icon {
  font-size: 16px;
}

.search-shortcut {
  display: flex;
  gap: 2px;
  margin-left: 8px;
}

.search-shortcut kbd {
  font-size: 11px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 1px 5px;
  color: #909399;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.user-dropdown:hover {
  background-color: #f5f5f5;
}

.user-avatar {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
  font-weight: 500;
}

.user-name {
  margin: 0 8px;
  font-size: 14px;
  color: #333;
}

.main-content {
  background-color: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}
</style>