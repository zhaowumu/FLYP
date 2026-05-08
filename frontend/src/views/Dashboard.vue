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
            <span>{{ userStore.user?.realName?.charAt(0) || 'U' }}</span>
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
        <div class="quest-arrow">→</div>
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
              <el-button class="btn-link" @click="$router.push('/projects')">查看全部 →</el-button>
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
                <div class="member-avatar">{{ user.realName?.charAt(0) }}</div>
                <div class="member-info">
                  <div class="member-name">{{ user.realName }}</div>
                  <div class="member-role">{{ getRoleText(user.role) }}</div>
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
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部 →</el-button>
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
              <el-button class="btn-link" @click="$router.push('/tasks')">查看全部 →</el-button>
            </div>
            <div class="list">
              <div v-for="task in dueSoonTasks" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="item-rank" :class="getDueClass(task.dueDate)">{{ getDueDays(task.dueDate) }}</div>
                <div class="item-content">
                  <div class="item-title">{{ task.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ task.project?.name }}</span>
                    <span><el-icon size="12"><User /></el-icon> {{ task.assignee?.realName || '未分配' }}</span>
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
                <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z" stroke="#667eea" stroke-width="1.5" fill="none"/>
              </svg>
              <span>我管理的项目</span>
            </div>
            <div class="list">
              <div v-for="project in myProjects" :key="project.id" class="list-item project-item" @click="$router.push(`/projects/${project.id}`)">
                <div class="item-icon"><el-icon size="18" color="#667eea"><Folder /></el-icon></div>
                <div class="item-content">
                  <div class="item-title">{{ project.name }}</div>
                  <div class="item-meta">
                    <span class="tag" :class="project.status === 'active' ? 'tag-success' : 'tag-default'">
                      {{ project.status === 'active' ? '进行中' : '已完成' }}
                    </span>
                  </div>
                  <div class="project-stats-row">
                    <div class="mini-stat">
                      <span class="mini-num">{{ getProjectTaskCount(project.id) }}</span>
                      <span>任务</span>
                    </div>
                    <div class="mini-stat">
                      <span class="mini-num">{{ getProjectBugCount(project.id) }}</span>
                      <span>缺陷</span>
                    </div>
                    <div class="mini-stat">
                      <span class="mini-num">{{ getProjectProgress(project) }}%</span>
                      <span>进度</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="myProjects.length === 0" class="empty">暂无管理的项目</div>
            </div>
          </div>
        </div>

        <div class="col side">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <path d="M12 20V4M12 4L8 8M12 4L16 8" stroke="#667eea" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>成员负载</span>
            </div>
            <div class="team-list">
              <div v-for="member in teamWorkload" :key="member.id" class="team-member">
                <div class="member-avatar">{{ member.name.charAt(0) }}</div>
                <div class="member-info">
                  <div class="member-name">{{ member.name }}</div>
                  <div class="progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :class="member.load > 80 ? 'fill-danger' : member.load > 50 ? 'fill-warning' : 'fill-success'" :style="{ width: member.load + '%' }"></div>
                    </div>
                  </div>
                </div>
                <div class="member-badge">
                  <span class="badge-num">{{ member.taskCount }}</span>
                  <span class="badge-label">项</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Member Task Completion (NEW) -->
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none">
            <path d="M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.76 13 17 10.76 17 8C17 5.24 14.76 3 12 3C9.24 3 7 5.24 7 8C7 10.76 9.24 13 12 13Z" stroke="#f59e0b" stroke-width="1.5" fill="none"/>
            <path d="M20 8V14M23 11H17" stroke="#43e97b" stroke-width="2" stroke-linecap="round"/>
          </svg>
          成员任务完成情况
        </div>
        <div class="member-completion-grid">
          <div v-for="member in memberCompletionData" :key="member.id" class="member-completion-card">
            <div class="mcc-left">
              <div class="member-avatar">{{ member.name.charAt(0) }}</div>
              <div class="mcc-info">
                <div class="mcc-name">{{ member.name }}</div>
                <div class="mcc-role">{{ getRoleText(member.role) }}</div>
              </div>
            </div>
            <div class="mcc-stats">
              <div class="mcc-stat">
                <span class="mcc-stat-num text-warning">{{ member.pendingCount }}</span>
                <span class="mcc-stat-label">待处理</span>
              </div>
              <div class="mcc-stat">
                <span class="mcc-stat-num text-blue">{{ member.inProgressCount }}</span>
                <span class="mcc-stat-label">进行中</span>
              </div>
              <div class="mcc-stat">
                <span class="mcc-stat-num text-success">{{ member.completedCount }}</span>
                <span class="mcc-stat-label">已完成</span>
              </div>
              <div class="mcc-stat">
                <span class="mcc-stat-num text-danger">{{ member.openBugCount }}</span>
                <span class="mcc-stat-label">待修缺陷</span>
              </div>
            </div>
            <div class="mcc-rate">
              <div class="mcc-rate-bar">
                <div class="progress-bar">
                  <div class="progress-fill fill-success" :style="{ width: member.completionRate + '%' }"></div>
                </div>
              </div>
              <span class="mcc-rate-num" :class="member.completionRate >= 60 ? 'text-success' : member.completionRate >= 30 ? 'text-warning' : 'text-danger'">{{ member.completionRate }}%</span>
            </div>
          </div>
          <div v-if="memberCompletionData.length === 0" class="empty">暂无团队成员数据</div>
        </div>
      </div>
    </template>

    <!-- ==================== Unified Dev View ==================== -->
    <template v-else>
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none">
            <path d="M8 6L2 12L8 18M16 6L22 12L16 18" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          个人工作台
        </div>
        <div class="stats-grid">
          <div v-for="stat in devStats" :key="stat.key" class="stat-card" :class="stat.color" @click="stat.click">
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
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="#667eea" stroke-width="1.5" fill="none"/>
                <path d="M8 10H16M8 14H12" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>待办任务</span>
              <el-button class="btn-link" @click="$router.push('/tasks')">查看全部 →</el-button>
            </div>
            <div class="list">
              <div v-for="task in myPendingTasks" :key="task.id" class="list-item" @click="$router.push(`/tasks/${task.id}`)">
                <div class="item-priority" :class="getPriorityClass(task.priority)"></div>
                <div class="item-content">
                  <div class="item-title">{{ task.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ task.project?.name }}</span>
                    <span v-if="task.dueDate" :class="{ 'text-danger': isOverdue(task.dueDate) }">
                      {{ getRemainingTime(task.dueDate) }}
                    </span>
                  </div>
                </div>
                <span class="tag" :class="getPriorityTagClass(task.priority)">{{ getPriorityText(task.priority) }}</span>
              </div>
              <div v-if="myPendingTasks.length === 0" class="empty">暂无待办任务</div>
            </div>
          </div>
        </div>

        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L6 10V20H18V10L12 4Z" stroke="#e74c3c" stroke-width="1.5" fill="none"/>
                <path d="M10 14L11 15L14 12" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>待处理缺陷</span>
              <el-button class="btn-link" @click="$router.push('/bugs')">查看全部 →</el-button>
            </div>
            <div class="list">
              <div v-for="bug in myPendingBugs" :key="bug.id" class="list-item" @click="$router.push(`/bugs/${bug.id}`)">
                <div class="item-priority" :class="getSeverityClass(bug.severity)"></div>
                <div class="item-content">
                  <div class="item-title">{{ bug.title }}</div>
                  <div class="item-meta">
                    <span><el-icon size="12"><Folder /></el-icon> {{ bug.project?.name }}</span>
                    <span v-if="bug.dueDate" :class="{ 'text-danger': isOverdue(bug.dueDate) }">
                      {{ getRemainingTime(bug.dueDate) }}
                    </span>
                  </div>
                </div>
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
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#667eea" stroke-width="1.5" fill="none"/>
                <path d="M12 8V12L15 15" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>本周进度</span>
            </div>
            <div class="donut-card">
              <div class="donut-container">
                <svg class="donut-svg" viewBox="0 0 36 36">
                  <circle class="donut-bg" cx="18" cy="18" r="15.5" fill="none" stroke="#f0f0f0" stroke-width="3" />
                  <circle class="donut-ring" cx="18" cy="18" r="15.5" fill="none" stroke="#67c23a" stroke-width="3" stroke-dasharray="97.4" :stroke-dashoffset="97.4 - (97.4 * taskCompletionRate / 100)" stroke-linecap="round" />
                </svg>
                <div class="donut-center">
                  <span class="donut-value">{{ completedTasksThisWeek }}</span>
                  <span class="donut-label">完成</span>
                </div>
              </div>
              <div class="donut-stats">
                <div class="mini-stat">
                  <span class="mini-num">{{ totalTasksThisWeek }}</span>
                  <span>总任务</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-num">{{ taskCompletionRate }}%</span>
                  <span>完成率</span>
                </div>
              </div>
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
              <span>即将到期</span>
            </div>
            <div class="list">
              <div v-for="item in dueSoonItems" :key="item.id" class="list-item" @click="$router.push(`/${item.type}s/${item.id}`)">
                <div class="item-rank" :class="getDueClass(item.dueDate)">{{ getDueDays(item.dueDate) }}</div>
                <div class="item-content">
                  <div class="item-title">{{ item.title }}</div>
                  <div class="item-meta">
                    <span class="tag" :class="item.type === 'task' ? 'tag-primary' : 'tag-danger'">{{ item.type === 'task' ? '任务' : '缺陷' }}</span>
                    <span><el-icon size="12"><Folder /></el-icon> {{ item.project?.name }}</span>
                  </div>
                </div>
              </div>
              <div v-if="dueSoonItems.length === 0" class="empty">暂无即将到期项</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Role-specific extra sections -->
      <template v-for="section in roleExtraSections" :key="section.key">
        <div class="row role-extra-row">
          <div class="col full">
            <div class="card" :class="section.cardClass">
              <div class="card-header">
                <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none" v-html="section.headerSvg"></svg>
                <span>{{ section.title }}</span>
                <el-button class="btn-link" @click="section.click">查看全部 →</el-button>
              </div>
              <div class="list">
                <div v-for="item in section.items" :key="item.id" class="list-item" @click="section.itemClick(item)">
                  <div class="item-priority" :class="section.getItemClass(item)"></div>
                  <div class="item-content">
                    <div class="item-title">{{ item.title }}</div>
                    <div class="item-meta">
                      <span><el-icon size="12"><Folder /></el-icon> {{ item.project?.name }}</span>
                      <span v-if="section.getMeta(item)">{{ section.getMeta(item) }}</span>
                    </div>
                  </div>
                  <span class="tag" :class="section.getStatusClass(item)">{{ section.getStatusText(item) }}</span>
                </div>
                <div v-if="section.items.length === 0" class="empty">{{ section.emptyText }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>
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
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const allTasks = ref<any[]>([])
const allBugs = ref<any[]>([])
const allProjects = ref<any[]>([])
const allUsers = ref<any[]>([])

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
        svg: '<rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#667eea"/>'
      },
      {
        key: 'pending',
        title: '待处理项',
        desc: `${allTasks.value.filter((t: any) => t.status === 'pending').length + allBugs.value.filter((b: any) => b.status === 'pending').length} 个待处理`,
        click: () => router.push('/tasks'),
        svg: '<circle cx="24" cy="24" r="18" stroke="#ff6b6b" stroke-width="2.5" fill="none"/><path d="M24 12V24L32 30" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
      },
      {
        key: 'team',
        title: '团队管理',
        desc: `${allUsers.value.filter((u: any) => u.role !== 'admin').length} 位成员`,
        click: () => router.push('/users'),
        svg: '<circle cx="24" cy="14" r="7" stroke="#43e97b" stroke-width="2.5" fill="none"/><path d="M8 42C8 34.27 15.16 28 24 28C32.84 28 40 34.27 40 42" stroke="#43e97b" stroke-width="2.5" fill="none"/>'
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
        svg: '<rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#667eea"/>'
      },
      {
        key: 'teamPending',
        title: '团队待办',
        desc: `${pmPendingCount.value} 个待处理任务`,
        click: () => router.push('/tasks'),
        svg: '<rect x="8" y="6" width="32" height="36" rx="4" stroke="#f39c12" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28" stroke="#f39c12" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#f39c12"/>'
      },
      {
        key: 'openBugs',
        title: '需关注',
        desc: `${pmOpenBugCount.value} 个未关闭缺陷`,
        click: () => router.push('/bugs'),
        svg: '<path d="M24 8L12 16V32L24 40L36 32V16L24 8Z" stroke="#f5576c" stroke-width="2.5" fill="none"/><path d="M20 24L23 27L28 21" stroke="#f5576c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
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
      svg: '<rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#667eea"/>'
    },
    {
      key: 'myBugs',
      title: '我的缺陷',
      desc: `${myPendingBugs.value.length} 个待处理缺陷`,
      click: () => router.push('/bugs'),
      svg: '<path d="M24 8L12 16V32L24 40L36 32V16L24 8Z" stroke="#f5576c" stroke-width="2.5" fill="none"/><path d="M20 24L23 27L28 21" stroke="#f5576c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    }
  ]

  // Tester gets a "to verify" quest
  if (role === 'tester') {
    quests.push({
      key: 'toVerify',
      title: '待验证',
      desc: `${bugsToVerify.value.length} 个待验证缺陷`,
      click: () => router.push('/bugs'),
      svg: '<circle cx="24" cy="24" r="18" stroke="#27ae60" stroke-width="2.5" fill="none"/><path d="M18 24L22 28L30 19" stroke="#27ae60" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    })
  } else {
    quests.push({
      key: 'dueSoon',
      title: '即将到期',
      desc: `${dueSoonItems.value.length} 个待处理`,
      click: () => router.push('/tasks'),
      svg: '<circle cx="24" cy="24" r="18" stroke="#f39c12" stroke-width="2.5" fill="none"/><path d="M24 12V24L32 30" stroke="#f39c12" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    })
  }

  return quests
})

// ==================== Shared Data ====================

const myTasks = computed(() => allTasks.value.filter((t: any) => t.assignee?.id === userId.value || t.creator?.id === userId.value))
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

const teamMembers = computed(() => allUsers.value.filter((u: any) => u.role !== 'admin'))

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

const teamWorkload = computed(() => {
  const members = allUsers.value.filter((u: any) => u.role !== 'admin')
  return members.map((m: any) => {
    const taskCount = allTasks.value.filter((t: any) => t.assignee?.id === m.id && t.status !== 'completed' && t.status !== 'closed').length
    const maxTasks = Math.max(...members.map((u: any) => allTasks.value.filter((t: any) => t.assignee?.id === u.id && t.status !== 'completed' && t.status !== 'closed').length), 1)
    return { id: m.id, name: m.realName, taskCount, load: Math.round((taskCount / maxTasks) * 100) }
  }).sort((a: any, b: any) => b.taskCount - a.taskCount).slice(0, 6)
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
    const userTasks = allTasks.value.filter((t: any) => t.assignee?.id === m.id)
    const pendingCount = userTasks.filter((t: any) => t.status === 'pending').length
    const inProgressCount = userTasks.filter((t: any) => t.status === 'in_progress').length
    const completedCount = userTasks.filter((t: any) => t.status === 'completed' || t.status === 'closed').length
    const totalTasks = userTasks.length
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100)
    const openBugCount = allBugs.value.filter((b: any) => b.assignee?.id === m.id && b.status !== 'closed' && b.status !== 'verified').length
    return { id: m.id, name: m.realName, role: m.role, pendingCount, inProgressCount, completedCount, totalTasks, completionRate, openBugCount }
  }).sort((a: any, b: any) => b.completionRate - a.completionRate)
})

