<template>
  <div class="operation-logs-page">
    <div class="page-header">
      <h2>操作历史</h2>
      <div class="header-actions">
        <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="任务" value="task" />
          <el-option label="缺陷" value="bug" />
        </el-select>
        <el-select v-model="filterAction" placeholder="全部操作" clearable style="width: 130px">
          <el-option label="全部" value="" />
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
        </el-select>
      </div>
    </div>

    <div class="timeline-list">
      <div v-for="log in filteredLogs" :key="log.id" class="timeline-item clickable" @click="goToTarget(log)">
        <div class="timeline-dot" :class="getLogActionClass(log.action)"></div>
        <div class="timeline-content">
          <div class="timeline-main">
            <span class="timeline-user">{{ log.user?.realName || '未知' }}</span>
            <span class="timeline-action" :class="getLogActionClass(log.action)">{{ getLogActionText(log) }}</span>
            <span class="timeline-target" v-if="log.title">《{{ log.title }}》</span>
          </div>
          <div class="timeline-meta">
            <span class="timeline-type tag">{{ log.targetType === 'task' ? '任务' : '缺陷' }}</span>
            <span class="timeline-time">{{ formatLogTime(log.createdAt) }}</span>
          </div>
        </div>
      </div>
      <div v-if="filteredLogs.length === 0" class="empty">暂无操作记录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getOperationLogs } from '../api/operationLog'

const router = useRouter()
const logs = ref<any[]>([])
const filterType = ref('')
const filterAction = ref('')

const statusTextMap: Record<string, string> = {
  pending: '待处理', in_progress: '进行中', completed: '已完成', closed: '已关闭',
  assigned: '已分配', fixing: '修复中', fixed: '已修复', verified: '已验证'
}
const priorityTextMap: Record<string, string> = { low: '低', medium: '中', high: '高', urgent: '紧急' }
const severityTextMap: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }

const filteredLogs = computed(() => {
  let result = logs.value
  if (filterType.value) {
    result = result.filter(log => log.targetType === filterType.value)
  }
  if (filterAction.value) {
    result = result.filter(log => log.action === filterAction.value)
  }
  return result
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

onMounted(async () => {
  try {
    const res = await getOperationLogs({ limit: 100 })
    logs.value = res.data?.data || res.data || []
  } catch (err) {
    console.error('Failed to load operation logs:', err)
  }
})
</script>

<style scoped>
.operation-logs-page {
  padding: 24px;
  background: var(--nb-bg-page, #f5f7fa);
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
  color: var(--nb-text-primary, #1a202c);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.timeline-list {
  background: white;
  border-radius: 12px;
  padding: 8px 0;
  max-width: 900px;
  margin: 0 auto;
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

.timeline-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 14px;
}

.timeline-user {
  font-weight: 500;
  color: var(--nb-text-primary, #1a202c);
}

.timeline-action {
  color: var(--nb-text-secondary, #4a5568);
  font-size: 13px;
}

.timeline-action.log-status { color: #d97706; }
.timeline-action.log-assign { color: #7c3aed; }
.timeline-action.log-priority { color: #2563eb; }
.timeline-action.log-severity { color: var(--nb-danger, #ef4444); }

.timeline-target {
  color: var(--nb-primary, #667eea);
  font-size: 12px;
  font-weight: 500;
  margin-left: 4px;
  max-width: 300px;
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
  color: var(--nb-text-tertiary, #9ca3af);
}

.timeline-type {
  font-size: 11px;
  padding: 1px 6px;
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
