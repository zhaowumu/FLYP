<template>
  <div class="dashboard">
    <!-- Welcome Banner -->
    <div class="banner" :class="bannerClass">
      <div class="banner-bg-pattern">
        <svg class="floating-icon float-1" viewBox="0 0 64 64" fill="none">
          <path d="M32 8L38 24H56L42 34L48 50L32 40L16 50L22 34L8 24H26L32 8Z" fill="rgba(255,255,255,0.12)"/>
        </svg>
        <svg class="floating-icon float-2" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.1)" stroke-width="3" fill="none"/>
          <path d="M24 32L30 38L42 26" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg class="floating-icon float-3" viewBox="0 0 64 64" fill="none">
          <path d="M32 12V52M12 32H52" stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-linecap="round"/>
          <rect x="16" y="16" width="32" height="32" rx="6" stroke="rgba(255,255,255,0.08)" stroke-width="3" fill="none"/>
        </svg>
        <svg class="floating-icon float-4" viewBox="0 0 64 64" fill="none">
          <path d="M20 44L32 16L44 44H20Z" stroke="rgba(255,255,255,0.1)" stroke-width="3" fill="none" stroke-linejoin="round"/>
          <circle cx="32" cy="36" r="4" fill="rgba(255,255,255,0.1)"/>
        </svg>
      </div>
      <div class="banner-content">
        <div class="banner-left">
          <div class="avatar">
            <img v-if="userStore.user?.avatar" :src="userStore.user.avatar" class="avatar-img" />
            <span v-else>{{ userStore.user?.realName?.charAt(0) || 'U' }}</span>
          </div>
          <div class="welcome-text">
            <h2>{{ greeting }}，{{ userStore.user?.realName || '用户' }}</h2>
            <div class="date">{{ today }}</div>
            <div class="banner-subtitle">{{ bannerSubtitle }}</div>
          </div>
        </div>
        <div class="banner-right">
          <div class="hero-image">
            <img src="/bee.png" alt="Hero" />
          </div>
          <div class="role-badge">
            <svg class="badge-star" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/>
            </svg>
            {{ getRoleText(userStore.user?.role) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Quest Panel (role-specific) -->
    <div class="quick-quests">
      <div v-for="quest in quickQuests" :key="quest.key" class="quest-card" @click="quest.click">
        <div class="quest-icon" v-html="quest.svg"></div>
        <div class="quest-info">
          <div class="quest-title">{{ quest.title }}</div>
          <div class="quest-desc">{{ quest.desc }}</div>
        </div>
        <div class="quest-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    </div>

    <!-- ==================== Admin View ==================== -->
    <template v-if="userStore.user?.role === 'admin'">
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b"/>
          </svg>
          全局统计
        </div>
        <div class="stats-grid">
          <div v-for="stat in adminStats" :key="stat.key" class="stat-card" :class="stat.color" @click="stat.click">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box">
                <el-icon :size="22"><component :is="stat.icon" /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col main">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z" fill="#667eea" opacity="0.15"/>
                <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z" stroke="#667eea" stroke-width="1.5" fill="none"/>
              </svg>
              <span>项目进度</span>
              <el-button class="btn-link" @click="$router.push('/projects')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="project in recentProjects" :key="project.id" class="list-item" @click="$router.push(`/projects/${project.id}`)">
                <div class="item-icon"><el-icon size="18" color="#667eea"><Folder /></el-icon></div>
                <div class="item-content">
                  <div class="item-title">{{ project.name }}</div>
                  <div class="item-meta">
                    <span class="tag" :class="project.status === 'active' ? 'tag-success' : 'tag-default'">
                      {{ project.status === 'active' ? '进行中' : '已完成' }}
                    </span>
                    <span><el-icon size="12"><Folder /></el-icon> {{ project.manager?.realName || '-' }}</span>
                  </div>
                  <div class="progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: getProjectProgress(project) + '%' }"></div>
                    </div>
                    <span class="health-dot" :class="getHealthColor(getProjectProgress(project))"></span>
                    <span class="progress-text">{{ getProjectProgress(project) }}%</span>
                  </div>
                </div>
              </div>
              <div v-if="recentProjects.length === 0" class="empty">
                <svg class="empty-icon" viewBox="0 0 80 80" fill="none">
                  <rect x="16" y="12" width="48" height="56" rx="6" stroke="#d1d5db" stroke-width="2" stroke-dasharray="4 4"/>
                  <path d="M32 36H48M32 44H44M32 52H40" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <div>暂无项目</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col side">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="7" r="4" stroke="#667eea" stroke-width="1.5" fill="none"/>
                <path d="M5 21C5 17.13 8.13 14 12 14C15.87 14 19 17.13 19 21" stroke="#667eea" stroke-width="1.5" fill="none"/>
              </svg>
              <span>团队成员</span>
            </div>
            <div class="team-list">
              <div v-for="user in teamMembers" :key="user.id" class="team-member">
                <div class="member-accent" :style="{ background: getRoleGradient(user.role) }"></div>
                <div class="member-avatar" :style="{ background: getRoleGradient(user.role) }">
                  <img v-if="user.avatar" :src="user.avatar" class="member-avatar-img" />
                  <span v-else>{{ user.name?.charAt(0) || '?' }}</span>
                </div>
                <div class="member-info">
                  <div class="member-name">{{ user.name }}
                    <span class="member-role-pill" :style="{ background: getRoleGradient(user.role) }">{{ getRoleText(user.role) }}</span>
                  </div>
                </div>
                <div class="member-badge">
                  <span class="badge-num">{{ getUserTaskCount(user.id) }}</span>
                  <span class="badge-label">待办</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col half">
          <div class="card card-danger">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L4 20H20L12 4Z" stroke="#e74c3c" stroke-width="1.5" fill="none"/>
                <path d="M12 10V14M12 16V16.5" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>待处理缺陷 TOP5</span>
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="bug in urgentBugs" :key="bug.id" class="list-item" @click="$router.push(`/bugs/${bug.id}`)">
                <div class="item-rank" :class="getSeverityClass(bug.severity)">{{ getSeverityShort(bug.severity) }}</div>
                <div class="item-content">
                  <div class="item-title">{{ bug.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ bug.project?.name }}</span>
                    <span><el-icon size="12"><User /></el-icon> {{ bug.assignee?.realName || '未分配' }}</span>
                  </div>
                </div>
                <span class="tag" :class="getBugStatusTagClass(bug.status)">{{ getBugStatusText(bug.status) }}</span>
              </div>
              <div v-if="urgentBugs.length === 0" class="empty">暂无待处理缺陷</div>
            </div>
          </div>
        </div>

        <div class="col half">
          <div class="card card-warning">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#f39c12" stroke-width="1.5" fill="none"/>
                <path d="M12 7V12L15 15" stroke="#f39c12" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>即将到期 TOP5</span>
              <el-button class="btn-link" @click="$router.push('/tasks')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="task in dueSoonTasks" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="item-rank" :class="getDueClass(task.dueDate)">{{ getDueDays(task.dueDate) }}</div>
                <div class="item-content">
                  <div class="item-title">{{ task.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ task.project?.name }}</span>
                    <span><el-icon size="12"><User /></el-icon> {{ task.assignees?.map((a: any) => a.realName).join('、') || '未分配' }}</span>
                  </div>
                </div>
                <span class="tag" :class="getPriorityTagClass(task.priority)">{{ getPriorityText(task.priority) }}</span>
              </div>
              <div v-if="dueSoonTasks.length === 0" class="empty">暂无即将到期任务</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== Project Manager View ==================== -->
    <template v-else-if="userStore.user?.role === 'project_manager'">
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none">
            <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z" fill="#f59e0b"/>
          </svg>
          项目管理面板
        </div>
        <div class="stats-grid">
          <div v-for="stat in pmStats" :key="stat.key" class="stat-card" :class="stat.color" @click="stat.click">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box">
                <el-icon :size="22"><component :is="stat.icon" /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col main">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#667eea" stroke-width="1.5" fill="none"/>
                <path d="M12 6V12L16 14" stroke="#667eea" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>操作历史</span>
              <el-button class="view-all-btn" text @click="viewAllLogs">
                查看全部<el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
            <div class="timeline-list">
              <div v-for="log in recentLogs" :key="log.id" class="timeline-item clickable" @click="goToTarget(log)">
                <div class="timeline-dot" :class="getLogActionClass(log.action)"></div>
                <div class="timeline-content">
                  <div class="timeline-main">
                    <span class="timeline-user">{{ log.user?.realName || '未知' }}</span>
                    <span class="timeline-action" :class="getLogActionClass(log.action)">{{ getLogActionText(log) }}</span>
                    <span class="timeline-target" v-if="log.title">《{{ log.title }}》</span>
                  </div>
                  <div class="timeline-meta">
                    <span class="timeline-time">{{ formatLogTime(log.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="recentLogs.length === 0" class="empty">暂无操作记录</div>
            </div>
          </div>
        </div>

        <div class="col side">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <path d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.76 13 17 10.76 17 8C17 5.24 14.76 3 12 3C9.24 3 7 5.24 7 8C7 10.76 9.24 13 12 13Z" stroke="#667eea" stroke-width="1.5" fill="none"/>
              </svg>
              <span>团队概览</span>
            </div>
            <div class="team-list">
              <div v-for="member in teamMembers" :key="member.id" class="team-member clickable" :class="getRoleBadgeClass(member.role)" @click="router.push({ path: '/tasks', query: { assigneeId: member.id } })">
                <div class="member-accent" :style="{ background: getRoleGradient(member.role) }"></div>
                <div class="member-avatar" :style="{ background: getRoleGradient(member.role) }">
                  <img v-if="member.avatar" :src="member.avatar" class="member-avatar-img" />
                  <span v-else>{{ member.name.charAt(0) }}</span>
                </div>
                <div class="member-info">
                  <div class="member-name">{{ member.name }}
                    <span class="member-role-pill" :style="{ background: getRoleGradient(member.role) }">{{ getRoleText(member.role) }}</span>
                  </div>
                  <div class="member-stats">
                    <span class="stat-item"><span class="stat-dot dot-warning"></span>{{ member.pendingCount }}待处理</span>
                    <span class="stat-item"><span class="stat-dot dot-blue"></span>{{ member.inProgressCount }}进行中</span>
                    <span class="stat-item"><span class="stat-dot dot-success"></span>{{ member.completedCount }}已完成</span>
                    <span class="stat-item"><span class="stat-dot dot-danger"></span>{{ member.openBugCount }}缺陷</span>
                  </div>
                  <div class="member-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :class="member.completionRate >= 60 ? 'fill-success' : member.completionRate >= 30 ? 'fill-warning' : 'fill-danger'" :style="{ width: member.completionRate + '%' }"></div>
                    </div>
                    <span class="progress-text" :class="member.completionRate >= 60 ? 'text-success' : member.completionRate >= 30 ? 'text-warning' : 'text-danger'">{{ member.completionRate }}%</span>
                  </div>
                </div>
                <div class="member-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== Developer View ==================== -->
    <template v-if="userRole === 'developer'">
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none"><path d="M8 6L2 12L8 18M16 6L22 12L16 18" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          开发者工作台
        </div>
        <div class="stats-grid">
          <div v-for="stat in devStats" :key="stat.key" class="stat-card" :class="stat.color" @click="stat.click">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><component :is="stat.icon" /></el-icon></div>
              <div class="stat-content"><div class="stat-value">{{ stat.value }}</div><div class="stat-label">{{ stat.label }}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M8 10H16M8 14H12" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>待办任务</span>
              <el-button class="btn-link" @click="$router.push('/tasks')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="task in myPendingTasks" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="item-priority" :class="getPriorityClass(task.priority)"></div>
                <div class="item-content"><div class="item-title">{{ task.title }}</div><div class="item-meta"><span><el-icon size="12"><Folder /></el-icon> {{ task.project?.name }}</span><span v-if="task.dueDate" :class="{ 'text-danger': isOverdue(task.dueDate) }">{{ getRemainingTime(task.dueDate) }}</span></div></div>
                <span class="tag" :class="getPriorityTagClass(task.priority)">{{ getPriorityText(task.priority) }}</span>
              </div>
              <div v-if="myPendingTasks.length === 0" class="empty">暂无待办任务</div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M12 4L6 10V20H18V10L12 4Z" stroke="#e74c3c" stroke-width="1.5" fill="none"/><path d="M10 14L11 15L14 12" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>待处理缺陷</span>
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="bug in myPendingBugs" :key="bug.id" class="list-item" @click="$router.push(`/bugs/${bug.id}`)">
                <div class="item-priority" :class="getSeverityClass(bug.severity)"></div>
                <div class="item-content"><div class="item-title">{{ bug.title }}</div><div class="item-meta"><span><el-icon size="12"><Folder /></el-icon> {{ bug.project?.name }}</span><span v-if="bug.dueDate" :class="{ 'text-danger': isOverdue(bug.dueDate) }">{{ getRemainingTime(bug.dueDate) }}</span></div></div>
                <span class="tag" :class="getSeverityTagClass(bug.severity)">{{ getSeverityText(bug.severity) }}</span>
              </div>
              <div v-if="myPendingBugs.length === 0" class="empty">暂无待处理缺陷</div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M12 8V12L15 15" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>本周进度</span>
            </div>
            <div class="donut-card">
              <div class="donut-container">
                <svg class="donut-svg" viewBox="0 0 36 36"><circle class="donut-bg" cx="18" cy="18" r="15.5" fill="none" style="stroke: var(--nb-border-light)" stroke-width="3" /><circle class="donut-ring" cx="18" cy="18" r="15.5" fill="none" style="stroke: var(--nb-success)" stroke-width="3" stroke-dasharray="97.4" :stroke-dashoffset="97.4 - (97.4 * taskCompletionRate / 100)" stroke-linecap="round" /></svg>
                <div class="donut-center"><span class="donut-value">{{ completedTasksThisWeek }}</span><span class="donut-label">完成</span></div>
              </div>
              <div class="donut-stats">
                <div class="mini-stat"><span class="mini-num">{{ totalTasksThisWeek }}</span><span>总任务</span></div>
                <div class="mini-stat"><span class="mini-num">{{ taskCompletionRate }}%</span><span>完成率</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card card-warning">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f39c12" stroke-width="1.5" fill="none"/><path d="M12 7V12L15 15" stroke="#f39c12" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>即将到期</span>
            </div>
            <div class="list">
              <div v-for="item in dueSoonItems" :key="item.id" class="list-item" @click="$router.push(`/${item.type}s/${item.id}`)">
                <div class="item-rank" :class="getDueClass(item.dueDate)">{{ getDueDays(item.dueDate) }}</div>
                <div class="item-content"><div class="item-title">{{ item.title }}</div><div class="item-meta"><span class="tag" :class="item.type === 'task' ? 'tag-primary' : 'tag-danger'">{{ item.type === 'task' ? '任务' : '缺陷' }}</span><span><el-icon size="12"><Folder /></el-icon> {{ item.project?.name }}</span></div></div>
              </div>
              <div v-if="dueSoonItems.length === 0" class="empty">暂无即将到期项</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== Designer View ==================== -->
    <template v-else-if="userRole === 'designer'">
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" stroke="#f59e0b" stroke-width="2" fill="none"/><path d="M7 7H17M7 12H17M7 17H13" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg>
          策划工作台
        </div>
        <div class="stats-grid">
          <div v-for="stat in designerStats" :key="stat.key" class="stat-card" :class="stat.color" @click="stat.click">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><component :is="stat.icon" /></el-icon></div>
              <div class="stat-content"><div class="stat-value">{{ stat.value }}</div><div class="stat-label">{{ stat.label }}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M12 4L4 8V16L12 20L20 16V8L12 4Z" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M4 8L12 12M12 20V12M12 12L20 8" stroke="#667eea" stroke-width="1.5"/></svg>
              <span>我创建的任务</span>
              <el-button class="btn-link" @click="$router.push('/tasks')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="task in myCreatedTasks" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="item-priority" :class="getPriorityClass(task.priority)"></div>
                <div class="item-content">
                  <div class="item-title">{{ task.title }}</div>
                  <div class="item-meta">
                    <span class="tag" :class="getStatusTagClass(task.status)">{{ getStatusText(task.status) }}</span>
                    <span><el-icon size="12"><User /></el-icon> {{ task.assignees?.map((a: any) => a.realName).join('、') || '未分配' }}</span>
                  </div>
                </div>
              </div>
              <div v-if="myCreatedTasks.length === 0" class="empty">暂无创建的任务</div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card card-warning">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f39c12" stroke-width="1.5" fill="none"/><path d="M12 8V12L12 12" stroke="#f39c12" stroke-width="2" stroke-linecap="round"/><path d="M8 12H12L12 16" stroke="#f39c12" stroke-width="2" stroke-linecap="round"/></svg>
              <span>待分配任务</span>
              <el-button class="btn-link" @click="$router.push('/tasks')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="task in unassignedTasks" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="item-priority" :class="getPriorityClass(task.priority)"></div>
                <div class="item-content">
                  <div class="item-title">{{ task.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ task.project?.name }}</span>
                    <span v-if="task.dueDate" :class="{ 'text-danger': isOverdue(task.dueDate) }">{{ getRemainingTime(task.dueDate) }}</span>
                  </div>
                </div>
                <span class="tag" :class="getPriorityTagClass(task.priority)">{{ getPriorityText(task.priority) }}</span>
              </div>
              <div v-if="unassignedTasks.length === 0" class="empty">所有任务已分配</div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z" fill="none" stroke="#667eea" stroke-width="1.5"/></svg>
              <span>项目进度</span>
              <el-button class="btn-link" @click="$router.push('/projects')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="project in recentProjects" :key="project.id" class="list-item" @click="$router.push(`/projects/${project.id}`)">
                <div class="item-icon"><el-icon size="18" color="#667eea"><Folder /></el-icon></div>
                <div class="item-content">
                  <div class="item-title">{{ project.name }}</div>
                  <div class="item-meta"><span class="tag" :class="project.status === 'active' ? 'tag-success' : 'tag-default'">{{ project.status === 'active' ? '进行中' : '已完成' }}</span><span>{{ project.manager?.realName || '-' }}</span></div>
                  <div class="progress"><div class="progress-bar"><div class="progress-fill" :style="{ width: getProjectProgress(project) + '%' }"></div></div><span class="health-dot" :class="getHealthColor(getProjectProgress(project))"></span><span class="progress-text">{{ getProjectProgress(project) }}%</span></div>
                </div>
              </div>
              <div v-if="recentProjects.length === 0" class="empty">暂无项目</div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card card-warning">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f39c12" stroke-width="1.5" fill="none"/><path d="M12 7V12L15 15" stroke="#f39c12" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>即将到期</span>
            </div>
            <div class="list">
              <div v-for="item in dueSoonItems" :key="item.id" class="list-item" @click="$router.push(`/${item.type}s/${item.id}`)">
                <div class="item-rank" :class="getDueClass(item.dueDate)">{{ getDueDays(item.dueDate) }}</div>
                <div class="item-content"><div class="item-title">{{ item.title }}</div><div class="item-meta"><span class="tag" :class="item.type === 'task' ? 'tag-primary' : 'tag-danger'">{{ item.type === 'task' ? '任务' : '缺陷' }}</span><span><el-icon size="12"><Folder /></el-icon> {{ item.project?.name }}</span></div></div>
              </div>
              <div v-if="dueSoonItems.length === 0" class="empty">暂无即将到期项</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== Artist View ==================== -->
    <template v-else-if="userRole === 'artist'">
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#f59e0b" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>
          美术工作台
        </div>
        <div class="stats-grid">
          <div v-for="stat in artistStats" :key="stat.key" class="stat-card" :class="stat.color" @click="stat.click">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><component :is="stat.icon" /></el-icon></div>
              <div class="stat-content"><div class="stat-value">{{ stat.value }}</div><div class="stat-label">{{ stat.label }}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M8 10H16M8 14H12" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>待办任务</span>
              <el-button class="btn-link" @click="$router.push('/tasks')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <!-- 按分类分组 -->
              <template v-for="group in tasksByCategory" :key="group.category">
                <div class="category-group-header">
                  <span class="category-tag">{{ group.category }}</span>
                  <span class="category-count">{{ group.items.length }}</span>
                </div>
                <div v-for="task in group.items.slice(0, 5)" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                  <div class="item-priority" :class="getPriorityClass(task.priority)"></div>
                  <div class="item-content">
                    <div class="item-title">{{ task.title }}</div>
                    <div class="item-meta">
                      <span><el-icon size="12"><Folder /></el-icon> {{ task.project?.name }}</span>
                      <span v-if="task.dueDate" :class="{ 'text-danger': isOverdue(task.dueDate) }">{{ getRemainingTime(task.dueDate) }}</span>
                    </div>
                  </div>
                  <span class="tag" :class="getPriorityTagClass(task.priority)">{{ getPriorityText(task.priority) }}</span>
                </div>
              </template>
              <div v-if="tasksByCategory.length === 0" class="empty">暂无待办任务</div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M12 4L6 10V20H18V10L12 4Z" stroke="#e74c3c" stroke-width="1.5" fill="none"/><path d="M10 14L11 15L14 12" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>待处理缺陷</span>
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="bug in myPendingBugs" :key="bug.id" class="list-item" @click="$router.push(`/bugs/${bug.id}`)">
                <div class="item-priority" :class="getSeverityClass(bug.severity)"></div>
                <div class="item-content"><div class="item-title">{{ bug.title }}</div><div class="item-meta"><span><el-icon size="12"><Folder /></el-icon> {{ bug.project?.name }}</span><span v-if="bug.dueDate" :class="{ 'text-danger': isOverdue(bug.dueDate) }">{{ getRemainingTime(bug.dueDate) }}</span></div></div>
                <span class="tag" :class="getSeverityTagClass(bug.severity)">{{ getSeverityText(bug.severity) }}</span>
              </div>
              <div v-if="myPendingBugs.length === 0" class="empty">暂无待处理缺陷</div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M12 8V12L15 15" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>本周进度</span>
            </div>
            <div class="donut-card">
              <div class="donut-container">
                <svg class="donut-svg" viewBox="0 0 36 36"><circle class="donut-bg" cx="18" cy="18" r="15.5" fill="none" style="stroke: var(--nb-border-light)" stroke-width="3" /><circle class="donut-ring" cx="18" cy="18" r="15.5" fill="none" style="stroke: var(--nb-success)" stroke-width="3" stroke-dasharray="97.4" :stroke-dashoffset="97.4 - (97.4 * taskCompletionRate / 100)" stroke-linecap="round" /></svg>
                <div class="donut-center"><span class="donut-value">{{ completedTasksThisWeek }}</span><span class="donut-label">完成</span></div>
              </div>
              <div class="donut-stats">
                <div class="mini-stat"><span class="mini-num">{{ totalTasksThisWeek }}</span><span>总任务</span></div>
                <div class="mini-stat"><span class="mini-num">{{ taskCompletionRate }}%</span><span>完成率</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card card-success">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#22c55e" stroke-width="1.5" fill="none"/><path d="M8 12L11 15L16 9" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>近期完成</span>
            </div>
            <div class="list">
              <div v-for="task in recentlyCompletedTasks" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="item-priority" :class="getPriorityClass(task.priority)"></div>
                <div class="item-content">
                  <div class="item-title">{{ task.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ task.project?.name }}</span>
                    <span class="tag tag-success">已完成</span>
                  </div>
                </div>
              </div>
              <div v-if="recentlyCompletedTasks.length === 0" class="empty">暂无完成记录</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== Tester View ==================== -->
    <template v-else-if="userRole === 'tester'">
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          测试工作台
        </div>
        <div class="stats-grid">
          <div v-for="stat in testerStats" :key="stat.key" class="stat-card" :class="stat.color" @click="stat.click">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><component :is="stat.icon" /></el-icon></div>
              <div class="stat-content"><div class="stat-value">{{ stat.value }}</div><div class="stat-label">{{ stat.label }}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card card-success">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#22c55e" stroke-width="1.5" fill="none"/><path d="M8 12L11 15L16 9" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>待验证缺陷</span>
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="bug in bugsToVerify" :key="bug.id" class="list-item" @click="$router.push(`/bugs/${bug.id}`)">
                <div class="item-priority" :class="getSeverityClass(bug.severity)"></div>
                <div class="item-content">
                  <div class="item-title">{{ bug.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ bug.project?.name }}</span>
                    <span><el-icon size="12"><User /></el-icon> {{ bug.assignee?.realName || '未分配' }}</span>
                  </div>
                </div>
                <span class="tag tag-success">待验证</span>
              </div>
              <div v-if="bugsToVerify.length === 0" class="empty">暂无待验证缺陷</div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M12 4L6 10V20H18V10L12 4Z" stroke="#e74c3c" stroke-width="1.5" fill="none"/><path d="M10 14L11 15L14 12" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>待处理缺陷</span>
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="bug in myPendingBugs" :key="bug.id" class="list-item" @click="$router.push(`/bugs/${bug.id}`)">
                <div class="item-priority" :class="getSeverityClass(bug.severity)"></div>
                <div class="item-content"><div class="item-title">{{ bug.title }}</div><div class="item-meta"><span><el-icon size="12"><Folder /></el-icon> {{ bug.project?.name }}</span><span v-if="bug.dueDate" :class="{ 'text-danger': isOverdue(bug.dueDate) }">{{ getRemainingTime(bug.dueDate) }}</span></div></div>
                <span class="tag" :class="getSeverityTagClass(bug.severity)">{{ getSeverityText(bug.severity) }}</span>
              </div>
              <div v-if="myPendingBugs.length === 0" class="empty">暂无待处理缺陷</div>
            </div>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col half">
          <div class="card card-primary">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M8 12L11 15L16 9" stroke="#667eea" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>已验证通过</span>
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部<svg class="btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></el-button>
            </div>
            <div class="list">
              <div v-for="bug in recentlyVerifiedBugs" :key="bug.id" class="list-item" @click="$router.push(`/bugs/${bug.id}`)">
                <div class="item-priority" :class="getSeverityClass(bug.severity)"></div>
                <div class="item-content">
                  <div class="item-title">{{ bug.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ bug.project?.name }}</span>
                    <span><el-icon size="12"><User /></el-icon> {{ bug.assignee?.realName || '未分配' }}</span>
                  </div>
                </div>
                <span class="tag tag-primary">已验证</span>
              </div>
              <div v-if="recentlyVerifiedBugs.length === 0" class="empty">暂无验证记录</div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card card-warning">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#f39c12" stroke-width="1.5" fill="none"/><path d="M12 7V12L15 15" stroke="#f39c12" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>即将到期</span>
            </div>
            <div class="list">
              <div v-for="item in dueSoonItems" :key="item.id" class="list-item" @click="$router.push(`/${item.type}s/${item.id}`)">
                <div class="item-rank" :class="getDueClass(item.dueDate)">{{ getDueDays(item.dueDate) }}</div>
                <div class="item-content"><div class="item-title">{{ item.title }}</div><div class="item-meta"><span class="tag" :class="item.type === 'task' ? 'tag-primary' : 'tag-danger'">{{ item.type === 'task' ? '任务' : '缺陷' }}</span><span><el-icon size="12"><Folder /></el-icon> {{ item.project?.name }}</span></div></div>
              </div>
              <div v-if="dueSoonItems.length === 0" class="empty">暂无即将到期项</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { getProjects } from '../api/project'
import { getTasks } from '../api/task'
import { getBugs } from '../api/bug'
import { getUsers } from '../api/user'
import { getOperationLogs } from '../api/operationLog'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const allTasks = ref<any[]>([])
const allBugs = ref<any[]>([])
const allProjects = ref<any[]>([])
const allUsers = ref<any[]>([])
const recentLogs = ref<any[]>([])

// ==================== Shared ====================

const today = computed(() => {
  const date = new Date()
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
})

const userId = computed(() => userStore.user?.id)
const userRole = computed(() => userStore.user?.role)

// ==================== Banner ====================

const bannerClass = computed(() => {
  const role = userRole.value
  if (role === 'admin') return 'role-admin'
  if (role === 'project_manager') return 'role-pm'
  return 'role-dev'
})

const bannerSubtitle = computed(() => {
  const role = userRole.value
  if (role === 'admin') return '系统全局概览'
  if (role === 'project_manager') return '项目与团队管理'
  return '个人工作台'
})

// ==================== Quick Quest (role-specific) ====================

const quickQuests = computed(() => {
  const role = userRole.value
  if (role === 'admin') {
    return [
      {
        key: 'projects',
        title: '项目概览',
        desc: `${recentProjects.value.length} 个活跃项目`,
        click: () => router.push('/projects'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#667eea"/></svg>'
      },
      {
        key: 'pending',
        title: '待处理项',
        desc: `${allTasks.value.filter((t: any) => t.status === 'pending').length + allBugs.value.filter((b: any) => b.status === 'pending').length} 个待处理`,
        click: () => router.push('/tasks'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" stroke="#ff6b6b" stroke-width="2.5" fill="none"/><path d="M24 12V24L32 30" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        key: 'team',
        title: '团队管理',
        desc: `${allUsers.value.filter((u: any) => u.role !== 'admin').length} 位成员`,
        click: () => router.push('/users'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="14" r="7" stroke="#43e97b" stroke-width="2.5" fill="none"/><path d="M8 42C8 34.27 15.16 28 24 28C32.84 28 40 34.27 40 42" stroke="#43e97b" stroke-width="2.5" fill="none"/></svg>'
      }
    ]
  }

  if (role === 'project_manager') {
    return [
      {
        key: 'myProjects',
        title: '我的项目',
        desc: `${myProjects.value.length} 个项目`,
        click: () => router.push('/projects'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#667eea"/></svg>'
      },
      {
        key: 'teamPending',
        title: '团队待办',
        desc: `${pmPendingCount.value} 个待处理任务`,
        click: () => router.push('/tasks'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="4" stroke="#f39c12" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28" stroke="#f39c12" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#f39c12"/></svg>'
      },
      {
        key: 'openBugs',
        title: '需关注',
        desc: `${pmOpenBugCount.value} 个未关闭缺陷`,
        click: () => router.push('/bugs'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 8L12 16V32L24 40L36 32V16L24 8Z" stroke="#f5576c" stroke-width="2.5" fill="none"/><path d="M20 24L23 27L28 21" stroke="#f5576c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
    ]
  }

  // All dev roles
  const quests: any[] = [
    {
      key: 'myTasks',
      title: '我的任务',
      desc: `${myPendingTasks.value.length} 个待办任务`,
      click: () => router.push('/tasks'),
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#667eea"/></svg>'
    },
    {
      key: 'myBugs',
      title: '我的缺陷',
      desc: `${myPendingBugs.value.length} 个待处理缺陷`,
      click: () => router.push('/bugs'),
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 8L12 16V32L24 40L36 32V16L24 8Z" stroke="#f5576c" stroke-width="2.5" fill="none"/><path d="M20 24L23 27L28 21" stroke="#f5576c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  ]

  // Tester gets a "to verify" quest
  if (role === 'tester') {
    quests.push({
      key: 'toVerify',
      title: '待验证',
      desc: `${bugsToVerify.value.length} 个待验证缺陷`,
      click: () => router.push('/bugs'),
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" stroke="#27ae60" stroke-width="2.5" fill="none"/><path d="M18 24L22 28L30 19" stroke="#27ae60" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    })
  } else {
    quests.push({
      key: 'dueSoon',
      title: '即将到期',
      desc: `${dueSoonItems.value.length} 个待处理`,
      click: () => router.push('/tasks'),
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" stroke="#f39c12" stroke-width="2.5" fill="none"/><path d="M24 12V24L32 30" stroke="#f39c12" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    })
  }

  return quests
})

// ==================== Shared Data ====================

const myTasks = computed(() => allTasks.value.filter((t: any) => t.assignees?.some((a: any) => a.id === userId.value) || t.creator?.id === userId.value))
const myBugs = computed(() => allBugs.value.filter((b: any) => b.assignee?.id === userId.value || b.reporter?.id === userId.value))
const myPendingTasks = computed(() => myTasks.value.filter((t: any) => t.status !== 'completed' && t.status !== 'closed').sort((a: any, b: any) => {
  const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  return (order[a.priority] || 2) - (order[b.priority] || 2)
}).slice(0, 8))
const myPendingBugs = computed(() => myBugs.value.filter((b: any) => b.status !== 'closed' && b.status !== 'verified' && b.status !== 'fixed').sort((a: any, b: any) => {
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return (order[a.severity] || 2) - (order[b.severity] || 2)
}).slice(0, 8))
const myCreatedTasks = computed(() => allTasks.value.filter((t: any) => t.creator?.id === userId.value).slice(0, 8))
const myReportedBugs = computed(() => allBugs.value.filter((b: any) => b.reporter?.id === userId.value).slice(0, 8))
const bugsToVerify = computed(() => allBugs.value.filter((b: any) => b.status === 'fixed').slice(0, 8))

const recentProjects = computed(() => allProjects.value.filter((p: any) => p.status === 'active').slice(0, 8))
const myProjects = computed(() => allProjects.value.filter((p: any) => p.manager?.id === userId.value))

const urgentBugs = computed(() => allBugs.value.filter((b: any) => b.status === 'pending' || b.status === 'assigned').sort((a: any, b: any) => {
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return (order[a.severity] || 2) - (order[b.severity] || 2)
}).slice(0, 5))

const dueSoonTasks = computed(() => {
  const now = new Date()
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  return allTasks.value
    .filter((t: any) => t.dueDate && new Date(t.dueDate) <= threeDays && t.status !== 'completed' && t.status !== 'closed')
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)
})

const dueSoonItems = computed(() => {
  const now = new Date()
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const items: any[] = []
  allTasks.value.forEach((t: any) => {
    if (t.dueDate && new Date(t.dueDate) <= threeDays && t.status !== 'completed' && t.status !== 'closed') {
      items.push({ ...t, type: 'task' })
    }
  })
  allBugs.value.forEach((b: any) => {
    if (b.dueDate && new Date(b.dueDate) <= threeDays && b.status !== 'closed' && b.status !== 'verified') {
      items.push({ ...b, type: 'bug' })
    }
  })
  return items.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5)
})

const completedTasksThisWeek = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return myTasks.value.filter((t: any) => t.status === 'completed' && new Date(t.updatedAt) >= weekAgo).length
})

const totalTasksThisWeek = computed(() => myTasks.value.length)

const taskCompletionRate = computed(() => {
  if (myTasks.value.length === 0) return 0
  return Math.round((myTasks.value.filter((t: any) => t.status === 'completed' || t.status === 'closed').length / myTasks.value.length) * 100)
})

// ==================== Admin-specific ====================

const adminCompletedThisWeek = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return allTasks.value.filter((t: any) => t.status === 'completed' && new Date(t.updatedAt) >= weekAgo).length
})

const adminStats = computed(() => [
  { key: 'projects', label: '活跃项目', value: allProjects.value.filter((p: any) => p.status === 'active').length, icon: 'Folder', color: 'stat-blue', click: () => router.push('/projects') },
  { key: 'tasks', label: '总任务', value: allTasks.value.length, icon: 'List', color: 'stat-green', click: () => router.push('/tasks') },
  { key: 'bugs', label: '总缺陷', value: allBugs.value.length, icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
  { key: 'users', label: '团队成员', value: allUsers.value.filter((u: any) => u.role !== 'admin').length, icon: 'User', color: 'stat-cyan', click: () => router.push('/users') },
  { key: 'pending', label: '待处理', value: allTasks.value.filter((t: any) => t.status === 'pending').length + allBugs.value.filter((b: any) => b.status === 'pending').length, icon: 'Clock', color: 'stat-red', click: () => router.push('/tasks') },
  { key: 'completed', label: '本周完成', value: adminCompletedThisWeek.value, icon: 'CircleCheck', color: 'stat-purple', click: () => router.push('/tasks') },
])

// ==================== PM-specific ====================

const pmPendingCount = computed(() => {
  const projectIds = myProjects.value.map((p: any) => p.id)
  return allTasks.value.filter((t: any) => projectIds.includes(t.project?.id) && t.status === 'pending').length
})

const pmOpenBugCount = computed(() => {
  const projectIds = myProjects.value.map((p: any) => p.id)
  return allBugs.value.filter((b: any) => projectIds.includes(b.project?.id) && b.status !== 'closed' && b.status !== 'verified').length
})

const pmStats = computed(() => [
  { key: 'myProjects', label: '我的项目', value: myProjects.value.length, icon: 'Folder', color: 'stat-blue', click: () => router.push('/projects') },
  { key: 'tasks', label: '项目任务', value: myProjects.value.reduce((sum: number, p: any) => sum + getProjectTaskCount(p.id), 0), icon: 'List', color: 'stat-green', click: () => router.push('/tasks') },
  { key: 'bugs', label: '项目缺陷', value: myProjects.value.reduce((sum: number, p: any) => sum + getProjectBugCount(p.id), 0), icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
  { key: 'pending', label: '待处理', value: pmPendingCount.value, icon: 'Clock', color: 'stat-red', click: () => router.push('/tasks') },
])

const memberCompletionData = computed(() => {
  const members = allUsers.value.filter((u: any) => u.role !== 'admin')
  return members.map((m: any) => {
    const userTasks = allTasks.value.filter((t: any) => t.assignees?.some((a: any) => a.id === m.id))
    const pendingCount = userTasks.filter((t: any) => t.status === 'pending').length
    const inProgressCount = userTasks.filter((t: any) => t.status === 'in_progress').length
    const completedCount = userTasks.filter((t: any) => t.status === 'completed' || t.status === 'closed').length
    const totalTasks = userTasks.length
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100)
    const openBugCount = allBugs.value.filter((b: any) => b.assignee?.id === m.id && b.status !== 'closed' && b.status !== 'verified').length
    return { id: m.id, name: m.realName, role: m.role, pendingCount, inProgressCount, completedCount, totalTasks, completionRate, openBugCount }
  }).sort((a: any, b: any) => b.completionRate - a.completionRate)
})

// 统一的团队概览数据（合并负载和任务完成情况）
const teamMembers = computed(() => {
  const members = allUsers.value.filter((u: any) => u.role !== 'admin')
  return members.map((m: any) => {
    // 负载数据
    const activeTasks = allTasks.value.filter((t: any) => t.assignees?.some((a: any) => a.id === m.id) && t.status !== 'completed' && t.status !== 'closed')
    const taskCount = activeTasks.length
    
    // 任务完成情况
    const userTasks = allTasks.value.filter((t: any) => t.assignees?.some((a: any) => a.id === m.id))
    const pendingCount = userTasks.filter((t: any) => t.status === 'pending').length
    const inProgressCount = userTasks.filter((t: any) => t.status === 'in_progress').length
    const completedCount = userTasks.filter((t: any) => t.status === 'completed' || t.status === 'closed').length
    const totalTasks = userTasks.length
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100)
    const openBugCount = allBugs.value.filter((b: any) => b.assignee?.id === m.id && b.status !== 'closed' && b.status !== 'verified').length
    
    return { 
      id: m.id, 
      name: m.realName, 
      role: m.role,
      taskCount,
      pendingCount, 
      inProgressCount, 
      completedCount, 
      totalTasks, 
      completionRate, 
      openBugCount 
    }
  }).sort((a: any, b: any) => b.completionRate - a.completionRate)
})

// ==================== Dev Stats (unified) ====================

const devStats = computed(() => [
  { key: 'myTasks', label: '我的任务', value: myTasks.value.filter((t: any) => t.status !== 'completed' && t.status !== 'closed').length, icon: 'List', color: 'stat-blue', click: () => router.push('/tasks') },
  { key: 'myBugs', label: '我的缺陷', value: myBugs.value.filter((b: any) => b.status !== 'closed' && b.status !== 'verified').length, icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
  { key: 'completed', label: '本周完成', value: completedTasksThisWeek.value, icon: 'CircleCheck', color: 'stat-green', click: () => router.push('/tasks') },
  { key: 'rate', label: '完成率', value: taskCompletionRate.value + '%', icon: 'TrendCharts', color: 'stat-purple', click: () => router.push('/tasks') },
])

// ==================== Role-specific Computed ====================

// Designer
const designerStats = computed(() => [
  { key: 'created', label: '我创建的任务', value: myCreatedTasks.value.length, icon: 'Document', color: 'stat-blue', click: () => router.push('/tasks') },
  { key: 'reported', label: '报告的缺陷', value: myReportedBugs.value.length, icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
  { key: 'projects', label: '参与项目', value: myProjects.value.length, icon: 'Folder', color: 'stat-cyan', click: () => router.push('/projects') },
  { key: 'rate', label: '完成率', value: taskCompletionRate.value + '%', icon: 'TrendCharts', color: 'stat-purple', click: () => router.push('/tasks') },
])

const unassignedTasks = computed(() => allTasks.value.filter((t: any) => t.creator?.id === userId.value && (!t.assignees || t.assignees.length === 0)).slice(0, 8))

// Artist
const artistStats = computed(() => [
  { key: 'myTasks', label: '我的任务', value: myTasks.value.filter((t: any) => t.status !== 'completed' && t.status !== 'closed').length, icon: 'List', color: 'stat-blue', click: () => router.push('/tasks') },
  { key: 'pending', label: '待审核', value: myTasks.value.filter((t: any) => t.status === 'pending').length, icon: 'Clock', color: 'stat-orange', click: () => router.push('/tasks') },
  { key: 'completed', label: '已完成', value: myTasks.value.filter((t: any) => t.status === 'completed').length, icon: 'CircleCheck', color: 'stat-green', click: () => router.push('/tasks') },
  { key: 'rate', label: '完成率', value: taskCompletionRate.value + '%', icon: 'TrendCharts', color: 'stat-purple', click: () => router.push('/tasks') },
])

const tasksByCategory = computed(() => {
  const pending = myTasks.value.filter((t: any) => t.status !== 'completed' && t.status !== 'closed')
  const groups: Record<string, any[]> = {}
  pending.forEach((t: any) => {
    const cat = t.category || '未分类'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(t)
  })
  return Object.entries(groups).map(([category, items]) => ({ category, items }))
})

const recentlyCompletedTasks = computed(() => myTasks.value.filter((t: any) => t.status === 'completed').sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 5))

// Tester
const testerVerifiedThisWeek = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return allBugs.value.filter((b: any) => b.assignee?.id === userId.value && b.status === 'verified' && new Date(b.updatedAt) >= weekAgo).length
})

const testerStats = computed(() => [
  { key: 'toVerify', label: '待验证', value: bugsToVerify.value.length, icon: 'CircleCheck', color: 'stat-green', click: () => router.push('/bugs') },
  { key: 'myBugs', label: '待处理缺陷', value: myPendingBugs.value.length, icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
  { key: 'fixed', label: '已修复', value: allBugs.value.filter((b: any) => b.assignee?.id === userId.value && b.status === 'fixed').length, icon: 'Tools', color: 'stat-blue', click: () => router.push('/bugs') },
  { key: 'verified', label: '本周验证', value: testerVerifiedThisWeek.value, icon: 'Select', color: 'stat-purple', click: () => router.push('/bugs') },
])

const recentlyVerifiedBugs = computed(() => allBugs.value.filter((b: any) => b.status === 'verified').sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 5))

// ==================== Shared Utility Functions ====================

const getProjectProgress = (project: any) => {
  const projectTasks = allTasks.value.filter((t: any) => t.project?.id === project.id)
  if (projectTasks.length === 0) return 0
  const completed = projectTasks.filter((t: any) => t.status === 'completed' || t.status === 'closed').length
  return Math.round((completed / projectTasks.length) * 100)
}

const getProjectTaskCount = (projectId: number) => allTasks.value.filter((t: any) => t.project?.id === projectId).length
const getProjectBugCount = (projectId: number) => allBugs.value.filter((b: any) => b.project?.id === projectId).length
const getUserTaskCount = (uid: number) => allTasks.value.filter((t: any) => t.assignees?.some((a: any) => a.id === uid) && t.status !== 'completed' && t.status !== 'closed').length

const getHealthColor = (progress: number) => {
  if (progress >= 60) return 'health-green'
  if (progress >= 30) return 'health-yellow'
  return 'health-red'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = { admin: '管理员', project_manager: '项目经理', developer: '程序', artist: '美术', designer: '策划', tester: '测试' }
  return map[role] || role
}

const getRoleGradient = (role: string) => {
  const map: Record<string, string> = {
    admin: 'var(--nb-gradient-primary)',
    project_manager: 'linear-gradient(135deg, #ec4899, #f59e0b)',
    developer: 'var(--nb-gradient-primary)',
    artist: 'var(--nb-gradient-artist)',
    designer: 'var(--nb-gradient-designer)',
    tester: 'var(--nb-gradient-tester)'
  }
  return map[role] || 'var(--nb-gradient-info)'
}

const getRoleBadgeClass = (role: string) => {
  const map: Record<string, string> = {
    developer: 'badge-dev',
    artist: 'badge-artist',
    designer: 'badge-designer',
    tester: 'badge-tester',
    project_manager: 'badge-pm'
  }
  return map[role] || ''
}

const getPriorityText = (p: string) => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
  return map[p] || p
}

const getStatusText = (s: string) => {
  const map: Record<string, string> = { pending: '待处理', in_progress: '进行中', completed: '已完成', closed: '已关闭' }
  return map[s] || s
}

const getBugStatusText = (s: string) => {
  const map: Record<string, string> = { pending: '待处理', assigned: '已分配', fixing: '修复中', fixed: '已修复', verified: '已验证', closed: '已关闭' }
  return map[s] || s
}

const getSeverityText = (s: string) => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }
  return map[s] || s
}

const getPriorityClass = (p: string) => {
  const map: Record<string, string> = { urgent: 'priority-urgent', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' }
  return map[p] || 'priority-low'
}

const getSeverityClass = (s: string) => {
  const map: Record<string, string> = { critical: 'severity-critical', high: 'severity-high', medium: 'severity-medium', low: 'severity-low' }
  return map[s] || 'severity-low'
}

const getSeverityShort = (s: string) => {
  const map: Record<string, string> = { critical: 'SS', high: 'S', medium: 'A', low: 'B' }
  return map[s] || 'B'
}

const getPriorityTagClass = (p: string) => {
  const map: Record<string, string> = { urgent: 'tag-danger', high: 'tag-warning', medium: 'tag-primary', low: 'tag-default' }
  return map[p] || 'tag-default'
}

const getSeverityTagClass = (s: string) => {
  const map: Record<string, string> = { critical: 'tag-danger', high: 'tag-warning', medium: 'tag-primary', low: 'tag-default' }
  return map[s] || 'tag-default'
}

const getStatusTagClass = (s: string) => {
  const map: Record<string, string> = { pending: 'tag-primary', in_progress: 'tag-warning', completed: 'tag-success', closed: 'tag-default' }
  return map[s] || 'tag-default'
}

const getBugStatusTagClass = (s: string) => {
  const map: Record<string, string> = { pending: 'tag-default', assigned: 'tag-warning', fixing: 'tag-warning', fixed: 'tag-success', verified: 'tag-success', closed: 'tag-default' }
  return map[s] || 'tag-default'
}

const isOverdue = (dueDate: Date | string) => new Date(dueDate).getTime() < new Date().getTime()

const getRemainingTime = (dueDate: Date | string) => {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  if (diffMs <= 0) {
    const days = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
    const hours = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return `超时${days}天${hours}时`
  }
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return `剩余${days}天${hours}时`
}

const getDueClass = (dueDate: Date | string) => {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()
  if (diff < 0) return 'due-overdue'
  if (diff < 24 * 60 * 60 * 1000) return 'due-today'
  if (diff < 3 * 24 * 60 * 60 * 1000) return 'due-soon'
  return 'due-normal'
}

const getDueDays = (dueDate: Date | string) => {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()
  if (diff < 0) return `${Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24))}天`
  if (diff < 24 * 60 * 60 * 1000) return '今天'
  return `${Math.ceil(diff / (1000 * 60 * 60 * 24))}天`
}

// ==================== Operation Log Helpers ====================

const statusTextMap: Record<string, string> = {
  pending: '待处理', in_progress: '进行中', completed: '已完成', closed: '已关闭',
  assigned: '已分配', fixing: '修复中', fixed: '已修复', verified: '已验证'
}
const priorityTextMap: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
const severityTextMap: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }

const formatLogTargetTime = (timeStr: string | Date | null | undefined) => {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

const getLogActionText = (log: any) => {
  const { action } = log
  switch (action) {
    case 'create':
      return log.targetType === 'task' ? '创建了任务' : '创建了缺陷'
    case 'status_change': {
      let text = `将状态从「${statusTextMap[log.oldStatus] || log.oldStatus || '待处理'}」变更为「${statusTextMap[log.newStatus] || log.newStatus}」`
      if (log.oldAssignee && log.newAssignee && log.oldAssignee !== log.newAssignee) {
        text += `，负责人从「${log.oldAssignee}」变更为「${log.newAssignee}」`
      } else if (log.newAssignee) {
        text += `，负责人变更为「${log.newAssignee}」`
      }
      return text
    }
    case 'assign':
      return `将负责人从「${log.oldAssignee || '未分配'}」变更为「${log.newAssignee}」`
    case 'priority_change':
      return `将优先级从「${priorityTextMap[log.oldPriority] || log.oldPriority || '中'}」调整为「${priorityTextMap[log.newPriority] || log.newPriority}」`
    case 'severity_change':
      return `将严重程度从「${severityTextMap[log.oldSeverity] || log.oldSeverity || '中'}」调整为「${severityTextMap[log.newSeverity] || log.newSeverity}」`
    case 'due_date_change':
    case 'extend_due_date':
      return `将截止日期从「${formatLogTargetTime(log.oldDueDate)}」延期至「${formatLogTargetTime(log.newDueDate)}」`
    case 'complete': {
      let text = log.targetType === 'task' ? '完成了任务' : '完成了缺陷'
      if (log.oldAssignee && log.newAssignee && log.oldAssignee !== log.newAssignee) {
        text += `，负责人从「${log.oldAssignee}」变更为「${log.newAssignee}」`
      }
      return text
    }
    case 'close':
      return log.targetType === 'task' ? '关闭了任务' : '关闭了缺陷'
    case 'comment':
      return '添加了备注'
    case 'reopen':
      return log.targetType === 'task' ? '重新打开了任务' : '重新打开了缺陷'
    default:
      return action
  }
}

const getLogActionClass = (action: string) => {
  if (action === 'create') return 'log-create'
  if (action === 'comment') return 'log-comment'
  if (action === 'status_change') return 'log-status'
  if (action === 'assign') return 'log-assign'
  if (action === 'priority_change') return 'log-priority'
  if (action === 'severity_change') return 'log-severity'
  return 'log-default'
}

const formatLogTime = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '未知时间'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '未知时间'
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

const goToTarget = (log: any) => {
  if (log.targetType === 'task') {
    router.push(`/tasks/${log.targetId}`)
  } else if (log.targetType === 'bug') {
    router.push(`/bugs/${log.targetId}`)
  }
}

const viewAllLogs = () => {
  router.push('/operation-logs')
}

// ==================== Data Loading ====================

onMounted(async () => {
  try {
    const [projectsRes, tasksRes, bugsRes, usersRes, logsRes] = await Promise.all([
      getProjects(), getTasks(), getBugs(), getUsers(), getOperationLogs({ limit: 10 })
    ])
    // 处理响应数据 - API 返回格式为 { data: [...] }，axios 响应在 res.data 中
    allProjects.value = projectsRes.data?.data || projectsRes.data || []
    allTasks.value = tasksRes.data?.data || tasksRes.data || []
    allBugs.value = bugsRes.data?.data || bugsRes.data || []
    allUsers.value = usersRes.data?.data || usersRes.data || []
    recentLogs.value = logsRes.data?.data || logsRes.data || []
    console.log('Recent logs loaded:', recentLogs.value)
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
})
</script>

<style scoped>
.dashboard {
  padding: 0;
  background: transparent;
  min-height: 100%;
  font-family: var(--nb-font-family);
}

/* Stagger entry animations */
.quick-quests {
  animation: fadeInUp 0.4s ease both;
}

.section {
  margin-bottom: var(--nb-space-6);
  animation: fadeInUp 0.5s ease 0.1s both;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--nb-space-5);
  margin-bottom: var(--nb-space-5);
  animation: fadeInUp 0.5s ease 0.2s both;
}

.row:nth-of-type(2) { animation-delay: 0.25s; }
.row:nth-of-type(3) { animation-delay: 0.3s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ==================== Banner ==================== */
.banner {
  position: relative;
  margin-bottom: var(--nb-space-6);
  border-radius: var(--nb-radius-xl);
  overflow: hidden;
  background: var(--nb-gradient-banner);
  color: white;
  animation: fadeInUp 0.4s ease both;
}

.banner.role-admin { background: var(--nb-gradient-banner-admin); }
.banner.role-pm { background: var(--nb-gradient-banner-pm); }
.banner.role-dev { background: var(--nb-gradient-banner-dev); }

.banner-bg-pattern {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.floating-icon {
  position: absolute;
  opacity: 0.6;
  animation: float 6s ease-in-out infinite;
  filter: blur(0.5px);
}

.float-1 { top: 10%; left: 5%; width: 48px; height: 48px; animation-delay: 0s; animation-duration: 6s; }
.float-2 { top: 60%; left: 15%; width: 36px; height: 36px; animation-delay: 0.8s; animation-duration: 8s; opacity: 0.4; }
.float-3 { top: 20%; right: 25%; width: 40px; height: 40px; animation-delay: 2s; animation-duration: 5.5s; }
.float-4 { top: 65%; right: 10%; width: 32px; height: 32px; animation-delay: 3.5s; animation-duration: 7s; opacity: 0.35; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(5deg); }
}

.banner-content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nb-space-8) var(--nb-space-8);
}

.banner-left {
  display: flex;
  align-items: center;
  gap: var(--nb-space-5);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--nb-radius-full);
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--nb-font-size-2xl);
  font-weight: var(--nb-font-weight-semibold);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.4);
  animation: avatarPulse 3s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

@keyframes avatarPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.4); }
  50% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.3); border-color: rgba(255, 255, 255, 0.7); }
}

.welcome-text h2 {
  font-size: var(--nb-font-size-xl);
  font-weight: var(--nb-font-weight-semibold);
  margin: 0 0 6px 0;
  letter-spacing: 0.3px;
}

.date {
  font-size: var(--nb-font-size-sm);
  opacity: 0.85;
}

.banner-subtitle {
  font-size: var(--nb-font-size-xs);
  opacity: 0.7;
  margin-top: 2px;
  letter-spacing: 1px;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: var(--nb-space-4);
}

.hero-image {
  width: 80px;
  height: 80px;
  border-radius: var(--nb-radius-lg);
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  animation: heroFloat 3s ease-in-out infinite;
}

.hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@keyframes heroFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.role-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px var(--nb-space-4);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: var(--nb-radius-full);
  font-size: var(--nb-font-size-sm);
  font-weight: var(--nb-font-weight-medium);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all var(--nb-transition-normal);
}

