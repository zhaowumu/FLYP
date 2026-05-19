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
                    <span><el-icon size="12"><Folder /></el-icon> {{ project.managers?.[0]?.realName || '-' }}</span>
                  </div>
                  <div class="progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: (project.progress || 0) + '%' }"></div>
                    </div>
                    <span class="health-dot" :class="getHealthColor(project.progress || 0)"></span>
                    <span class="progress-text">{{ project.progress || 0 }}%</span>
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
                  <span class="badge-num">{{ (teamMemberPendingMap[user.id] ?? 0) }}</span>
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
          项目经理工作台
        </div>
        <div class="stats-grid">
          <div class="stat-card stat-blue" @click="router.push('/tasks')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><List /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ pmUnassignedTasks }}</div>
                <div class="stat-label">待指派的任务</div>
              </div>
            </div>
          </div>
          <div class="stat-card stat-green" @click="router.push('/tasks')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><CircleCheck /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ pmCloseableTasks }}</div>
                <div class="stat-label">待关闭的任务</div>
              </div>
            </div>
          </div>
          <div class="stat-card stat-orange" @click="router.push('/bugs')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><Warning /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ pmUnassignedBugs }}</div>
                <div class="stat-label">待指派的Bug</div>
              </div>
            </div>
          </div>
          <div class="stat-card stat-red" @click="router.push('/bugs')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><CircleCheckFilled /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ pmCloseableBugs }}</div>
                <div class="stat-label">待关闭的Bug</div>
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
                <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z" stroke="#667eea" stroke-width="0" fill="#667eea" opacity="0.1"/>
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
                    <span><el-icon size="12"><Folder /></el-icon> {{ project.managers?.[0]?.realName || '-' }}</span>
                  </div>
                  <div class="progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: (project.progress || 0) + '%' }"></div>
                    </div>
                    <span class="health-dot" :class="getHealthColor(project.progress || 0)"></span>
                    <span class="progress-text">{{ project.progress || 0 }}%</span>
                  </div>
                </div>
              </div>
              <div v-if="recentProjects.length === 0" class="empty">
                <svg class="empty-icon" viewBox="0 0 80 80" fill="none">
                  <rect x="16" y="12" width="48" height="56" rx="6" stroke="#d1d5db" stroke-width="2" stroke-dasharray="4 4"/>
                  <path d="M32 36H48M32 44H44M32 52H40" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <div>暂无管理的项目</div>
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
              <span>团队负载</span>
            </div>
            <div class="team-list">
              <div v-for="member in teamMembers" :key="member.id" class="team-member clickable" @click="router.push({ path: '/tasks', query: { assigneeId: member.id } })">
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
                    <span class="stat-item"><span class="stat-dot dot-blue"></span>任务 {{ member.totalTasks }}</span>
                    <span class="stat-item"><span class="stat-dot dot-warning"></span>进行中 {{ member.inProgressCount }}</span>
                    <span class="stat-item"><span class="stat-dot dot-danger"></span>缺陷 {{ member.openBugCount }}</span>
                  </div>
                  <div class="member-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :class="member.completionRate >= 60 ? 'fill-success' : member.completionRate >= 30 ? 'fill-warning' : 'fill-danger'" :style="{ width: member.completionRate + '%' }"></div>
                    </div>
                    <span class="progress-text" :class="member.completionRate >= 60 ? 'text-success' : member.completionRate >= 30 ? 'text-warning' : 'text-danger'">待办 {{ member.taskCount }} | {{ member.completionRate }}%</span>
                  </div>
                </div>
                <div class="member-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
              <div v-if="teamMembers.length === 0" class="empty">暂无团队成员</div>
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

      <div class="row">
        <div class="col full">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#667eea" stroke-width="1.5" fill="none"/>
                <path d="M12 6V12L16 14" stroke="#667eea" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>团队操作历史</span>
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
      </div>
    </template>

    <!-- ==================== Developer / Designer / Artist / Tester Unified View ==================== -->
    <template v-if="['developer','designer','artist','tester'].includes(userRole)">
      <div class="section">
        <div class="section-title">
          <svg class="section-icon" viewBox="0 0 24 24" fill="none"><path d="M16 4H18C19.1 4 20 4.9 20 6V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V6C4 4.9 4.9 4 6 4H8M12 2V10L15 7M12 10L9 7" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {{ getRoleText(userRole) }}工作台
        </div>
        <div class="stats-grid">
          <div class="stat-card stat-blue" @click="router.push('/tasks')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><List /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ myPendingTasks.length }}</div>
                <div class="stat-label">我的任务</div>
              </div>
            </div>
          </div>
          <div class="stat-card stat-orange" @click="router.push('/bugs')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><Warning /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ myPendingBugs.length }}</div>
                <div class="stat-label">我的Bug</div>
              </div>
            </div>
          </div>
          <div class="stat-card stat-purple" @click="router.push('/tasks')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><TrendCharts /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ myActiveTaskCount }}</div>
                <div class="stat-label">我的负载</div>
              </div>
            </div>
          </div>
          <div class="stat-card stat-green" @click="router.push('/tasks')">
            <div class="stat-accent"></div>
            <div class="stat-inner">
              <div class="stat-icon-box"><el-icon :size="22"><CircleCheck /></el-icon></div>
              <div class="stat-content">
                <div class="stat-value">{{ taskCompletionRate }}%</div>
                <div class="stat-label">我的效率</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M8 10H16M8 14H12" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>我的任务</span>
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
              <span>我的Bug</span>
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
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><path d="M3 13H5V11H3V13ZM3 17H5V15H3V17ZM3 9H5V7H3V9ZM7 13H21V11H7V13ZM7 17H21V15H7V17ZM7 9H21V7H7V9Z" stroke="#667eea" stroke-width="1.5" fill="none"/></svg>
              <span>我的负载</span>
            </div>
            <div class="workload-panel">
              <div class="workload-bar-section">
                <div class="workload-bar-header">
                  <span class="workload-bar-label">任务</span>
                  <span class="workload-bar-count">{{ myActiveTaskCount }}</span>
                </div>
                <div class="workload-bar-track">
                  <div class="workload-bar-fill workload-urgent" :style="{ width: getTaskStatusPercent('urgent') + '%' }"></div>
                  <div class="workload-bar-fill workload-high" :style="{ width: getTaskStatusPercent('high') + '%' }"></div>
                  <div class="workload-bar-fill workload-medium" :style="{ width: getTaskStatusPercent('medium') + '%' }"></div>
                  <div class="workload-bar-fill workload-low" :style="{ width: getTaskStatusPercent('low') + '%' }"></div>
                </div>
                <div class="workload-bar-legend">
                  <span class="legend-item"><i class="legend-dot legend-urgent"></i>紧急 {{ myTasksByPriority('urgent') }}</span>
                  <span class="legend-item"><i class="legend-dot legend-high"></i>高优 {{ myTasksByPriority('high') }}</span>
                  <span class="legend-item"><i class="legend-dot legend-medium"></i>中优 {{ myTasksByPriority('medium') }}</span>
                  <span class="legend-item"><i class="legend-dot legend-low"></i>低优 {{ myTasksByPriority('low') }}</span>
                </div>
              </div>
              <div class="workload-bar-section">
                <div class="workload-bar-header">
                  <span class="workload-bar-label">缺陷</span>
                  <span class="workload-bar-count">{{ myActiveBugCount }}</span>
                </div>
                <div class="workload-bar-track">
                  <div class="workload-bar-fill workload-critical" :style="{ width: getBugSeverityPercent('critical') + '%' }"></div>
                  <div class="workload-bar-fill workload-severity-high" :style="{ width: getBugSeverityPercent('high') + '%' }"></div>
                  <div class="workload-bar-fill workload-severity-medium" :style="{ width: getBugSeverityPercent('medium') + '%' }"></div>
                  <div class="workload-bar-fill workload-severity-low" :style="{ width: getBugSeverityPercent('low') + '%' }"></div>
                </div>
                <div class="workload-bar-legend">
                  <span class="legend-item"><i class="legend-dot legend-critical"></i>致命 {{ myBugsBySeverity('critical') }}</span>
                  <span class="legend-item"><i class="legend-dot legend-severity-high"></i>严重 {{ myBugsBySeverity('high') }}</span>
                  <span class="legend-item"><i class="legend-dot legend-severity-medium"></i>一般 {{ myBugsBySeverity('medium') }}</span>
                  <span class="legend-item"><i class="legend-dot legend-severity-low"></i>轻微 {{ myBugsBySeverity('low') }}</span>
                </div>
              </div>
              <div class="workload-summary">
                <div class="workload-summary-item">
                  <div class="summary-ring summary-ring-warning">
                    <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-border-light)" stroke-width="3"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-warning)" stroke-width="3" :stroke-dasharray="97.4" :stroke-dashoffset="97.4 - (97.4 * inProgressCount / Math.max(myActiveTaskCount, 1))" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg>
                    <span class="summary-ring-num">{{ inProgressCount }}</span>
                  </div>
                  <span class="summary-ring-label">进行中</span>
                </div>
                <div class="workload-summary-item">
                  <div class="summary-ring summary-ring-primary">
                    <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-border-light)" stroke-width="3"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-primary)" stroke-width="3" :stroke-dasharray="97.4" :stroke-dashoffset="97.4 - (97.4 * pendingTaskCount / Math.max(myActiveTaskCount, 1))" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg>
                    <span class="summary-ring-num">{{ pendingTaskCount }}</span>
                  </div>
                  <span class="summary-ring-label">待处理</span>
                </div>
                <div class="workload-summary-item">
                  <div class="summary-ring summary-ring-danger">
                    <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-border-light)" stroke-width="3"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-danger)" stroke-width="3" :stroke-dasharray="97.4" :stroke-dashoffset="97.4 - (97.4 * myActiveBugCount / Math.max(myActiveTaskCount + myActiveBugCount, 1))" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg>
                    <span class="summary-ring-num">{{ myActiveBugCount }}</span>
                  </div>
                  <span class="summary-ring-label">活跃Bug</span>
                </div>
                <div class="workload-summary-item">
                  <div class="summary-ring summary-ring-total">
                    <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-border-light)" stroke-width="3"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-gradient-primary)" stroke-width="3" :stroke-dasharray="97.4" :stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 18 18)"/></svg>
                    <span class="summary-ring-num">{{ myActiveTaskCount + myActiveBugCount }}</span>
                  </div>
                  <span class="summary-ring-label">总负载</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col half">
          <div class="card">
            <div class="card-header">
              <svg class="card-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#667eea" stroke-width="1.5" fill="none"/><path d="M12 8V12L15 15" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>我的效率</span>
            </div>
            <div class="efficiency-panel">
              <div class="efficiency-main">
                <div class="efficiency-ring-container">
                  <svg class="efficiency-ring-svg" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--nb-border-light)" stroke-width="2.5"/>
                    <circle cx="18" cy="18" r="15.5" fill="none" :stroke="taskCompletionRate >= 60 ? 'var(--nb-success)' : taskCompletionRate >= 30 ? 'var(--nb-warning)' : 'var(--nb-danger)'" stroke-width="2.5" :stroke-dasharray="97.4" :stroke-dashoffset="97.4 - (97.4 * taskCompletionRate / 100)" stroke-linecap="round" transform="rotate(-90 18 18)"/>
                  </svg>
                  <div class="efficiency-ring-center">
                    <span class="efficiency-ring-value" :style="{ color: taskCompletionRate >= 60 ? 'var(--nb-success)' : taskCompletionRate >= 30 ? 'var(--nb-warning)' : 'var(--nb-danger)' }">{{ taskCompletionRate }}</span>
                    <span class="efficiency-ring-unit">%</span>
                  </div>
                </div>
                <div class="efficiency-main-info">
                  <div class="efficiency-main-label">总完成率</div>
                  <div class="efficiency-main-desc">{{ completedTasksThisWeek }} / {{ totalTasksThisWeek }} 任务已完成</div>
                </div>
              </div>
              <div class="efficiency-breakdown">
                <div class="efficiency-row">
                  <div class="efficiency-row-header">
                    <span class="efficiency-row-label">待处理</span>
                    <span class="efficiency-row-value">{{ pendingTaskCount }}</span>
                  </div>
                  <div class="efficiency-row-track"><div class="efficiency-row-fill" style="background: var(--nb-primary)" :style="{ width: (pendingTaskCount / Math.max(myActiveTaskCount + myCompletedTaskCount, 1) * 100) + '%' }"></div></div>
                </div>
                <div class="efficiency-row">
                  <div class="efficiency-row-header">
                    <span class="efficiency-row-label">进行中</span>
                    <span class="efficiency-row-value">{{ inProgressCount }}</span>
                  </div>
                  <div class="efficiency-row-track"><div class="efficiency-row-fill" style="background: var(--nb-warning)" :style="{ width: (inProgressCount / Math.max(myActiveTaskCount + myCompletedTaskCount, 1) * 100) + '%' }"></div></div>
                </div>
                <div class="efficiency-row">
                  <div class="efficiency-row-header">
                    <span class="efficiency-row-label">已完成</span>
                    <span class="efficiency-row-value">{{ myCompletedTaskCount }}</span>
                  </div>
                  <div class="efficiency-row-track"><div class="efficiency-row-fill" style="background: var(--nb-success)" :style="{ width: (myCompletedTaskCount / Math.max(myActiveTaskCount + myCompletedTaskCount, 1) * 100) + '%' }"></div></div>
                </div>
                <div class="efficiency-row">
                  <div class="efficiency-row-header">
                    <span class="efficiency-row-label">已关闭</span>
                    <span class="efficiency-row-value">{{ myClosedTaskCount }}</span>
                  </div>
                  <div class="efficiency-row-track"><div class="efficiency-row-fill" style="background: var(--nb-text-secondary)" :style="{ width: (myClosedTaskCount / Math.max(myActiveTaskCount + myCompletedTaskCount, 1) * 100) + '%' }"></div></div>
                </div>
              </div>
              <div class="efficiency-weekly">
                <div class="efficiency-weekly-label">本周完成</div>
                <div class="efficiency-weekly-progress">
                  <div class="efficiency-weekly-track">
                    <div class="efficiency-weekly-fill" :style="{ width: Math.min((completedTasksThisWeek / Math.max(totalTasksThisWeek, 1)) * 100, 100) + '%' }"></div>
                  </div>
                  <span class="efficiency-weekly-num">{{ completedTasksThisWeek }} / {{ totalTasksThisWeek }}</span>
                </div>
              </div>
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
import { getDashboard } from '../api/dashboard'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const dashboardData = ref<any>(null)
const recentLogs = ref<any[]>([])

