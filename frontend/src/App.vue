<template>
  <div class="app-container" v-if="userStore.isLoggedIn">
    <el-container class="main-layout">
      <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
        <div class="logo-container">
          <div class="logo-icon">
            <img src="/bee.png" alt="logo" class="logo-img" />
          </div>
          <span class="logo-text" v-show="!isCollapse">NewBee</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          :collapse="isCollapse"
          background-color="transparent"
          text-color="var(--nb-sidebar-text)"
          active-text-color="var(--nb-sidebar-active-text)"
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
          <el-menu-item index="/operation-logs">
            <el-icon><Document /></el-icon>
            <template #title>操作管理</template>
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
                <el-avatar :size="32" class="user-avatar" v-if="userStore.user?.avatar" :src="userStore.user.avatar" />
                <el-avatar :size="32" class="user-avatar" v-else>
                  {{ userStore.user?.realName?.charAt(0) || 'U' }}
                </el-avatar>
                <span class="user-name">{{ userStore.user?.realName || '用户' }}</span>
                <el-icon><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/profile')">
                    <el-icon><User /></el-icon>
                    个人设置
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <keep-alive include="Tasks,Bugs,OperationLogs">
              <component :is="Component" />
            </keep-alive>
          </router-view>
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
  User,
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
    '/settings': '系统设置',
    '/operation-logs': '操作管理',
    '/profile': '个人设置'
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
/* ==================== Layout Reset ==================== */
html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
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

/* ==================== Sidebar ==================== */
.sidebar {
  background-color: var(--nb-sidebar-bg);
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  height: 100%;
  border-right: 1px solid var(--nb-sidebar-border);
}

.logo-container {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--nb-space-4);
  background-color: var(--nb-sidebar-logo-bg);
  border-bottom: 1px solid var(--nb-sidebar-border);
}

.logo-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-img {
  width: 32px;
  height: 32px;
  border-radius: var(--nb-radius-md);
  object-fit: contain;
}

.logo-text {
  margin-left: var(--nb-space-3);
  font-size: var(--nb-font-size-xl);
  font-weight: var(--nb-font-weight-bold);
  color: #e2e8f0;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

.sidebar-menu {
  flex: 1;
  border-right: none !important;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 220px;
}

/* Sidebar menu item overrides */
.sidebar-menu .el-menu-item {
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  border-radius: var(--nb-radius-md);
  color: var(--nb-sidebar-text);
  transition: all var(--nb-transition-fast);
}

.sidebar-menu .el-menu-item:hover {
  background-color: var(--nb-sidebar-hover-bg) !important;
  color: var(--nb-sidebar-text-hover) !important;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: var(--nb-sidebar-active-bg) !important;
  color: var(--nb-sidebar-active-text) !important;
}

.sidebar-menu .el-menu-item .el-icon {
  font-size: 18px;
  margin-right: 10px;
}

.collapse-btn {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nb-sidebar-text);
  cursor: pointer;
  border-top: 1px solid var(--nb-sidebar-border);
  transition: all var(--nb-transition-fast);
}

.collapse-btn:hover {
  background-color: var(--nb-sidebar-hover-bg);
  color: var(--nb-sidebar-text-hover);
}

/* ==================== Main Container ==================== */
.main-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--nb-bg-page);
}

/* ==================== Header ==================== */
.main-header {
  height: 56px;
  min-height: 56px;
  background-color: var(--nb-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--nb-space-6);
  box-shadow: var(--nb-shadow-xs);
  border-bottom: 1px solid var(--nb-border-light);
  z-index: var(--nb-z-sticky);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--nb-space-4);
}

/* ==================== Search Trigger ==================== */
.search-trigger {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  padding: 6px var(--nb-space-3);
  background: var(--nb-bg-muted);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-md);
  cursor: pointer;
  color: var(--nb-text-secondary);
  font-size: var(--nb-font-size-base);
  transition: all var(--nb-transition-fast);
}

.search-trigger:hover {
  background: var(--nb-primary-lighter);
  border-color: var(--nb-primary);
  color: var(--nb-primary);
}

.search-trigger .el-icon {
  font-size: 16px;
}

.search-shortcut {
  display: flex;
  gap: 2px;
  margin-left: var(--nb-space-2);
}

.search-shortcut kbd {
  font-size: var(--nb-font-size-xs);
  font-family: var(--nb-font-mono);
  background: var(--nb-bg-card);
  border: 1px solid var(--nb-border);
  border-radius: 3px;
  padding: 1px 5px;
  color: var(--nb-text-secondary);
}

/* ==================== User Dropdown ==================== */
.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: var(--nb-space-1) var(--nb-space-2);
  border-radius: var(--nb-radius-sm);
  transition: background var(--nb-transition-fast);
}

.user-dropdown:hover {
  background-color: var(--nb-bg-hover);
}

.user-avatar {
  background: var(--nb-gradient-primary);
  color: white;
  font-weight: var(--nb-font-weight-medium);
  font-size: var(--nb-font-size-sm);
}

.user-name {
  margin: 0 var(--nb-space-2);
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
  font-weight: var(--nb-font-weight-medium);
}

/* ==================== Main Content ==================== */
.main-content {
  background-color: var(--nb-bg-page);
  padding: var(--nb-space-5);
  overflow-y: auto;
  flex: 1;
}
</style>