.role-badge:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.badge-star {
  width: 14px;
  height: 14px;
  fill: #ffd700;
}

/* ==================== Quick Quests ==================== */
.quick-quests {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--nb-space-4);
  margin-bottom: var(--nb-space-6);
}

.quest-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: var(--nb-space-4) var(--nb-space-5);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  border-radius: var(--nb-radius-lg);
  border: 1px solid var(--nb-border-light);
  cursor: pointer;
  transition: all var(--nb-transition-normal);
  position: relative;
  overflow: hidden;
}

.quest-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--nb-gradient-primary);
  opacity: 0;
  transition: opacity var(--nb-transition-normal);
}

.quest-card:hover::after {
  opacity: 1;
}

.quest-card:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 24px rgba(91, 109, 239, 0.18);
  border-color: var(--nb-primary-lighter);
}

.quest-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  background: var(--nb-primary-lighter);
  border-radius: var(--nb-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--nb-transition-normal);
}

.quest-card:hover .quest-icon {
  background: var(--nb-primary-lighter);
  transform: scale(1.08);
}

.quest-icon :deep(svg) {
  width: 28px;
  height: 28px;
}

.quest-info {
  flex: 1;
  min-width: 0;
}

.quest-title {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin-bottom: 2px;
}

.quest-desc {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.quest-arrow {
  font-size: var(--nb-font-size-xl);
  color: var(--nb-text-secondary);
  transition: all var(--nb-transition-fast);
}

.quest-card:hover .quest-arrow {
  color: var(--nb-primary);
  transform: translateX(4px);
}

/* ==================== Section ==================== */
.section {
  margin-bottom: var(--nb-space-6);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin-bottom: var(--nb-space-4);
  padding-left: 2px;
}

.section-icon {
  width: 22px;
  height: 22px;
}

/* ==================== Stats Grid ==================== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--nb-space-4);
}

.stat-card {
  position: relative;
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--nb-transition-normal);
  border: 1px solid var(--nb-border-light);
}

.stat-card:hover {
  transform: translateY(-4px) scale(1.03);
  box-shadow: var(--nb-shadow-lg);
  border-color: var(--nb-primary-lighter);
}

.stat-accent {
  height: 4px;
  width: 100%;
  transition: height var(--nb-transition-fast);
}

.stat-card:hover .stat-accent {
  height: 4px;
}

.stat-blue .stat-accent { background: var(--nb-gradient-primary); }
.stat-green .stat-accent { background: var(--nb-gradient-success); }
.stat-orange .stat-accent { background: var(--nb-gradient-warning); }
.stat-purple .stat-accent { background: linear-gradient(90deg, #a78bfa, #c4b5fd); }
.stat-cyan .stat-accent { background: linear-gradient(90deg, #22d3ee, #818cf8); }
.stat-red .stat-accent { background: var(--nb-gradient-danger); }

.stat-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px var(--nb-space-5);
}

.stat-icon-box {
  width: 44px;
  height: 44px;
  border-radius: var(--nb-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-blue .stat-icon-box { background: var(--nb-gradient-primary); }
.stat-green .stat-icon-box { background: var(--nb-gradient-success); }
.stat-orange .stat-icon-box { background: var(--nb-gradient-warning); }
.stat-purple .stat-icon-box { background: linear-gradient(135deg, #a78bfa, #c4b5fd); }
.stat-cyan .stat-icon-box { background: linear-gradient(135deg, #22d3ee, #818cf8); }
.stat-red .stat-icon-box { background: var(--nb-gradient-danger); }

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: var(--nb-font-weight-bold);
  color: var(--nb-text-primary);
  margin-bottom: 2px;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.stat-label {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

/* ==================== Row Layout ==================== */
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--nb-space-5);
  margin-bottom: var(--nb-space-5);
}

