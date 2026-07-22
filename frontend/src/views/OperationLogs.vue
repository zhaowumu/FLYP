<template>
  <div class="operation-logs-page">
    <div class="page-header">
      <div class="header-left">
        <h2>操作管理</h2>
      </div>
    </div>

    <div class="content-card">
      <div class="filter-tabs">
        <div
          class="filter-tab"
          :class="{ active: activeTab === 'mine' }"
          @click="activeTab = 'mine'"
        >
          我的操作
        </div>
        <div
          class="filter-tab"
          :class="{ active: activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          全部
        </div>
      </div>

      <div class="table-toolbar">
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 120px">
          <el-option label="任务" value="task" />
          <el-option label="缺陷" value="bug" />
        </el-select>
        <el-select v-model="filterAction" placeholder="全部操作" clearable style="width: 130px">
          <el-option label="创建" value="create" />
          <el-option label="状态变更" value="status_change" />
          <el-option label="分配" value="assign" />
          <el-option label="优先级变更" value="priority_change" />
          <el-option label="严重程度变更" value="severity_change" />
          <el-option label="截止日期变更" value="due_date_change" />
          <el-option label="完成" value="complete" />
          <el-option label="关闭" value="close" />
          <el-option label="备注" value="comment" />
          <el-option label="重新打开" value="reopen" />
          <el-option label="转交" value="transfer" />
          <el-option label="反馈" value="feedback" />
          <el-option label="打回" value="reject" />
          <el-option label="修复" value="fix" />
          <el-option label="验证" value="verify" />
          <el-option label="重启" value="restart" />
        </el-select>
        <el-input
          v-model="filterKeyword"
          placeholder="搜索标题/备注"
          clearable
          style="width: 200px"
          :prefix-icon="Search"
        />
        <el-select v-model="filterUser" placeholder="操作人" clearable filterable style="width: 150px">
          <el-option
            v-for="user in users"
            :key="user.id"
            :label="user.realName"
            :value="user.id"
          />
        </el-select>
      </div>

      <div class="timeline-list">
        <div v-for="log in displayedLogs" :key="log.id" class="timeline-item clickable" @click="goToTarget(log)">
          <div class="timeline-dot" :class="getLogActionClass(log.action)"></div>
          <div class="timeline-content">
            <div class="timeline-meta">
              <span class="timeline-type tag">{{ log.targetType === 'task' ? '任务' : '缺陷' }}</span>
              <span class="timeline-user">{{ log.user?.realName || '未知' }}</span>
              <span class="timeline-time">{{ formatLogTime(log.createdAt) }}</span>
            </div>
            <div class="timeline-main">
              <span class="timeline-action" :class="getLogActionClass(log.action)">{{ getLogActionText(log) }}</span>
              <span class="timeline-target" v-if="log.title">《{{ log.title }}》</span>
            </div>
            <div class="timeline-remark" v-if="log.remark">{{ log.remark }}</div>
          </div>
        </div>
        <div v-if="displayedLogs.length === 0" class="empty">暂无操作记录</div>
      </div>
      <el-pagination
        v-if="total > 0"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="loadLogs"
        @size-change="handleSizeChange"
        style="margin-top: 16px; justify-content: flex-end; padding: 0 4px 4px;"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, onDeactivated, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { getOperationLogs } from '../api/operationLog'
import { useUserStore } from '../stores/user'
import { getUsers } from '../api/user'

defineOptions({ name: 'OperationLogs' })

const router = useRouter()
const userStore = useUserStore()
const logs = ref<any[]>([])
const users = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const activeTab = ref('mine')
const filterType = ref('')
const filterAction = ref('')
const filterKeyword = ref('')
const filterUser = ref<number | null>(null)
const savedScrollTop = ref(0)
const pendingScrollRestore = ref(false)

const statusTextMap: Record<string, string> = {
  pending: '待处理', in_progress: '进行中', completed: '已完成', closed: '已关闭',
  assigned: '已分配', fixing: '修复中', fixed: '已修复', verified: '已验证'
}
const priorityTextMap: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
const severityTextMap: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }

const displayedLogs = computed(() => {
  if (!filterKeyword.value) return logs.value
  const kw = filterKeyword.value.toLowerCase()
  return logs.value.filter(log =>
    (log.title && log.title.toLowerCase().includes(kw)) ||
    (log.remark && log.remark.toLowerCase().includes(kw))
  )
})

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
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

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
    case 'feedback': {
      let text = log.targetType === 'task' ? '反馈了任务' : '反馈了缺陷'
      if (log.oldAssignee && log.newAssignee) {
        text += `，负责人从「${log.oldAssignee}」交还给「${log.newAssignee}」`
      }
      return text
    }
    case 'transfer': {
      let text = log.targetType === 'task' ? '转交了任务' : '转交了缺陷'
      if (log.oldAssignee && log.newAssignee) {
        text += `，负责人从「${log.oldAssignee}」变更为「${log.newAssignee}」`
      }
      return text
    }
    case 'fix':
      return '标记缺陷为已修复'
    case 'verify':
      return '验证通过'
    case 'reject': {
      let text = log.targetType === 'task' ? '打回了任务' : '打回了缺陷'
      if (log.oldAssignee && log.newAssignee && log.oldAssignee !== log.newAssignee) {
        text += `，负责人从「${log.oldAssignee}」变更为「${log.newAssignee}」`
      }
      return text
    }
    case 'restart':
      return log.targetType === 'task' ? '重启了任务' : '重启了缺陷'
    case 'partial_complete':
      return '完成了部分任务'
    case 'submit_test':
      return '提交了测试'
    case 'pass_test':
      return '测试通过，任务已关闭'
    case 'reject_test':
      return '测试打回了任务'
    case 'description_change':
      return log.targetType === 'task' ? '更新了任务描述' : '更新了缺陷描述'
    case 'reproduce_steps_change':
      return '更新了复现步骤'
    case 'category_change':
      return '更改了分类'
    case 'creator_change':
      return `将创建人变更为「${log.newAssignee}」`
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
  if (action === 'feedback') return 'log-assign'
  if (action === 'transfer') return 'log-assign'
  if (action === 'complete' || action === 'partial_complete') return 'log-status'
  if (action === 'close') return 'log-status'
  if (action === 'fix') return 'log-status'
  if (action === 'verify') return 'log-status'
  if (action === 'reject' || action === 'reject_test') return 'log-status'
  if (action === 'submit_test' || action === 'pass_test') return 'log-status'
  return 'log-default'
}