// ==================== Dev Stats (unified) ====================

const devStats = computed(() => [
  { key: 'myTasks', label: '我的任务', value: myTasks.value.filter((t: any) => t.status !== 'completed' && t.status !== 'closed').length, icon: 'List', color: 'stat-blue', click: () => router.push('/tasks') },
  { key: 'myBugs', label: '我的缺陷', value: myBugs.value.filter((b: any) => b.status !== 'closed' && b.status !== 'verified').length, icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
  { key: 'completed', label: '本周完成', value: completedTasksThisWeek.value, icon: 'CircleCheck', color: 'stat-green', click: () => router.push('/tasks') },
  { key: 'rate', label: '完成率', value: taskCompletionRate.value + '%', icon: 'TrendCharts', color: 'stat-purple', click: () => router.push('/tasks') },
])

// ==================== Role-specific extra sections for dev view ====================

const roleExtraSections = computed(() => {
  const role = userRole.value
  const sections: any[] = []

  if (role === 'tester') {
    sections.push({
      key: 'toVerify',
      title: '待验证缺陷',
      cardClass: 'card-success',
      items: bugsToVerify.value,
      headerSvg: '<circle cx="12" cy="12" r="9" stroke="#27ae60" stroke-width="1.5" fill="none"/><path d="M8 12L11 15L16 9" stroke="#27ae60" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      click: () => router.push('/bugs'),
      itemClick: (item: any) => router.push(`/bugs/${item.id}`),
      getItemClass: (item: any) => getSeverityClass(item.severity),
      getMeta: (item: any) => `${item.assignee?.realName || '未分配'}`,
      getStatusClass: (item: any) => 'tag-success',
      getStatusText: () => '待验证',
      emptyText: '暂无待验证缺陷'
    })
  }

  if (role === 'designer') {
    sections.push({
      key: 'myCreated',
      title: '我创建的任务',
      cardClass: '',
      items: myCreatedTasks.value,
      headerSvg: '<path d="M8 4H16L20 8V20H4V4H8Z" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M8 4V8H12" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/>',
      click: () => router.push('/tasks'),
      itemClick: (item: any) => router.push(`/tasks/${item.id}`),
      getItemClass: (item: any) => getPriorityClass(item.priority),
      getMeta: (item: any) => `${item.assignee?.realName || '未分配'}`,
      getStatusClass: (item: any) => getStatusTagClass(item.status),
      getStatusText: (item: any) => getStatusText(item.status),
      emptyText: '暂无任务'
    })
  }

  return sections
})

// ==================== Shared Utility Functions ====================

const getProjectProgress = (project: any) => {
  const projectTasks = allTasks.value.filter((t: any) => t.project?.id === project.id)
  if (projectTasks.length === 0) return 0
  const completed = projectTasks.filter((t: any) => t.status === 'completed' || t.status === 'closed').length
  return Math.round((completed / projectTasks.length) * 100)
}

const getProjectTaskCount = (projectId: number) => allTasks.value.filter((t: any) => t.project?.id === projectId).length
const getProjectBugCount = (projectId: number) => allBugs.value.filter((b: any) => b.project?.id === projectId).length
const getUserTaskCount = (uid: number) => allTasks.value.filter((t: any) => t.assignee?.id === uid && t.status !== 'completed' && t.status !== 'closed').length

const getHealthColor = (progress: number) => {
  if (progress >= 60) return 'health-green'
  if (progress >= 30) return 'health-yellow'
  return 'health-red'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = { admin: '管理员', project_manager: '项目经理', developer: '程序', artist: '美术', designer: '策划', tester: '测试' }
  return map[role] || role
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
  const map: Record<string, string> = { pending: 'tag-default', in_progress: 'tag-warning', completed: 'tag-success', closed: 'tag-default' }
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

// ==================== Data Loading ====================

onMounted(async () => {
  try {
    const [projectsRes, tasksRes, bugsRes, usersRes] = await Promise.all([
      getProjects(), getTasks(), getBugs(), getUsers()
    ])
    allProjects.value = projectsRes.data || []
    allTasks.value = tasksRes.data || []
    allBugs.value = bugsRes.data || []
    allUsers.value = usersRes.data || []
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ==================== Banner ==================== */
.banner {
  position: relative;
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.banner.role-admin { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.banner.role-pm { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.banner.role-dev { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }

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
}

.float-1 { top: 10%; left: 5%; width: 48px; height: 48px; animation-delay: 0s; }
.float-2 { top: 60%; left: 15%; width: 36px; height: 36px; animation-delay: 1.5s; }
.float-3 { top: 20%; right: 25%; width: 40px; height: 40px; animation-delay: 3s; }
.float-4 { top: 65%; right: 10%; width: 32px; height: 32px; animation-delay: 4.5s; }

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
  padding: 28px 32px;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.4);
}

.welcome-text h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px 0;
  letter-spacing: 0.3px;
}

.date {
  font-size: 13px;
  opacity: 0.85;
}

.banner-subtitle {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 2px;
  letter-spacing: 1px;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-image {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.role-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.3);
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
  gap: 16px;
  margin-bottom: 24px;
}

.quest-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: white;
  border-radius: 14px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.25s ease;
}

.quest-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
  border-color: #e8ecff;
}

.quest-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.quest-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.quest-info {
  flex: 1;
  min-width: 0;
}

.quest-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 2px;
}

.quest-desc {
  font-size: 12px;
  color: #8c8c9a;
}

.quest-arrow {
  font-size: 18px;
  color: #c0c0c0;
  transition: all 0.2s;
}

.quest-card:hover .quest-arrow {
  color: #667eea;
  transform: translateX(4px);
}

/* ==================== Section ==================== */
.section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 16px;
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
  gap: 16px;
}