.row:has(.col.main) {
  grid-template-columns: 2fr 1fr;
}

.row:has(.col.full) {
  grid-template-columns: 1fr;
}

.col.half {
  grid-column: span 1;
}

.col.full {
  grid-column: 1 / -1;
}

/* ==================== Card ==================== */
.card {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  border: 1px solid var(--nb-border-light);
  overflow: hidden;
  transition: box-shadow var(--nb-transition-normal);
}

.card:hover {
  box-shadow: var(--nb-shadow-sm);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  padding: var(--nb-space-4) var(--nb-space-5);
  border-bottom: 1px solid var(--nb-border-light);
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
}

.card-icon-svg {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  padding: 4px;
  background: var(--nb-primary-lighter);
  border-radius: var(--nb-radius-sm);
}

.card-header .btn-link {
  margin-left: auto;
}

.card-danger .card-header {
  color: var(--nb-danger);
}

.card-warning .card-header {
  color: var(--nb-warning);
}

.card-success .card-header {
  color: var(--nb-success);
}

.card-primary .card-header {
  color: var(--nb-primary);
}

/* ==================== Category Group (Artist) ==================== */
.category-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 4px;
  margin-top: 4px;
}

.category-tag {
  font-size: var(--nb-font-size-sm);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-regular);
  background: var(--nb-primary-lighter);
  padding: 2px 10px;
  border-radius: var(--nb-radius-full);
}