const goToTarget = (log: any) => {
  if (log.targetType === 'task') {
    router.push(`/tasks/${log.targetId}`)
  } else if (log.targetType === 'bug') {
    router.push(`/bugs/${log.targetId}`)
  }
}

const loadLogs = async () => {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (activeTab.value === 'mine' && userStore.user?.id) {
      params.userId = userStore.user.id
    }
    if (filterType.value) params.targetType = filterType.value
    if (filterAction.value) params.action = filterAction.value
    if (filterUser.value) params.userId = filterUser.value
    const res = await getOperationLogs(params)
    logs.value = res.data?.data || []
    total.value = res.data?.total || 0
    if (pendingScrollRestore.value) {
      pendingScrollRestore.value = false
      nextTick(() => {
        const container = document.querySelector('.main-content')
        if (container) container.scrollTop = savedScrollTop.value
      })
    }
  } catch (err) {
    console.error('Failed to load operation logs:', err)
  } finally {
    loading.value = false
  }
}

const handleSizeChange = () => {
  currentPage.value = 1
  loadLogs()
}

watch([activeTab, filterType, filterAction, filterUser], () => {
  currentPage.value = 1
  loadLogs()
})

onMounted(async () => {
  loadLogs()
  try {
    const res = await getUsers()
    users.value = res.data
  } catch {}
})

onActivated(() => {
  pendingScrollRestore.value = true
  loadLogs()
})

onDeactivated(() => {
  const container = document.querySelector('.main-content')
  if (container) savedScrollTop.value = container.scrollTop
})
</script>

<style scoped>
.operation-logs-page {
  background: var(--nb-bg-page);
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--nb-text-primary);
  margin: 0;
}

.content-card {
  background: var(--nb-bg-elevated, #fff);
  border-radius: 12px;
  padding: 0;
  box-shadow: var(--nb-shadow-sm, 0 1px 3px rgba(0,0,0,0.06));
}

.filter-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--nb-border-light, #e2e8f0);
  padding: 0 20px;
}

.filter-tab {
  padding: 12px 20px;
  font-size: 14px;
  color: var(--nb-text-secondary, #4a5568);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.filter-tab:hover {
  color: var(--nb-primary, #667eea);
}

.filter-tab.active {
  color: var(--nb-primary, #667eea);
  border-bottom-color: var(--nb-primary, #667eea);
  font-weight: 500;
}

.table-toolbar {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--nb-border-light, #e2e8f0);
}

.timeline-list {
  padding: 8px 0;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 8px;
  transition: background 0.2s;
}

.timeline-item.clickable {
  cursor: pointer;
}

.timeline-item:hover {
  background: var(--nb-bg-hover, #f7fafc);
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 7px;
  flex-shrink: 0;
}

.timeline-dot.log-create { background: var(--nb-success, #10b981); }
.timeline-dot.log-comment { background: var(--nb-primary, #667eea); }
.timeline-dot.log-status { background: #f59e0b; }
.timeline-dot.log-assign { background: #8b5cf6; }
.timeline-dot.log-priority { background: #3b82f6; }
.timeline-dot.log-severity { background: var(--nb-danger, #ef4444); }
.timeline-dot.log-default { background: var(--nb-text-tertiary, #9ca3af); }

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--nb-text-tertiary, #9ca3af);
  margin-bottom: 4px;
}

.timeline-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 14px;
}

.timeline-action {
  color: var(--nb-text-primary, #1a202c);
  font-size: 14px;
}

.timeline-action.log-status { color: #d97706; }
.timeline-action.log-assign { color: #7c3aed; }
.timeline-action.log-priority { color: #2563eb; }
.timeline-action.log-severity { color: var(--nb-danger, #ef4444); }

.timeline-target {
  color: var(--nb-primary, #667eea);
  font-size: 13px;
  font-weight: 500;
}

.timeline-remark {
  color: var(--nb-text-tertiary, #9ca3af);
  font-size: 13px;
  margin-top: 4px;
  line-height: 1.5;
}

.timeline-user {
  font-size: 12px;
}

.timeline-time {
  font-size: 11px;
}

.tag {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 999px;
  white-space: nowrap;
  background: var(--nb-bg-muted, #f1f5f9);
  color: var(--nb-text-secondary, #4a5568);
}

.empty {
  text-align: center;
  padding: 40px;
  color: var(--nb-text-tertiary, #9ca3af);
}
</style>