// Page-level data (populated from API response per role)
const recentProjects = ref<any[]>([])
const teamMembers = ref<any[]>([])
const urgentBugs = ref<any[]>([])
const dueSoonTasks = ref<any[]>([])
const adminStats = ref<any[]>([])
const myPendingTasks = ref<any[]>([])
const myPendingBugs = ref<any[]>([])
const pmUnassignedTasks = ref(0)
const pmCloseableTasks = ref(0)
const pmUnassignedBugs = ref(0)
const pmCloseableBugs = ref(0)

// Developer stats
const myActiveTaskCount = ref(0)
const inProgressCount = ref(0)
const pendingTaskCount = ref(0)
const myActiveBugCount = ref(0)
const myCompletedTaskCount = ref(0)
const myClosedTaskCount = ref(0)
const taskCompletionRate = ref(0)
const completedTasksThisWeek = ref(0)
const totalTasksThisWeek = ref(0)

// Workload data (used by template functions)
const workloadByPriority = ref<Record<string, number>>({ urgent: 0, high: 0, medium: 0, low: 0 })
const workloadBySeverity = ref<Record<string, number>>({ critical: 0, high: 0, medium: 0, low: 0 })

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
  const d = dashboardData.value
  if (role === 'admin') {
    return [
      {
        key: 'projects',
        title: '项目概览',
        desc: `${d?.stats?.activeProjects || 0} 个活跃项目`,
        click: () => router.push('/projects'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="36" r="10" fill="#667eea"/></svg>'
      },
      {
        key: 'pending',
        title: '待处理项',
        desc: `${(d?.stats?.totalTasks || 0) + (d?.stats?.totalBugs || 0)} 个事项`,
        click: () => router.push('/tasks'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" stroke="#ff6b6b" stroke-width="2.5" fill="none"/><path d="M24 12V24L32 30" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        key: 'team',
        title: '团队管理',
        desc: `${d?.stats?.teamMemberCount || 0} 位成员`,
        click: () => router.push('/users'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="14" r="7" stroke="#43e97b" stroke-width="2.5" fill="none"/><path d="M8 42C8 34.27 15.16 28 24 28C32.84 28 40 34.27 40 42" stroke="#43e97b" stroke-width="2.5" fill="none"/></svg>'
      }
    ]
  }
  if (role === 'project_manager') {
    const s = d?.stats || {}
    return [
      {
        key: 'unassigned',
        title: '待指派',
        desc: `${(s.unassignedTasks || 0) + (s.unassignedBugs || 0)} 个待指派`,
        click: () => router.push('/tasks'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="14" r="7" stroke="#f59e0b" stroke-width="2.5" fill="none"/><path d="M8 42C8 34.27 15.16 28 24 28C32.84 28 40 34.27 40 42" stroke="#f59e0b" stroke-width="2.5" fill="none"/><path d="M32 8L40 16M40 8L32 16" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/></svg>'
      },
      {
        key: 'closeable',
        title: '待关闭',
        desc: `${(s.closeableTasks || 0) + (s.closeableBugs || 0)} 个可关闭`,
        click: () => router.push('/tasks'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" stroke="#43e97b" stroke-width="2.5" fill="none"/><path d="M16 24L22 30L34 18" stroke="#43e97b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        key: 'team',
        title: '团队负载',
        desc: `${d?.teamMembers?.length || 0} 位成员`,
        click: () => router.push('/users'),
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="16" cy="16" r="6" stroke="#667eea" stroke-width="2.5" fill="none"/><circle cx="32" cy="16" r="6" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M4 40C4 32 9 26 16 26C20 26 23 28 24 30M24 30C25 28 28 26 32 26C39 26 44 32 44 40" stroke="#667eea" stroke-width="2.5" fill="none"/></svg>'
      }
    ]
  }
  // developer/designer/artist/tester
  return [
    {
      key: 'myTasks',
      title: '我的任务',
      desc: `${d?.stats?.activeTaskCount || 0} 个进行中`,
      click: () => router.push('/tasks'),
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="8" y="6" width="32" height="36" rx="4" stroke="#667eea" stroke-width="2.5" fill="none"/><path d="M16 18H32M16 26H28M16 34H24" stroke="#667eea" stroke-width="2" stroke-linecap="round"/></svg>'
    },
    {
      key: 'myBugs',
      title: '我的Bug',
      desc: `${d?.stats?.activeBugCount || 0} 个活跃`,
      click: () => router.push('/bugs'),
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="26" r="14" stroke="#ff6b6b" stroke-width="2.5" fill="none"/><path d="M18 12V6M24 10V4M30 12V6" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round"/><path d="M14 20H34M14 32H34" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round"/></svg>'
    },
    {
      key: 'efficiency',
      title: '我的效率',
      desc: `${d?.stats?.taskCompletionRate || 0}% 完成率`,
      click: () => router.push('/tasks'),
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" stroke="#43e97b" stroke-width="2.5" fill="none"/><path d="M24 12V24L32 30" stroke="#43e97b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  ]
})

// ==================== Template helper functions (use API data) ====================

const myTasksByPriority = (p: string) => workloadByPriority.value[p] || 0
const myBugsBySeverity = (s: string) => workloadBySeverity.value[s] || 0

const getTaskStatusPercent = (priority: string) => {
  const total = myActiveTaskCount.value
  if (total === 0) return 0
  return Math.round(((workloadByPriority.value[priority] || 0) / total) * 100)
}

const getBugSeverityPercent = (severity: string) => {
  const total = myActiveBugCount.value
  if (total === 0) return 0
  return Math.round(((workloadBySeverity.value[severity] || 0) / total) * 100)
}

// ==================== Shared Utility Functions ====================

const getHealthColor = (progress: number) => {
  if (progress >= 60) return 'health-green'
  if (progress >= 30) return 'health-yellow'
  return 'health-red'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = { admin: '管理员', project_manager: '项目经理', developer: '程序', designer: '策划', artist: '美术', model: '模型', vfx: '特效', animation: '动画', concept_art: '原画', ui: 'UI', level_design: '地编', sound: '音效', tech_art: '技美', tester: '测试', operations: '运营' }
  return map[role] || role
}

const getRoleGradient = (role: string) => {
  const map: Record<string, string> = {
    admin: 'var(--nb-gradient-primary)',
    project_manager: 'linear-gradient(135deg, #ec4899, #f59e0b)',
    developer: 'var(--nb-gradient-primary)',
    artist: 'var(--nb-gradient-artist)',
    designer: 'var(--nb-gradient-designer)',
    model: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    vfx: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    animation: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    concept_art: 'linear-gradient(135deg, #ec4899, #a855f7)',
    ui: 'linear-gradient(135deg, #10b981, #06b6d4)',
    level_design: 'linear-gradient(135deg, #84cc16, #22c55e)',
    sound: 'linear-gradient(135deg, #f97316, #eab308)',
    tech_art: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    tester: 'var(--nb-gradient-tester)',
    operations: 'linear-gradient(135deg, #14b8a6, #0ea5e9)'
  }
  return map[role] || 'var(--nb-gradient-info)'
}

const getRoleBadgeClass = (role: string) => {
  const map: Record<string, string> = {
    developer: 'badge-dev',
    artist: 'badge-artist',
    designer: 'badge-designer',
    model: 'badge-artist',
    vfx: 'badge-artist',
    animation: 'badge-artist',
    concept_art: 'badge-artist',
    ui: 'badge-designer',
    level_design: 'badge-designer',
    sound: 'badge-artist',
    tech_art: 'badge-dev',
    tester: 'badge-tester',
    operations: 'badge-designer',
    project_manager: 'badge-pm'
  }
  return map[role] || ''
}

const getPriorityText = (p: string) => {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
  return map[p] || p
}

const getStatusText = (s: string) => {
  const map: Record<string, string> = { pending: '待处理', in_progress: '进行中', completed: '已完成', testing: '测试中', closed: '已关闭' }
  return map[s] || s
}

const getBugStatusText = (s: string) => {
  const map: Record<string, string> = { pending: '待处理', in_progress: '处理中', fixed: '已修复', verified: '已验证', closed: '已关闭' }
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
  const map: Record<string, string> = { pending: 'tag-primary', in_progress: 'tag-warning', completed: 'tag-success', testing: 'tag-pink', closed: 'tag-default' }
  return map[s] || 'tag-default'
}

const getBugStatusTagClass = (s: string) => {
  const map: Record<string, string> = { pending: 'tag-primary', in_progress: 'tag-warning', fixed: 'tag-pink', verified: 'tag-success', closed: 'tag-default' }
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
  fixed: '已修复', verified: '已验证'
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

const teamMemberPendingMap = computed(() => {
  const map: Record<number, number> = {}
  teamMembers.value.forEach((m: any) => {
    map[m.id] = m.taskCount ?? m.pendingCount ?? 0
  })
  return map
})

onMounted(async () => {
  try {
    const res = await getDashboard()
    const data = res.data
    dashboardData.value = data

    if (userRole.value === 'admin') {
      recentProjects.value = data.recentProjects || []
      teamMembers.value = data.teamMembers || []
      urgentBugs.value = data.urgentBugs || []
      dueSoonTasks.value = data.dueSoonTasks || []
      adminStats.value = [
        { key: 'projects', label: '活跃项目', value: data.stats?.activeProjects || 0, icon: 'Folder', color: 'stat-blue', click: () => router.push('/projects') },
        { key: 'tasks', label: '总任务', value: data.stats?.totalTasks || 0, icon: 'List', color: 'stat-green', click: () => router.push('/tasks') },
        { key: 'bugs', label: '总缺陷', value: data.stats?.totalBugs || 0, icon: 'Warning', color: 'stat-orange', click: () => router.push('/bugs') },
        { key: 'users', label: '团队成员', value: data.stats?.teamMemberCount || 0, icon: 'User', color: 'stat-cyan', click: () => router.push('/users') },
        { key: 'pending', label: '待处理', value: data.stats?.pendingItems || 0, icon: 'Clock', color: 'stat-red', click: () => router.push('/tasks') },
        { key: 'completed', label: '本周完成', value: data.stats?.completedThisWeek || 0, icon: 'CircleCheck', color: 'stat-purple', click: () => router.push('/tasks') },
      ]
    } else if (userRole.value === 'project_manager') {
      const s = data.stats || {}
      pmUnassignedTasks.value = s.unassignedTasks || 0
      pmCloseableTasks.value = s.closeableTasks || 0
      pmUnassignedBugs.value = s.unassignedBugs || 0
      pmCloseableBugs.value = s.closeableBugs || 0
      teamMembers.value = data.teamMembers || []
      recentProjects.value = data.recentProjects || []
      urgentBugs.value = data.urgentBugs || []
      dueSoonTasks.value = data.dueSoonTasks || []
    } else {
      // developer/designer/artist/tester
      myPendingTasks.value = data.myPendingTasks || []
      myPendingBugs.value = data.myPendingBugs || []
      const s = data.stats || {}
      myActiveTaskCount.value = s.activeTaskCount || 0
      inProgressCount.value = s.inProgressCount || 0
      pendingTaskCount.value = s.pendingTaskCount || 0
      myActiveBugCount.value = s.activeBugCount || 0
      myCompletedTaskCount.value = s.completedTaskCount || 0
      myClosedTaskCount.value = s.closedTaskCount || 0
      taskCompletionRate.value = s.taskCompletionRate || 0
      completedTasksThisWeek.value = s.completedTasksThisWeek || 0
      totalTasksThisWeek.value = s.totalTasksThisWeek || 0
      workloadByPriority.value = data.workloadByPriority || { urgent: 0, high: 0, medium: 0, low: 0 }
      workloadBySeverity.value = data.workloadBySeverity || { critical: 0, high: 0, medium: 0, low: 0 }
    }

    recentLogs.value = data.recentLogs || []
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  line-height: 1.4;
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
.tag-pink { background: #fff0f6; color: #eb2f96; }
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
.dot-purple { background: #722ed1; }
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

/* ==================== Workload Panel ==================== */
.workload-panel {
  padding: var(--nb-space-4);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.workload-bar-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workload-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.workload-bar-label {
  font-size: var(--nb-font-size-sm);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
}

.workload-bar-count {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-bold);
  color: var(--nb-primary);
}

.workload-bar-track {
  height: 10px;
  border-radius: 5px;
  background: var(--nb-border-light);
  display: flex;
  overflow: hidden;
}

.workload-bar-fill {
  height: 100%;
  transition: width 0.6s ease;
  min-width: 0;
}

.workload-bar-fill.workload-urgent { background: #e74c3c; }
.workload-bar-fill.workload-high { background: #f39c12; }
.workload-bar-fill.workload-medium { background: var(--nb-primary); }
.workload-bar-fill.workload-low { background: var(--nb-success); }
.workload-bar-fill.workload-critical { background: #8b0000; }
.workload-bar-fill.workload-severity-high { background: #e74c3c; }
.workload-bar-fill.workload-severity-medium { background: #f39c12; }
.workload-bar-fill.workload-severity-low { background: var(--nb-primary); }

.workload-bar-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--nb-text-secondary);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}

.legend-urgent { background: #e74c3c; }
.legend-high { background: #f39c12; }
.legend-medium { background: var(--nb-primary); }
.legend-low { background: var(--nb-success); }
.legend-critical { background: #8b0000; }
.legend-severity-high { background: #e74c3c; }
.legend-severity-medium { background: #f39c12; }
.legend-severity-low { background: var(--nb-primary); }

.workload-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid var(--nb-border-light);
}

.workload-summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.summary-ring {
  position: relative;
  width: 48px;
  height: 48px;
}

.summary-ring svg {
  width: 100%;
  height: 100%;
}

.summary-ring-num {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  font-weight: var(--nb-font-weight-bold);
  color: var(--nb-text-primary);
}

.summary-ring-label {
  font-size: 10px;
  color: var(--nb-text-secondary);
  text-align: center;
}

/* ==================== Efficiency Panel ==================== */
.efficiency-panel {
  padding: var(--nb-space-4);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.efficiency-main {
  display: flex;
  align-items: center;
  gap: var(--nb-space-5);
}

.efficiency-ring-container {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.efficiency-ring-svg {
  width: 100%;
  height: 100%;
}

.efficiency-ring-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: baseline;
}

.efficiency-ring-value {
  font-size: 22px;
  font-weight: var(--nb-font-weight-bold);
  line-height: 1;
}

.efficiency-ring-unit {
  font-size: 12px;
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-secondary);
  margin-left: 1px;
}

.efficiency-main-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.efficiency-main-label {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
}

.efficiency-main-desc {
  font-size: var(--nb-font-size-xs);
  color: var(--nb-text-secondary);
}

.efficiency-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.efficiency-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.efficiency-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.efficiency-row-label {
  font-size: 12px;
  color: var(--nb-text-secondary);
}

.efficiency-row-value {
  font-size: 13px;
  font-weight: var(--nb-font-weight-bold);
  color: var(--nb-text-primary);
}

.efficiency-row-track {
  height: 6px;
  border-radius: 3px;
  background: var(--nb-border-light);
  overflow: hidden;
}

.efficiency-row-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
  min-width: 2px;
}

.efficiency-weekly {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--nb-bg-hover);
  border-radius: var(--nb-radius-md);
}

.efficiency-weekly-label {
  font-size: 12px;
  color: var(--nb-text-secondary);
  white-space: nowrap;
}

.efficiency-weekly-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.efficiency-weekly-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--nb-border-light);
  overflow: hidden;
}

.efficiency-weekly-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--nb-success);
  transition: width 0.5s ease;
  min-width: 0;
}

.efficiency-weekly-num {
  font-size: 13px;
  font-weight: var(--nb-font-weight-bold);
  color: var(--nb-success);
  white-space: nowrap;
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