.category-count {
  font-size: var(--nb-font-size-xs);
  color: var(--nb-text-secondary);
  background: var(--nb-bg-card);
  padding: 0 6px;
  border-radius: var(--nb-radius-full);
  min-width: 18px;
  text-align: center;
}

/* ==================== Button Link ==================== */
.btn-link {
  padding: var(--nb-space-1) var(--nb-space-3);
  font-size: var(--nb-font-size-sm);
  color: var(--nb-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--nb-transition-fast);
  border-radius: var(--nb-radius-sm);
}

.btn-link:hover {
  background: var(--nb-primary-lighter);
  color: var(--nb-primary-dark);
}

.btn-arrow {
  vertical-align: middle;
  margin-left: 2px;
  transition: transform var(--nb-transition-fast);
}

.btn-link:hover .btn-arrow {
  transform: translateX(3px);
}

.view-all-btn {
  margin-left: auto;
}

/* ==================== Timeline ==================== */
.list {
  padding: var(--nb-space-3);
}

.list-item {
  display: flex;
  align-items: center;
  gap: var(--nb-space-3);
  padding: var(--nb-space-3) 14px;
  margin-bottom: 6px;
  background: var(--nb-bg-muted);
  border-radius: 10px;
  cursor: pointer;
  transition: all var(--nb-transition-fast);
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}

