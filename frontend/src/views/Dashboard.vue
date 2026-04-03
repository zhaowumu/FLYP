<template>
  <div class="dashboard">
    <div class="welcome-banner">
      <div class="welcome-left">
        <div class="avatar-ring">
          <el-avatar :size="52" class="user-avatar">
            {{ userStore.user?.realName?.charAt(0) || 'U' }}
          </el-avatar>
        </div>
        <div class="welcome-text">
          <h2>欢迎回来，{{ userStore.user?.realName || '用户' }}</h2>
          <p>{{ today }}</p>
        </div>
      </div>
      <div class="welcome-right">
        <el-tag :type="getRoleTagType(userStore.user?.role)" size="large" effect="dark" class="role-badge">
          <el-icon size="14"><Medal /></el-icon>
          {{ getRoleText(userStore.user?.role) }}
        </el-tag>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="6" v-for="stat in visibleStats" :key="stat.key">
        <div class="stat-card" @click="stat.click">
          <div class="stat-icon" :class="stat.color">
            <el-icon :size="22"><component :is="stat.icon" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="content-row">
      <el-col :xs="24" :lg="12">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title">
              <span>我的任务</span>
              <el-badge :value="myTasks.length" :max="99" class="title-badge" />
            </div>
            <el-button text type="primary" @click="$router.push('/tasks')">查看全部</el-button>
          </div>
          <div class="task-list">
            <div
              v-for="task in myTasks"
              :key="task.id"
              class="list-item"
              @click="$router.push(`/tasks/${task.id}`)"
            >
              <div class="item-rank" :class="getPriorityRank(task.priority)">
                {{ getPriorityRankNum(task.priority) }}
              </div>
              <div class="item-main">
                <div class="item-title">{{ task.title }}</div>
                <div class="item-tags">
                  <el-tag :type="getPriorityType(task.priority)" size="small" effect="dark">
                    {{ getPriorityText(task.priority) }}
                  </el-tag>
                  <el-tag :type="getStatusType(task.status)" size="small" effect="plain">
                    {{ getStatusText(task.status) }}
                  </el-tag>
                  <span v-if="task.project" class="item-project">{{ task.project.name }}</span>
                </div>
              </div>
              <div class="item-arrow"><el-icon><ArrowRight /></el-icon></div>
            </div>
            <el-empty v-if="myTasks.length === 0" description="暂无任务" :image-size="80" />
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :lg="12">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title">
              <span>我的缺陷</span>
              <el-badge :value="myBugs.length" :max="99" class="title-badge" />
            </div>
            <el-button text type="primary" @click="$router.push('/bugs')">查看全部</el-button>
          </div>
          <div class="bug-list">
            <div
              v-for="bug in myBugs"
              :key="bug.id"
              class="list-item"
              @click="$router.push(`/bugs/${bug.id}`)"
            >
              <div class="item-rank" :class="getSeverityRank(bug.severity)">
                {{ getSeverityRankNum(bug.severity) }}
              </div>
              <div class="item-main">
                <div class="item-title">{{ bug.title }}</div>
                <div class="item-tags">
                  <el-tag :type="getSeverityType(bug.severity)" size="small" effect="dark">
                    {{ getSeverityText(bug.severity) }}
                  </el-tag>
                  <el-tag :type="getBugStatusType(bug.status)" size="small" effect="plain">
                    {{ getBugStatusText(bug.status) }}
                  </el-tag>
                  <span v-if="bug.project" class="item-project">{{ bug.project.name }}</span>
                </div>
              </div>
              <div class="item-arrow"><el-icon><ArrowRight /></el-icon></div>
            </div>
            <el-empty v-if="myBugs.length === 0" description="暂无缺陷" :image-size="80" />
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="content-row" v-if="userStore.isAdmin || userStore.user?.role === 'project_manager'">
      <el-col :span="24">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title">
              <span>项目概览</span>
            </div>
          </div>
          <el-row :gutter="12">
            <el-col :xs="12" :sm="8" :md="6" :lg="4" v-for="project in recentProjects" :key="project.id">
              <div class="project-card" @click="$router.push(`/projects/${project.id}`)">
                <div class="project-icon">📁</div>
                <div class="project-name">{{ project.name }}</div>
                <el-tag :type="project.status === 'active' ? 'success' : 'info'" size="small" effect="plain">
                  {{ project.status === 'active' ? '进行中' : '已完成' }}
                </el-tag>
              </div>
            </el-col>
          </el-row>
          <el-empty v-if="recentProjects.length === 0" description="暂无项目" :image-size="80" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="content-row">
      <el-col :xs="24" :lg="12">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title">
              <span>任务统计</span>
            </div>
          </div>
          <div class="chart-container">
            <div class="bar-chart">
              <div class="bar-group" v-for="bar in taskBars" :key="bar.label">
                <div class="bar-wrapper">
                  <div class="bar" :class="bar.color" :style="{ height: bar.height + '%' }">
                    <span class="bar-value">{{ bar.value }}</span>
                  </div>
                </div>
                <div class="bar-label">{{ bar.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :lg="12">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title">
              <span>缺陷统计</span>
            </div>
          </div>
          <div class="chart-container">
            <div class="bar-chart">
              <div class="bar-group" v-for="bar in bugBars" :key="bar.label">
                <div class="bar-wrapper">
                  <div class="bar" :class="bar.color" :style="{ height: bar.height + '%' }">
                    <span class="bar-value">{{ bar.value }}</span>
                  </div>
                </div>
                <div class="bar-label">{{ bar.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { getProjects } from '../api/project'
import { getTasks } from '../api/task'
import { getBugs } from '../api/bug'
import { getUsers } from '../api/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const stats = ref({
  projects: 0, myTasks: 0, myBugs: 0, users: 0,
  pendingTasks: 0, pendingBugs: 0, completedTasks: 0, fixedBugs: 0
})

const myTasks = ref<any[]>([])
const myBugs = ref<any[]>([])
const recentProjects = ref<any[]>([])
const taskStats = ref({ pending: 0, inProgress: 0, completed: 0, closed: 0 })
const bugStats = ref({ pending: 0, fixing: 0, fixed: 0, closed: 0 })

const today = computed(() => {
  const date = new Date()
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

const visibleStats = computed(() => {
  const role = userStore.user?.role
  const all = [
    { key: 'projects', label: '进行中项目', value: stats.value.projects, icon: 'Folder', color: 'stat-blue', click: () => router.push('/projects') },
    { key: 'myTasks', label: '我的任务', value: stats.value.myTasks, icon: 'List', color: 'stat-green', click: () => router.push('/tasks') },
    { key: 'myBugs', label: '我的缺陷', value: stats.value.myBugs, icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
    { key: 'pendingTasks', label: '待处理任务', value: stats.value.pendingTasks, icon: 'Clock', color: 'stat-cyan', click: () => router.push('/tasks') },
    { key: 'pendingBugs', label: '待处理缺陷', value: stats.value.pendingBugs, icon: 'Bell', color: 'stat-red', click: () => router.push('/bugs') },
    { key: 'completedTasks', label: '已完成任务', value: stats.value.completedTasks, icon: 'CircleCheck', color: 'stat-purple', click: () => router.push('/tasks') },
    { key: 'fixedBugs', label: '已修复缺陷', value: stats.value.fixedBugs, icon: 'Select', color: 'stat-pink', click: () => router.push('/bugs') },
    { key: 'users', label: '团队成员', value: stats.value.users, icon: 'User', color: 'stat-gray', click: () => router.push('/users') },
  ]
  if (role === 'admin' || role === 'project_manager') return all
  return all.filter(s => ['myTasks', 'myBugs', 'pendingTasks', 'pendingBugs', 'completedTasks', 'fixedBugs'].includes(s.key))
})

const taskBars = computed(() => {
  const max = Math.max(taskStats.value.pending, taskStats.value.inProgress, taskStats.value.completed, taskStats.value.closed, 1)
  return [
    { label: '待处理', value: taskStats.value.pending, height: (taskStats.value.pending / max) * 100, color: 'bar-info' },
    { label: '进行中', value: taskStats.value.inProgress, height: (taskStats.value.inProgress / max) * 100, color: 'bar-warning' },
    { label: '已完成', value: taskStats.value.completed, height: (taskStats.value.completed / max) * 100, color: 'bar-success' },
    { label: '已关闭', value: taskStats.value.closed, height: (taskStats.value.closed / max) * 100, color: 'bar-gray' },
  ]
})

const bugBars = computed(() => {
  const max = Math.max(bugStats.value.pending, bugStats.value.fixing, bugStats.value.fixed, bugStats.value.closed, 1)
  return [
    { label: '待处理', value: bugStats.value.pending, height: (bugStats.value.pending / max) * 100, color: 'bar-info' },
    { label: '修复中', value: bugStats.value.fixing, height: (bugStats.value.fixing / max) * 100, color: 'bar-warning' },
    { label: '已修复', value: bugStats.value.fixed, height: (bugStats.value.fixed / max) * 100, color: 'bar-success' },
    { label: '已关闭', value: bugStats.value.closed, height: (bugStats.value.closed / max) * 100, color: 'bar-gray' },
  ]
})

const getRoleTagType = (role: string) => {
  const map: Record<string, string> = { admin: 'danger', project_manager: 'warning', developer: 'primary', artist: '', designer: 'success', tester: 'info' }
  return map[role] || 'info'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = { admin: '管理员', project_manager: '项目经理', developer: '程序', artist: '美术', designer: '策划', tester: '测试' }
  return map[role] || role
}

const getPriorityType = (p: string) => {
  const map: Record<string, string> = { low: 'info', medium: 'warning', high: 'danger', urgent: 'danger' }
  return map[p] || 'info'
}

const getPriorityText = (p: string) => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
  return map[p] || p
}

const getStatusType = (s: string) => {
  const map: Record<string, string> = { pending: 'info', in_progress: 'warning', completed: 'success', closed: 'info' }
  return map[s] || 'info'
}

const getStatusText = (s: string) => {
  const map: Record<string, string> = { pending: '待处理', in_progress: '进行中', completed: '已完成', closed: '已关闭' }
  return map[s] || s
}

const getBugStatusType = (s: string) => {
  const map: Record<string, string> = { pending: 'info', assigned: 'warning', fixing: 'warning', fixed: 'success', verified: 'success', closed: 'info' }
  return map[s] || 'info'
}

const getBugStatusText = (s: string) => {
  const map: Record<string, string> = { pending: '待处理', assigned: '已分配', fixing: '修复中', fixed: '已修复', verified: '已验证', closed: '已关闭' }
  return map[s] || s
}

const getSeverityType = (s: string) => {
  const map: Record<string, string> = { low: 'info', medium: 'warning', high: 'danger', critical: 'danger' }
  return map[s] || 'info'
}

const getSeverityText = (s: string) => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }
  return map[s] || s
}

const getPriorityRank = (p: string) => {
  const map: Record<string, string> = { urgent: 'rank-ss', high: 'rank-s', medium: 'rank-a', low: 'rank-b' }
  return map[p] || 'rank-b'
}

const getPriorityRankNum = (p: string) => {
  const map: Record<string, string> = { urgent: 'SS', high: 'S', medium: 'A', low: 'B' }
  return map[p] || 'B'
}

const getSeverityRank = (s: string) => {
  const map: Record<string, string> = { critical: 'rank-ss', high: 'rank-s', medium: 'rank-a', low: 'rank-b' }
  return map[s] || 'rank-b'
}

const getSeverityRankNum = (s: string) => {
  const map: Record<string, string> = { critical: 'SS', high: 'S', medium: 'A', low: 'B' }
  return map[s] || 'B'
}

onMounted(async () => {
  try {
    const [projectsRes, tasksRes, bugsRes, usersRes] = await Promise.all([
      getProjects(), getTasks(), getBugs(), getUsers()
    ])

    const userId = userStore.user?.id
    const allTasks = tasksRes.data || []
    const allBugs = bugsRes.data || []
    const allProjects = projectsRes.data || []

    const myTaskList = allTasks.filter((t: any) => t.assignee?.id === userId || t.creator?.id === userId)
    const myBugList = allBugs.filter((b: any) => b.assignee?.id === userId || b.reporter?.id === userId || b.creator?.id === userId)

    stats.value = {
      projects: allProjects.filter((p: any) => p.status === 'active').length,
      myTasks: myTaskList.filter((t: any) => t.status !== 'completed' && t.status !== 'closed').length,
      myBugs: myBugList.filter((b: any) => b.status !== 'closed' && b.status !== 'verified').length,
      users: usersRes.data?.length || 0,
      pendingTasks: allTasks.filter((t: any) => t.status === 'pending').length,
      pendingBugs: allBugs.filter((b: any) => b.status === 'pending' || b.status === 'assigned').length,
      completedTasks: allTasks.filter((t: any) => t.status === 'completed').length,
      fixedBugs: allBugs.filter((b: any) => b.status === 'fixed').length
    }

    taskStats.value = {
      pending: allTasks.filter((t: any) => t.status === 'pending').length,
      inProgress: allTasks.filter((t: any) => t.status === 'in_progress').length,
      completed: allTasks.filter((t: any) => t.status === 'completed').length,
      closed: allTasks.filter((t: any) => t.status === 'closed').length
    }

    bugStats.value = {
      pending: allBugs.filter((b: any) => b.status === 'pending' || b.status === 'assigned').length,
      fixing: allBugs.filter((b: any) => b.status === 'fixing').length,
      fixed: allBugs.filter((b: any) => b.status === 'fixed').length,
      closed: allBugs.filter((b: any) => b.status === 'closed' || b.status === 'verified').length
    }

    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    myTasks.value = myTaskList
      .filter((t: any) => t.status !== 'completed' && t.status !== 'closed')
      .sort((a: any, b: any) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2))
      .slice(0, 8)

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    myBugs.value = myBugList
      .filter((b: any) => b.status !== 'closed' && b.status !== 'verified')
      .sort((a: any, b: any) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2))
      .slice(0, 8)

    recentProjects.value = allProjects.filter((p: any) => p.status === 'active').slice(0, 8)
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.welcome-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  position: relative;
  overflow: hidden;
}

.welcome-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  border-radius: 50%;
}

.welcome-left {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.avatar-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  padding: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.user-avatar {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 700;
  font-size: 20px;
  width: 100%;
  height: 100%;
}

.welcome-text h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.welcome-text p {
  font-size: 13px;
  margin: 0;
  opacity: 0.8;
}

.welcome-right {
  position: relative;
  z-index: 1;
}

.role-badge {
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stats-row {
  margin-bottom: 16px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #f0f0f0;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stat-blue { background: linear-gradient(135deg, #409eff, #66b1ff); }
.stat-green { background: linear-gradient(135deg, #67c23a, #85ce61); }
.stat-orange { background: linear-gradient(135deg, #e6a23c, #ebb563); }
.stat-purple { background: linear-gradient(135deg, #7c4dff, #9c7cff); }
.stat-cyan { background: linear-gradient(135deg, #00bcd4, #4dd0e1); }
.stat-red { background: linear-gradient(135deg, #f56c6c, #f78989); }
.stat-pink { background: linear-gradient(135deg, #e91e63, #f06292); }
.stat-gray { background: linear-gradient(135deg, #909399, #b1b3b8); }

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.content-row {
  margin-top: 16px;
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #f0f0f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}

.title-badge :deep(.el-badge__content) {
  top: 0;
}

.task-list,
.bug-list {
  max-height: 360px;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.list-item:hover {
  background: #f5f7fa;
}

.item-rank {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 11px;
  flex-shrink: 0;
}

.rank-ss { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; box-shadow: 0 2px 8px rgba(238, 90, 36, 0.3); }
.rank-s { background: linear-gradient(135deg, #ffa502, #e67e22); color: white; box-shadow: 0 2px 8px rgba(230, 126, 34, 0.2); }
.rank-a { background: linear-gradient(135deg, #409eff, #66b1ff); color: white; }
.rank-b { background: linear-gradient(135deg, #dcdfe6, #e4e7ed); color: #606266; }

.item-main {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.item-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.item-project {
  font-size: 11px;
  color: #909399;
}

.item-arrow {
  color: #c0c4cc;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.2s;
}

.list-item:hover .item-arrow {
  opacity: 1;
  color: #409eff;
}

.project-card {
  background: #f5f7fa;
  border-radius: 10px;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.project-card:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}

.project-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.project-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-container {
  padding: 10px 0;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 180px;
  padding: 0 10px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.bar-wrapper {
  width: 100%;
  max-width: 60px;
  height: 150px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
  transition: height 0.6s ease;
  min-height: 4px;
}

.bar-value {
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.bar-info { background: linear-gradient(180deg, #909399, #606266); }
.bar-warning { background: linear-gradient(180deg, #e6a23c, #cf9236); }
.bar-success { background: linear-gradient(180deg, #67c23a, #5daf34); }
.bar-gray { background: linear-gradient(180deg, #dcdfe6, #c0c4cc); }

.bar-label {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  text-align: center;
}

:deep(.el-empty) {
  padding: 20px 0;
}
</style>