.stat-card {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid #f0f0f0;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-accent {
  height: 3px;
  width: 100%;
}

.stat-blue .stat-accent { background: linear-gradient(90deg, #4facfe, #00f2fe); }
.stat-green .stat-accent { background: linear-gradient(90deg, #43e97b, #38f9d7); }
.stat-orange .stat-accent { background: linear-gradient(90deg, #fa709a, #fee140); }
.stat-purple .stat-accent { background: linear-gradient(90deg, #a18cd1, #fbc2eb); }
.stat-cyan .stat-accent { background: linear-gradient(90deg, #89f7fe, #66a6ff); }
.stat-red .stat-accent { background: linear-gradient(90deg, #ff6b6b, #ee5a24); }

.stat-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
}

.stat-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-blue .stat-icon-box { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-green .stat-icon-box { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.stat-orange .stat-icon-box { background: linear-gradient(135deg, #fa709a, #fee140); }
.stat-purple .stat-icon-box { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }
.stat-cyan .stat-icon-box { background: linear-gradient(135deg, #89f7fe, #66a6ff); }
.stat-red .stat-icon-box { background: linear-gradient(135deg, #ff6b6b, #ee5a24); }

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: #8c8c9a;
}

/* ==================== Row Layout ==================== */
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
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
  background: white;
  border-radius: 14px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  transition: box-shadow 0.25s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.card-icon-svg {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.card-header .btn-link {
  margin-left: auto;
}

.card-danger .card-header {
  color: #e74c3c;
}

.card-warning .card-header {
  color: #f39c12;
}

.card-success .card-header {
  color: #27ae60;
}

/* ==================== Button Link ==================== */
.btn-link {
  padding: 4px 12px;
  font-size: 12px;
  color: #667eea;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 6px;
}

.btn-link:hover {
  background: #f0f2ff;
  color: #5a6fd6;
}

/* ==================== List ==================== */
.list {
  padding: 12px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 6px;
  background: #fafbfc;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.list-item:hover {
  background: #f0f4ff;
  border-color: #e8ecff;
  transform: translateX(4px);
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
  background: white;
  border-radius: 10px;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.item-rank {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
  border-radius: 10px;
}

.due-overdue { background: linear-gradient(135deg, #ff6b6b, #ee5a24); }
.due-today { background: linear-gradient(135deg, #f39c12, #fdcb6e); }
.due-soon { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.due-normal { background: linear-gradient(135deg, #b2bec3, #dfe6e9); }

.severity-critical { background: linear-gradient(135deg, #ff6b6b, #ee5a24); }
.severity-high { background: linear-gradient(135deg, #f39c12, #fdcb6e); }
.severity-medium { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.severity-low { background: linear-gradient(135deg, #b2bec3, #dfe6e9); }

.item-priority {
  width: 4px;
  height: 44px;
  border-radius: 2px;
}

.priority-urgent { background: #ff6b6b; }
.priority-high { background: #f39c12; }
.priority-medium { background: #4facfe; }
.priority-low { background: #b2bec3; }

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #2d3436;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #8c8c9a;
}

.text-danger {
  color: #e74c3c;
}

.text-warning {
  color: #f39c12;
}

.text-blue {
  color: #4facfe;
}

.text-success {
  color: #27ae60;
}

/* ==================== Tag ==================== */
.tag {
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 12px;
  white-space: nowrap;
}

.tag-primary { background: #e8f4fd; color: #2980b9; }
.tag-success { background: #e8f8f0; color: #27ae60; }
.tag-warning { background: #fef5e7; color: #f39c12; }
.tag-danger { background: #fde8e8; color: #e74c3c; }
.tag-default { background: #f0f0f0; color: #636e72; }

/* ==================== Progress ==================== */
.progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4facfe, #00f2fe);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.progress-fill.fill-danger {
  background: linear-gradient(90deg, #ff6b6b, #ee5a24);
}

.progress-fill.fill-warning {
  background: linear-gradient(90deg, #f39c12, #fdcb6e);
}

.progress-fill.fill-success {
  background: linear-gradient(90deg, #43e97b, #38f9d7);
}

.progress-text {
  font-size: 12px;
  color: #636e72;
  min-width: 36px;
  text-align: right;
  font-weight: 500;
}

/* ==================== Health Dot ==================== */
.health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.health-green {
  background: #27ae60;
  box-shadow: 0 0 6px rgba(39, 174, 96, 0.4);
}

.health-yellow {
  background: #f39c12;
  box-shadow: 0 0 6px rgba(243, 156, 18, 0.4);
}

.health-red {
  background: #e74c3c;
  box-shadow: 0 0 6px rgba(231, 76, 60, 0.4);
}

/* ==================== Project Stats Row ==================== */
.project-stats-row {
  display: flex;
  gap: 20px;
  margin-top: 8px;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mini-num {
  font-size: 16px;
  color: #4facfe;
  font-weight: 700;
}

.mini-stat span:last-child {
  font-size: 11px;
  color: #8c8c9a;
}

/* ==================== Team List ==================== */
.team-list {
  padding: 12px;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 6px;
  background: #fafbfc;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.team-member:hover {
  background: #f0f4ff;
  border-color: #e8ecff;
}

.team-member:last-child {
  margin-bottom: 0;
}

.member-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  font-size: 14px;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 13px;
  font-weight: 500;
  color: #2d3436;
  margin-bottom: 2px;
}

.member-role {
  font-size: 11px;
  color: #8c8c9a;
}

.member-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.badge-num {
  font-size: 16px;
  color: #f39c12;
  font-weight: 700;
}

.badge-label {
  font-size: 10px;
  color: #8c8c9a;
}

/* ==================== Member Completion Grid (PM view) ==================== */
.member-completion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 12px;
}

.member-completion-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.member-completion-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border-color: #e8ecff;
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
  font-size: 13px;
}

.mcc-info {
  min-width: 0;
}

.mcc-name {
  font-size: 13px;
  font-weight: 600;
  color: #2d3436;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mcc-role {
  font-size: 11px;
  color: #8c8c9a;
}

.mcc-stats {
  display: flex;
  gap: 16px;
  flex: 1;
  justify-content: center;
}

.mcc-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mcc-stat-num {
  font-size: 16px;
  font-weight: 700;
}

.mcc-stat-label {
  font-size: 10px;
  color: #8c8c9a;
}

.mcc-rate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 70px;
}

.mcc-rate-bar {
  width: 100%;
}

.mcc-rate-bar .progress-bar {
  height: 5px;
}

.mcc-rate-num {
  font-size: 16px;
  font-weight: 700;
}

/* ==================== Donut Chart ==================== */
.donut-card {
  padding: 24px;
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
  stroke: #f0f0f0;
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
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
}

.donut-label {
  font-size: 11px;
  color: #8c8c9a;
}

.donut-stats {
  display: flex;
  gap: 32px;
  margin-top: 20px;
}

/* ==================== Role Extra ==================== */
.role-extra-row {
  margin-bottom: 20px;
}

/* ==================== Empty State ==================== */
.empty {
  text-align: center;
  padding: 32px;
  font-size: 13px;
  color: #b2bec3;
  background: #fafbfc;
  border-radius: 10px;
  border: 1px dashed #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  opacity: 0.6;
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
    font-size: 16px;
  }

  .banner-content {
    padding: 20px;
  }

  .hero-image {
    width: 60px;
    height: 60px;
  }
}
</style>