.list-item:hover {
  background: var(--nb-primary-lighter);
  border-color: var(--nb-primary-lighter);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(91, 109, 239, 0.1);
}

.list-item:last-child {
  margin-bottom: 0;
}

.item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--nb-bg-card);
  border-radius: 10px;
  font-size: var(--nb-font-size-lg);
  box-shadow: var(--nb-shadow-xs);
}

.item-rank {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--nb-font-size-xs);
  font-weight: var(--nb-font-weight-bold);
  color: white;
  border-radius: 10px;
}

.due-overdue { background: var(--nb-gradient-danger); }
.due-today { background: var(--nb-gradient-warning); }
.due-soon { background: var(--nb-gradient-primary); }
.due-normal { background: var(--nb-gradient-info); }

.severity-critical { background: var(--nb-gradient-danger); }
.severity-high { background: var(--nb-gradient-warning); }
.severity-medium { background: var(--nb-gradient-primary); }
.severity-low { background: var(--nb-gradient-info); }

.item-priority {
  width: 5px;
  height: 44px;
  border-radius: 3px;
  flex-shrink: 0;
}

.list-item:hover .item-priority {
  width: 6px;
}

.priority-urgent { background: var(--nb-danger); }
.priority-high { background: var(--nb-warning); }
.priority-medium { background: var(--nb-primary); }
.priority-low { background: var(--nb-info); }

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  gap: var(--nb-space-3);
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.text-danger {
  color: var(--nb-danger);
}

.text-warning {
  color: var(--nb-warning);
}

.text-blue {
  color: var(--nb-primary);
}

.text-success {
  color: var(--nb-success);
}

/* ==================== Timeline List ==================== */
.timeline-list {
  padding: 4px 0;
  max-height: 420px;
  overflow-y: auto;
}
.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--nb-radius-md);
  transition: background 0.2s;
}
.timeline-item.clickable {
  cursor: pointer;
}
.timeline-item:hover {
  background: var(--nb-bg-hover);
}
.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0;
}
.timeline-dot.log-create { background: var(--nb-success); }
.timeline-dot.log-comment { background: var(--nb-primary); }
.timeline-dot.log-status { background: #f59e0b; }
.timeline-dot.log-assign { background: #8b5cf6; }
.timeline-dot.log-priority { background: #3b82f6; }
.timeline-dot.log-severity { background: var(--nb-danger); }
.timeline-dot.log-default { background: var(--nb-text-tertiary); }
.timeline-content {
  flex: 1;
  min-width: 0;
}
.timeline-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: var(--nb-font-size-base);
}
.timeline-user {
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
}
.timeline-action {
  color: var(--nb-text-secondary);
  font-size: 13px;
}
.timeline-action.log-status { color: #d97706; }
.timeline-action.log-assign { color: #7c3aed; }
.timeline-action.log-priority { color: #2563eb; }
.timeline-action.log-severity { color: var(--nb-danger); }
.timeline-target {
  color: var(--nb-primary);
  font-size: 12px;
  font-weight: var(--nb-font-weight-medium);
  margin-left: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.timeline-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--nb-text-tertiary);
}
.timeline-type {
  font-size: 11px;
  padding: 1px 6px;
}
.timeline-time {
  font-size: 11px;
}

/* ==================== Tag ==================== */
.tag {
  padding: var(--nb-tag-padding);
  font-size: var(--nb-tag-font-size);
  font-weight: var(--nb-font-weight-medium);
  border-radius: var(--nb-radius-full);
  white-space: nowrap;
}

.tag-primary { background: var(--nb-primary-lighter); color: var(--nb-primary); }
.tag-success { background: var(--nb-success-light); color: var(--nb-success-dark); }
.tag-warning { background: var(--nb-warning-light); color: var(--nb-warning-dark); }
.tag-danger { background: var(--nb-danger-light); color: var(--nb-danger-dark); }
.tag-default { background: var(--nb-bg-muted); color: var(--nb-info); }

/* ==================== Progress ==================== */
.progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: var(--nb-space-2);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--nb-border-light);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--nb-gradient-primary);
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { left: -50%; }
  100% { left: 150%; }
}

.progress-fill.fill-danger {
  background: var(--nb-gradient-danger);
}

.progress-fill.fill-warning {
  background: var(--nb-gradient-warning);
}

.progress-fill.fill-success {
  background: var(--nb-gradient-success);
}

.progress-text {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-info);
  min-width: 36px;
  text-align: right;
  font-weight: var(--nb-font-weight-medium);
}

/* ==================== Health Dot ==================== */
.health-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--nb-radius-full);
  flex-shrink: 0;
}

.health-green {
  background: var(--nb-success);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.health-yellow {
  background: var(--nb-warning);
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.health-red {
  background: var(--nb-danger);
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

/* ==================== Project Stats Row ==================== */
.project-stats-row {
  display: flex;
  gap: var(--nb-space-5);
  margin-top: var(--nb-space-2);
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mini-num {
  font-size: var(--nb-font-size-lg);
  color: var(--nb-primary);
  font-weight: var(--nb-font-weight-bold);
}

.mini-stat span:last-child {
  font-size: var(--nb-font-size-xs);
  color: var(--nb-text-secondary);
}

/* ==================== Team List ==================== */
.team-list {
  padding: var(--nb-space-3);
}

.team-member {
  display: flex;
  align-items: center;
  gap: var(--nb-space-3);
  padding: 10px 14px;
  margin-bottom: 8px;
  background: var(--nb-bg-muted);
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all var(--nb-transition-fast);
  position: relative;
  overflow: hidden;
}

.team-member:hover {
  background: var(--nb-primary-lighter);
  border-color: var(--nb-primary-lighter);
}

.team-member:last-child {
  margin-bottom: 0;
}

.team-member.clickable {
  cursor: pointer;
}

.team-member.clickable:hover {
  transform: translateX(4px);
}

.member-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  opacity: 0.4;
  transition: opacity var(--nb-transition-fast);
}

.team-member:hover .member-accent {
  opacity: 1;
}

.member-arrow {
  width: 20px;
  height: 20px;
  color: var(--nb-text-tertiary);
  flex-shrink: 0;
  transition: all var(--nb-transition-fast);
  opacity: 0;
}

.team-member.clickable:hover .member-arrow {
  opacity: 1;
  color: var(--nb-primary);
  transform: translateX(3px);
}

.member-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--nb-gradient-primary);
  border-radius: var(--nb-radius-full);
  font-size: var(--nb-font-size-sm);
  color: white;
  font-weight: var(--nb-font-weight-semibold);
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(91, 109, 239, 0.25);
  overflow: hidden;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: var(--nb-font-size-sm);
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-role-pill {
  display: inline-block;
  font-size: 10px;
  font-weight: var(--nb-font-weight-medium);
  color: white;
  padding: 1px 8px;
  border-radius: var(--nb-radius-full);
  line-height: 16px;
}

.member-stats {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.stat-item {
  font-size: 11px;
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-regular);
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--nb-radius-full);
  flex-shrink: 0;
}

.dot-warning { background: var(--nb-warning); }
.dot-blue { background: var(--nb-primary); }
.dot-success { background: var(--nb-success); }
.dot-danger { background: var(--nb-danger); }

.member-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.member-progress .progress-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--nb-border-light);
}

.member-progress .progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

.member-progress .progress-fill::after {
  display: none;
}

.progress-text {
  font-size: 11px;
  font-weight: var(--nb-font-weight-semibold);
  min-width: 35px;
  text-align: right;
}

/* ==================== Member Completion Grid (PM view) ==================== */
.member-completion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: var(--nb-space-3);
}

.member-completion-card {
  display: flex;
  align-items: center;
  gap: var(--nb-space-4);
  padding: var(--nb-space-4) var(--nb-space-5);
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  border: 1px solid var(--nb-border-light);
  transition: all var(--nb-transition-fast);
}

.member-completion-card:hover {
  box-shadow: var(--nb-shadow-sm);
  border-color: var(--nb-primary-lighter);
}

.mcc-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 80px;
}

.mcc-left .member-avatar {
  width: 32px;
  height: 32px;
  font-size: var(--nb-font-size-sm);
}

.mcc-info {
  min-width: 0;
}

.mcc-name {
  font-size: var(--nb-font-size-sm);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mcc-role {
  font-size: var(--nb-font-size-xs);
  color: var(--nb-text-secondary);
}

.mcc-stats {
  display: flex;
  gap: var(--nb-space-4);
  flex: 1;
  justify-content: center;
}

.mcc-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mcc-stat-num {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-bold);
}

.mcc-stat-label {
  font-size: 10px;
  color: var(--nb-text-secondary);
}

.mcc-rate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nb-space-1);
  min-width: 70px;
}

.mcc-rate-bar {
  width: 100%;
}

.mcc-rate-bar .progress-bar {
  height: 5px;
}

.mcc-rate-num {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-bold);
}

/* ==================== Donut Chart ==================== */
.donut-card {
  padding: var(--nb-space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.donut-container {
  position: relative;
  width: 120px;
  height: 120px;
}

.donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-bg {
  stroke: var(--nb-border-light);
}

.donut-ring {
  transition: stroke-dashoffset 0.5s ease;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.donut-value {
  font-size: var(--nb-font-size-2xl);
  font-weight: var(--nb-font-weight-bold);
  color: var(--nb-text-primary);
}

.donut-label {
  font-size: var(--nb-font-size-xs);
  color: var(--nb-text-secondary);
}

.donut-stats {
  display: flex;
  gap: 32px;
  margin-top: var(--nb-space-5);
}

/* ==================== Role Extra ==================== */
.role-extra-row {
  margin-bottom: var(--nb-space-5);
}

/* ==================== Empty State ==================== */
.empty {
  text-align: center;
  padding: var(--nb-space-8) var(--nb-space-4);
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
  background: var(--nb-bg-muted);
  border-radius: 10px;
  border: 1px dashed var(--nb-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nb-space-3);
}

.empty-icon {
  width: 48px;
  height: 48px;
  opacity: 0.4;
}

/* ==================== Responsive ==================== */
@media (max-width: 768px) {
  .row {
    grid-template-columns: 1fr;
  }

  .row:has(.col.main) {
    grid-template-columns: 1fr;
  }

  .row:has(.col.full) {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-quests {
    grid-template-columns: 1fr;
  }

  .member-completion-grid {
    grid-template-columns: 1fr;
  }

  .welcome-text h2 {
    font-size: var(--nb-font-size-lg);
  }

  .banner-content {
    padding: var(--nb-space-5);
  }

  .hero-image {
    width: 60px;
    height: 60px;
  }
}
</style>
