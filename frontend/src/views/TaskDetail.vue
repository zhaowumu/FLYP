<template>
  <div class="task-detail-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
      </div>
    </div>

    <div class="detail-container" v-if="task">
      <div class="main-content">
        <div class="content-card">
          <div class="task-header">
            <div class="task-title-area" v-if="!isEditingTitle">
              <h1>{{ task.title }}</h1>
              <el-button v-if="canEdit" text size="small" @click="startEditTitle" class="edit-btn">
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>
            <div v-else class="task-title-edit">
              <el-input v-model="editTitle" size="large" placeholder="请输入任务标题" @keyup.enter="saveTitle" ref="titleInputRef" />
              <div class="edit-actions">
                <el-button size="small" @click="cancelEditTitle">取消</el-button>
                <el-button size="small" type="primary" @click="saveTitle" :loading="saving">保存</el-button>
              </div>
            </div>
            <div class="task-tags">
              <el-tag :type="getPriorityType(task.priority)" size="small">
                {{ getPriorityText(task.priority) }}
              </el-tag>
              <el-tag :type="getStatusType(task.status)" size="small">
                {{ getStatusText(task.status) }}
              </el-tag>
            </div>
          </div>

          <el-divider />

          <div class="task-description">
            <div class="description-header">
              <h3>任务描述</h3>
              <el-button v-if="canEdit" text size="small" @click="startEditDescription" class="edit-btn">
                <el-icon><Edit /></el-icon>
                {{ task.description ? '编辑' : '添加描述' }}
              </el-button>
            </div>
            <div v-if="!isEditingDescription" class="description-content" v-html="task.description || '<span style=color:var(--nb-text-secondary)>暂无描述</span>'"></div>
            <div v-else class="description-editor">
              <RichEditor
                v-model="editDescription"
                placeholder="请输入任务描述... 支持粘贴图片 (Ctrl+V)"
                :height="300"
              />
              <div class="edit-actions">
                <el-button size="small" @click="cancelEditDescription">取消</el-button>
                <el-button size="small" type="primary" @click="saveDescription" :loading="saving">保存</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="content-card" style="margin-top: 20px; padding-bottom: 80px;">
          <!-- 子任务列表区域 - 仅在有子任务时显示 -->
          <div v-if="task.subtasks && task.subtasks.length > 0" class="subtasks-section">
            <div class="subtasks-header">
              <span class="subtasks-title">
                <el-icon><List /></el-icon>
                子任务列表 ({{ task.subtasks.length }})
              </span>
            </div>
            <div class="subtasks-tree-list">
              <div 
                v-for="(subtask, index) in task.subtasks" 
                :key="subtask.id" 
                class="subtask-tree-item"
                @click="viewSubtask(subtask)"
              >
                <span class="tree-icon">{{ index === task.subtasks.length - 1 ? '└──' : '├──' }}</span>
                <el-tag :type="getStatusType(subtask.status)" size="small" class="subtask-status">
                  {{ getStatusText(subtask.status) }}
                </el-tag>
                <el-tag :type="getPriorityType(subtask.priority)" size="small" class="subtask-priority-tag">
                  {{ getPriorityText(subtask.priority) }}
                </el-tag>
                <span class="subtask-link-title">{{ subtask.title }}</span>
                <el-icon class="arrow-icon"><ArrowRight /></el-icon>
              </div>
            </div>
          </div>

          <el-divider v-if="task.subtasks && task.subtasks.length > 0" />

          <div class="activity-header">
            <span class="activity-title">操作记录</span>
            <span class="activity-count">{{ operationLogs.length }} 条记录</span>
          </div>

          <div class="activity-list">
            <div class="activity-item" v-for="log in operationLogs" :key="log.id">
              <div class="activity-avatar">
                <el-avatar :size="32">{{ log.user?.realName?.charAt(0) || 'U' }}</el-avatar>
              </div>
              <div class="activity-content">
                <div class="activity-info">
                  <span class="activity-user">{{ log.user?.realName || '未知用户' }}</span>
                  <span class="activity-action">{{ formatLogAction(log) }}</span>
                  <span class="activity-time">{{ formatTime(log.createdAt) }}</span>
                </div>
                <div class="activity-remark" v-if="log.remark">
                  <div v-html="renderRemark(log.remark)"></div>
                </div>
              </div>
            </div>
            <el-empty v-if="operationLogs.length === 0" description="暂无操作记录" :image-size="60" />
          </div>
        </div>
      </div>

      <div class="side-content">
        <div class="content-card">
          <h3>基本信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">状态</span>
              <div class="info-value-row">
                <el-tag :type="getStatusType(task.status)" size="small">
                  {{ getStatusText(task.status) }}
                </el-tag>
                <el-button
                  v-if="canChangeStatus"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('changeStatus')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">优先级</span>
              <div class="info-value-row">
                <el-tag :type="getPriorityType(task.priority)" size="small">
                  {{ getPriorityText(task.priority) }}
                </el-tag>
                <el-button
                  v-if="canChangePriority"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('priority')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">当前负责人</span>
              <div class="info-value-row">
                <div class="assignee-display" v-if="task.assignees && task.assignees.length > 0">
                  <el-avatar v-for="a in task.assignees" :key="a.id" :size="24" class="assignee-avatar">{{ a.realName?.charAt(0) }}</el-avatar>
                  <span>{{ task.assignees.map((a: any) => a.realName).join('、') }}</span>
                </div>
                <span v-else class="text-muted">未分配</span>
                <el-button
                  v-if="canManageSidebar && !isClosed"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('editAssignees')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">创建人</span>
              <div class="info-value-row">
                <div class="assignee-display">
                  <el-avatar :size="24">{{ task.creator?.realName?.charAt(0) || '-' }}</el-avatar>
                  <span>{{ task.creator?.realName || '-' }}</span>
                </div>
                <el-button
                  v-if="canManageSidebar && !isClosed"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('editCreator')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">所属项目</span>
              <span class="value">{{ task.project?.name || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">分类</span>
              <div class="info-value-row">
                <el-tag v-if="task.category" type="info" size="small" effect="plain">{{ task.category }}</el-tag>
                <span v-else class="text-muted value">未设置</span>
                <el-button
                  v-if="canManageSidebar && !isClosed"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('editCategory')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">截止日期</span>
              <div class="info-value-row">
                <span class="value">{{ task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未设置' }}</span>
                <el-button
                  v-if="canManageSidebar && !isClosed"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('editDueDate')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatTime(task.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="label">更新时间</span>
              <span class="value">{{ formatTime(task.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 悬浮操作栏 -->
    <div class="floating-action-bar">
      <!-- 完成按钮：只有负责人才能完成 -->
      <el-button 
        v-if="canComplete"
        type="success" 
        @click="showActionPanel('complete')"
      >
        <el-icon><Check /></el-icon>
        完成
      </el-button>
      
      <!-- 重新打开按钮：已完成的任务可以重新打开 -->
      <el-button 
        v-if="canReopen"
        type="warning" 
        @click="showActionPanel('reopen')"
      >
        <el-icon><RefreshRight /></el-icon>
        重新打开
      </el-button>
      
      <!-- 关闭按钮：只有创建人才能关闭 -->
      <el-button 
        v-if="canClose"
        type="info" 
        @click="showActionPanel('close')"
      >
        <el-icon><Close /></el-icon>
        关闭
      </el-button>
      
      <!-- 转交按钮：创建人和负责人都可以转交 -->
      <el-button 
        v-if="canTransfer"
        type="warning" 
        @click="showActionPanel('transfer')"
      >
        <el-icon><Switch /></el-icon>
        转交
      </el-button>
      
      <!-- 备注按钮：任何人都可以添加 -->
      <el-button 
        v-if="canComment"
        type="primary" 
        plain 
        @click="showActionPanel('comment')"
      >
        <el-icon><ChatDotRound /></el-icon>
        备注
      </el-button>
      
      <!-- 延期按钮：仅管理员和项目经理 -->
      <el-button 
        v-if="canExtend"
        type="warning" 
        plain 
        @click="showActionPanel('extend')"
      >
        <el-icon><Clock /></el-icon>
        延期
      </el-button>
      
      <!-- 删除按钮：只有创建人才能删除 -->
      <el-button 
        v-if="canDelete"
        type="danger" 
        plain 
        @click="confirmDelete"
      >
        <el-icon><Delete /></el-icon>
        删除
      </el-button>
    </div>

    <!-- 操作面板弹窗 - 从右侧弹出 -->
    <el-drawer
      v-model="showPanel"
      :title="getActionTitle(currentAction)"
      direction="rtl"
      size="85%"
      :close-on-click-modal="true"
      @closed="onDrawerClosed"
    >
      <div class="drawer-content">
        <div class="drawer-body-scroll">
          <!-- 转交：选择负责人 -->
          <div class="form-section" v-if="currentAction === 'transfer'">
            <span class="label">转交给</span>
            <el-select 
              v-model="transferUserId" 
              placeholder="请选择负责人" 
              style="width: 100%"
            >
              <el-option
                v-for="user in users"
                :key="user.id"
                :label="user.realName"
                :value="user.id"
              />
            </el-select>
          </div>

          <!-- 更改优先级 -->
          <div class="form-section" v-if="currentAction === 'priority'">
            <span class="label">新优先级</span>
            <el-select 
              v-model="newPriority" 
              placeholder="请选择优先级" 
              style="width: 100%"
            >
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
              <el-option label="紧急" value="urgent" />
            </el-select>
          </div>

          <!-- 更改状态 -->
          <div class="form-section" v-if="currentAction === 'changeStatus'">
            <span class="label">新状态</span>
            <el-select 
              v-model="newStatus" 
              placeholder="请选择状态" 
              style="width: 100%"
            >
              <el-option label="待处理" value="pending" :disabled="task?.status === 'pending'" />
              <el-option label="进行中" value="in_progress" :disabled="task?.status === 'in_progress'" />
              <el-option label="已完成" value="completed" :disabled="task?.status === 'completed'" />
              <el-option label="已关闭" value="closed" :disabled="task?.status === 'closed'" />
            </el-select>
          </div>

          <!-- 延期 -->
          <div class="form-section" v-if="currentAction === 'extend'">
            <span class="label">当前截止日期</span>
            <div style="margin-bottom: var(--nb-space-3); color: var(--nb-text-secondary); font-size: var(--nb-font-size-base);">
              {{ task?.dueDate ? new Date(task.dueDate).toLocaleString() : '未设置' }}
            </div>
            <span class="label">新截止日期</span>
            <el-date-picker
              v-model="newDueDate"
              type="datetime"
              placeholder="选择新的截止日期"
              style="width: 100%"
              format="YYYY-MM-DD HH:mm"
            />
          </div>

          <!-- 编辑负责人 -->
          <div class="form-section" v-if="currentAction === 'editAssignees'">
            <span class="label">选择负责人</span>
            <el-select 
              v-model="editAssigneeIds" 
              placeholder="请选择负责人" 
              multiple
              style="width: 100%"
            >
              <el-option
                v-for="user in users"
                :key="user.id"
                :label="user.realName"
                :value="user.id"
              />
            </el-select>
          </div>

          <!-- 编辑创建人 -->
          <div class="form-section" v-if="currentAction === 'editCreator'">
            <span class="label">选择创建人</span>
            <el-select 
              v-model="editCreatorId" 
              placeholder="请选择创建人" 
              style="width: 100%"
            >
              <el-option
                v-for="user in users"
                :key="user.id"
                :label="user.realName"
                :value="user.id"
              />
            </el-select>
          </div>

          <!-- 编辑截止日期 -->
          <div class="form-section" v-if="currentAction === 'editDueDate'">
            <span class="label">截止日期</span>
            <el-date-picker
              v-model="editDueDate"
              type="datetime"
              placeholder="选择截止日期"
              style="width: 100%"
              format="YYYY-MM-DD HH:mm"
            />
          </div>

          <!-- 编辑分类 -->
          <div class="form-section" v-if="currentAction === 'editCategory'">
            <span class="label">分类</span>
            <el-select
              v-model="editCategory"
              placeholder="请选择或输入分类"
              filterable
              allow-create
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="cat in categories"
                :key="cat"
                :label="cat"
                :value="cat"
              />
            </el-select>
          </div>

          <!-- 重新打开 -->
          <div class="form-section" v-if="currentAction === 'reopen'">
            <el-alert 
              title="确认重新打开任务" 
              type="warning" 
              :closable="false"
              show-icon
            >
              <template #default>
                任务将被重新打开，状态将变为"进行中"
              </template>
            </el-alert>
          </div>
          
          <!-- 备注编辑器 -->
          <div class="editor-section">
            <span class="label">备注（可选）</span>
            <div class="editor-wrapper">
              <RichEditor
                :key="editorKey"
                v-model="commentText"
                placeholder="输入备注内容... 支持粘贴图片 (Ctrl+V)"
                :height="0"
                :showToolbar="true"
              />
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <el-button @click="closeActionPanel">取消</el-button>
          <el-button type="primary" @click="executeAction" :loading="submitting">
            {{ getActionConfirmText(currentAction) }}
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTask, updateTaskStatus, addComment as addTaskComment, updateTask, deleteTask, extendDueDate as extendTaskDueDate, getTaskCategories } from '../api/task'
import { getUsers } from '../api/user'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const task = ref<any>(null)
const users = ref<any[]>([])
const commentText = ref('')
const editorKey = ref(0)
const submitting = ref(false)
const currentAction = ref<string | null>(null)
const showPanel = ref(false)
const transferUserId = ref<number | null>(null)
const newPriority = ref('')
const newStatus = ref('')
const isEditingTitle = ref(false)
const editTitle = ref('')
const isEditingDescription = ref(false)
const editDescription = ref('')
const saving = ref(false)
const titleInputRef = ref()
const newDueDate = ref<Date | null>(null)
const editAssigneeIds = ref<number[]>([])
const editCreatorId = ref<number | null>(null)
const editDueDate = ref<Date | null>(null)
const categories = ref<string[]>([])
const editCategory = ref('')

const operationLogs = computed(() => {
  return task.value?.operationLogs || []
})

// 角色判断
const currentUserId = computed(() => userStore.user?.id)
const isCreator = computed(() => task.value?.creator?.id === currentUserId.value)
const isAssignee = computed(() => task.value?.assignees?.some((a: any) => a.id === currentUserId.value))
const isParticipant = computed(() => isCreator.value || isAssignee.value)
const isProjectManager = computed(() => task.value?.project?.manager?.id === currentUserId.value)
const isAdmin = computed(() => userStore.user?.role === 'admin')
const canManageSidebar = computed(() => isAdmin.value || userStore.user?.role === 'project_manager')

// 可编辑权限：当前负责人、创建人、项目经理、管理员，或拥有删除权限的角色
const canEdit = computed(() => isAssignee.value || isCreator.value || isProjectManager.value || isAdmin.value || canDelete.value)

// 状态判断
const isClosed = computed(() => task.value?.status === 'closed')
const isCompleted = computed(() => task.value?.status === 'completed')
const isActive = computed(() => !isClosed.value && !isCompleted.value)

// 按钮权限配置（角色权限 + 关系权限）
// extra 需传入实际关系布尔值，不能用字面量 true
const canComplete = computed(() => userStore.getTaskPermission('complete', { isAssignee: isAssignee.value }) && isAssignee.value && isActive.value)
const canReopen = computed(() => userStore.getTaskPermission('reopen', { isCreator: isCreator.value }) && isCompleted.value)
const canClose = computed(() => userStore.getTaskPermission('close', { isCreator: isCreator.value }) && !isClosed.value)
const canTransfer = computed(() => userStore.getTaskPermission('transfer', { isAssignee: isAssignee.value, isCreator: isCreator.value }) && !isClosed.value)
const canChangePriority = computed(() => userStore.getTaskPermission('changePriority', { isCreator: isCreator.value }) && !isClosed.value)
const canChangeStatus = computed(() => userStore.getTaskPermission('changeStatus', { isCreator: isCreator.value }) && !isClosed.value)
const canComment = computed(() => userStore.getTaskPermission('comment'))
const canDelete = computed(() => userStore.getTaskPermission('delete'))
const canExtend = computed(() => userStore.getTaskPermission('extendDueDate') && !isClosed.value)

const getPriorityType = (priority: string) => {
  const map: Record<string, string> = {
    low: 'info', medium: 'warning', high: 'danger', urgent: 'danger'
  }
  return map[priority] || 'info'
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    low: '低', medium: '中', high: '高', urgent: '紧急'
  }
  return map[priority] || priority
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info', in_progress: 'warning', completed: 'success', closed: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理', in_progress: '进行中', completed: '已完成', closed: '已关闭'
  }
  return map[status] || status
}

const formatLogAction = (log: any) => {
  const { action, oldStatus, newStatus, oldPriority, newPriority, oldAssignee, newAssignee, remark, oldDueDate, newDueDate } = log
  
  switch (action) {
    case 'create':
      return '创建了任务'
    case 'status_change': {
      let text = `将状态从「${getStatusText(oldStatus || 'pending')}」变更为「${getStatusText(newStatus)}」`
      if (oldAssignee && newAssignee) {
        text += `，负责人从「${oldAssignee}」变更为「${newAssignee}」`
      } else if (newAssignee) {
        text += `，负责人变更为「${newAssignee}」`
      }
      return text
    }
    case 'priority_change':
      return `将优先级从「${getPriorityText(oldPriority || 'medium')}」调整为「${getPriorityText(newPriority)}」`
    case 'assign':
      return `将负责人从「${oldAssignee || '未处理'}」变更为「${newAssignee}」`
    case 'creator_change':
      return `将创建人从「${oldAssignee || '未知'}」变更为「${newAssignee}」`
    case 'complete': {
      let text = '完成了任务'
      if (oldAssignee && newAssignee && oldAssignee !== newAssignee) {
        text += `，负责人从「${oldAssignee}」变更为「${newAssignee}」`
      }
      return text
    }
    case 'partial_complete': {
      let text = '完成了部分任务'
      if (oldAssignee && newAssignee && oldAssignee !== newAssignee) {
        text += `，已从负责人「${oldAssignee}」中退出`
      }
      return text
    }
    case 'close':
      return '关闭了任务'
    case 'comment':
      return '添加了备注'
    case 'extend_due_date':
      return `将截止日期从「${formatTime(oldDueDate)}」延期至「${formatTime(newDueDate)}」`
    case 'due_date_change':
      return `将截止日期从「${formatTime(oldDueDate)}」变更为「${formatTime(newDueDate)}」`
    case 'category_change':
      return '更改了分类'
    default:
      return action
  }
}

const getActionTitle = (action: string) => {
  const map: Record<string, string> = {
    complete: '完成任务',
    reopen: '重新打开任务',
    close: '关闭任务',
    transfer: '转交任务',
    priority: '更改优先级',
    changeStatus: '更改状态',
    comment: '添加备注',
    extend: '延期任务',
    editAssignees: '编辑负责人',
    editCreator: '编辑创建人',
    editDueDate: '编辑截止日期',
    editCategory: '编辑分类',
  }
  return map[action] || action
}

const getActionConfirmText = (action: string) => {
  const map: Record<string, string> = {
    complete: '确认完成',
    reopen: '确认重新打开',
    close: '确认关闭',
    transfer: '确认转交',
    priority: '确认修改',
    changeStatus: '确认修改',
    comment: '添加备注',
    extend: '确认延期',
    editAssignees: '确认修改',
    editCreator: '确认修改',
    editDueDate: '确认修改',
    editCategory: '确认修改',
  }
  return map[action] || '确认'
}

const formatTime = (time: string | Date) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString()
}

const renderRemark = (remark: string) => {
  if (!remark) return ''
  if (remark.includes('<') && remark.includes('>')) {
    return remark
  }
  return remark.replace(/\[图片\]/g, '<span style="color:var(--nb-primary)">[图片]</span>')
}

const goBack = () => {
  router.push('/tasks')
}

const loadTask = async () => {
  try {
    const id = parseInt(route.params.id as string)
    const res = await getTask(id)
    task.value = res.data
  } catch (error) {
    ElMessage.error('加载任务详情失败')
  }
}

const loadUsers = async () => {
  try {
    const res = await getUsers()
    users.value = res.data
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

const loadCategories = async () => {
  try {
    const res = await getTaskCategories()
    categories.value = res.data
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

const startEditTitle = () => {
  editTitle.value = task.value.title
  isEditingTitle.value = true
  nextTick(() => {
    titleInputRef.value?.focus()
  })
}

const cancelEditTitle = () => {
  isEditingTitle.value = false
  editTitle.value = ''
}

const saveTitle = async () => {
  if (!editTitle.value.trim()) {
    ElMessage.warning('标题不能为空')
    return
  }
  saving.value = true
  try {
    await updateTask(task.value.id, { title: editTitle.value.trim() })
    task.value.title = editTitle.value.trim()
    isEditingTitle.value = false
    ElMessage.success('标题已更新')
  } catch (error) {
    ElMessage.error('更新标题失败')
  } finally {
    saving.value = false
  }
}

const startEditDescription = () => {
  editDescription.value = task.value.description || ''
  isEditingDescription.value = true
}

const cancelEditDescription = () => {
  isEditingDescription.value = false
  editDescription.value = ''
}

const saveDescription = async () => {
  saving.value = true
  try {
    await updateTask(task.value.id, { description: editDescription.value })
    task.value.description = editDescription.value
    isEditingDescription.value = false
    ElMessage.success('描述已更新')
  } catch (error) {
    ElMessage.error('更新描述失败')
  } finally {
    saving.value = false
  }
}

const showActionPanel = (action: string) => {
  commentText.value = ''
  transferUserId.value = null
  newPriority.value = task.value?.priority || 'medium'
  newStatus.value = task.value?.status || ''
  newDueDate.value = task.value?.dueDate ? new Date(task.value.dueDate) : null
  editAssigneeIds.value = task.value?.assignees?.map((a: any) => a.id) || []
  editCreatorId.value = task.value?.creator?.id || null
  editDueDate.value = task.value?.dueDate ? new Date(task.value.dueDate) : null
  editCategory.value = task.value?.category || ''
  currentAction.value = action
  showPanel.value = true
}

const closeActionPanel = () => {
  showPanel.value = false
  commentText.value = ''
  editorKey.value++
}

const onDrawerClosed = () => {
  currentAction.value = null
  transferUserId.value = null
  newPriority.value = ''
  newStatus.value = ''
  newDueDate.value = null
  editAssigneeIds.value = []
  editCreatorId.value = null
  editDueDate.value = null
  editCategory.value = ''
}

const executeAction = async () => {
  if (currentAction.value === 'transfer' && !transferUserId.value) {
    ElMessage.warning('请选择负责人')
    return
  }

  if (currentAction.value === 'priority' && newPriority.value === task.value.priority) {
    ElMessage.warning('请选择不同的优先级')
    return
  }

  if (currentAction.value === 'extend') {
    if (!newDueDate.value) {
      ElMessage.warning('请选择新的截止日期')
      return
    }
    if (task.value.dueDate && newDueDate.value.getTime() <= new Date(task.value.dueDate).getTime()) {
      ElMessage.warning('新截止日期必须晚于当前截止日期')
      return
    }
  }

  submitting.value = true
  try {
    switch (currentAction.value) {
      case 'complete': {
        const isMultiAssignee = (task.value.assignees?.length || 0) > 1
        await updateTaskStatus(task.value.id, 'completed', {
          action: 'complete',
          remark: commentText.value || ''
        })
        ElMessage.success(isMultiAssignee ? '已从负责人列表退出，任务继续由其他负责人跟进' : '任务已完成')
        break
      }

      case 'reopen': {
        await updateTaskStatus(task.value.id, 'in_progress', {
          action: 'status_change',
          remark: commentText.value || ''
        })
        ElMessage.success('任务已重新打开')
        break
      }

      case 'close': {
        await updateTaskStatus(task.value.id, 'closed', {
          action: 'close',
          remark: commentText.value || ''
        })
        ElMessage.success('任务已关闭')
        break
      }

      case 'transfer': {
        await updateTask(task.value.id, {
          assigneeIds: [transferUserId.value],
          log: { remark: commentText.value || '' }
        })
        ElMessage.success('转交成功')
        break
      }

      case 'priority': {
        await addTaskComment(task.value.id, {
          action: 'priority_change',
          oldPriority: task.value.priority,
          newPriority: newPriority.value,
          remark: commentText.value || ''
        })
        ElMessage.success('优先级已更新')
        break
      }

      case 'changeStatus': {
        if (!newStatus.value) {
          ElMessage.warning('请选择状态')
          submitting.value = false
          return
        }
        await updateTaskStatus(task.value.id, newStatus.value, {
          action: 'status_change',
          remark: commentText.value || ''
        })
        ElMessage.success('状态已更新')
        break
      }

      case 'comment': {
        const hasContent = commentText.value.replace(/<[^>]*>/g, '').trim() || commentText.value.includes('<img') || commentText.value.includes('<video')
        if (!hasContent) {
          ElMessage.warning('请输入备注内容')
          submitting.value = false
          return
        }
        await addTaskComment(task.value.id, {
          action: 'comment',
          remark: commentText.value
        })
        ElMessage.success('备注添加成功')
        break
      }

      case 'extend': {
        const oldDueDate = task.value.dueDate
        await extendTaskDueDate(task.value.id, {
          newDueDate: newDueDate.value.toISOString(),
          remark: commentText.value || ''
        })
        ElMessage.success(`截止日期已从 ${formatTime(oldDueDate)} 延期至 ${formatTime(newDueDate.value)}`)
        break
      }

      case 'editAssignees': {
        await updateTask(task.value.id, {
          assigneeIds: editAssigneeIds.value,
          log: { remark: commentText.value || '' }
        })
        ElMessage.success('负责人已更新')
        break
      }

      case 'editCreator': {
        if (!editCreatorId.value) {
          ElMessage.warning('请选择创建人')
          submitting.value = false
          return
        }
        await updateTask(task.value.id, {
          creatorId: editCreatorId.value,
          log: { remark: commentText.value || '' }
        })
        ElMessage.success('创建人已更新')
        break
      }

      case 'editDueDate': {
        await updateTask(task.value.id, {
          dueDate: editDueDate.value ? editDueDate.value.toISOString() : null
        })
        ElMessage.success(editDueDate.value ? '截止日期已更新' : '截止日期已清除')
        break
      }

      case 'editCategory': {
        await updateTask(task.value.id, { category: editCategory.value || null })
        ElMessage.success('分类已更新')
        break
      }
    }

    closeActionPanel()
    await loadTask()
  } catch (error) {
    console.error('Action error:', error)
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

// 子任务相关方法
const viewSubtask = (subtask: any) => {
  router.push(`/tasks/${subtask.id}`)
}

const goToTaskList = () => {
  router.push('/tasks')
}

const confirmDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个任务吗？此操作不可恢复。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteTask(task.value.id)
    ElMessage.success('任务已删除')
    router.push('/tasks')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete task error:', error)
      ElMessage.error('删除任务失败')
    }
  }
}

onMounted(() => {
  loadTask()
  loadUsers()
  loadCategories()
})

// 监听路由参数变化，重新加载任务数据
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadTask()
  }
})
</script>

<style scoped>
.task-detail-page {
  padding: 0;
  background: var(--nb-bg-page);
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: var(--nb-space-4);
  background: var(--nb-bg-elevated);
  padding: var(--nb-space-4) var(--nb-space-5);
  border-radius: var(--nb-radius-md);
}

.detail-container {
  display: flex;
  gap: var(--nb-space-4);
}

.main-content {
  flex: 1;
  min-width: 0;
}

.side-content {
  width: 280px;
  flex-shrink: 0;
}

.content-card {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  padding: var(--nb-space-5);
  box-shadow: var(--nb-shadow-sm);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--nb-space-4);
  padding-bottom: var(--nb-space-4);
  border-bottom: 1px solid var(--nb-border);
}

.task-title-area {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  flex: 1;
}

.task-header h1 {
  font-size: var(--nb-font-size-2xl);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0;
  flex: 1;
  line-height: var(--nb-line-height-tight);
}

.edit-btn {
  color: var(--nb-text-secondary);
  padding: var(--nb-space-1);
  border-radius: var(--nb-radius-sm);
  transition: all var(--nb-transition-normal);
}

.edit-btn:hover {
  color: var(--nb-primary);
  background: var(--nb-primary-lighter);
}

.task-title-edit {
  flex: 1;
}

.task-title-edit .el-input {
  margin-bottom: var(--nb-space-2);
}

.task-title-edit .edit-actions,
.description-editor .edit-actions {
  display: flex;
  gap: var(--nb-space-2);
  justify-content: flex-end;
}

.description-editor {
  margin-top: var(--nb-space-3);
}

.description-editor .edit-actions {
  margin-top: var(--nb-space-3);
}

.task-tags {
  display: flex;
  gap: var(--nb-space-2);
  flex-shrink: 0;
}

.task-description {
  padding-top: var(--nb-space-4);
}

.description-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-3);
}

.task-description h3 {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-secondary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.task-description h3::before {
  content: '';
  width: 4px;
  height: 16px;
  background: var(--nb-primary);
  border-radius: 2px;
}

.description-content {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-regular);
  line-height: var(--nb-line-height-relaxed);
  padding: var(--nb-space-4);
  background: var(--nb-bg-muted);
  border-radius: var(--nb-radius-md);
  min-height: 80px;
}

.description-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  margin: var(--nb-space-2) 0;
}

.description-content :deep(video) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  margin: var(--nb-space-2) 0;
  display: block;
  background: #000;
}

/* 子任务区域 */
.subtasks-section {
  margin-bottom: var(--nb-space-5);
}

.subtasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-4);
}

.subtasks-title {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-regular);
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.subtasks-tree-list {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-2);
}

.subtask-tree-item {
  display: flex;
  align-items: center;
  gap: var(--nb-space-3);
  padding: var(--nb-space-3) var(--nb-space-4);
  background: var(--nb-bg-hover);
  border-radius: var(--nb-radius-md);
  cursor: pointer;
  transition: all var(--nb-transition-normal);
  border: 1px solid transparent;
}

.subtask-tree-item:hover {
  background: var(--nb-primary-lighter);
  border-color: var(--nb-primary-light);
}

.tree-icon {
  font-family: var(--nb-font-mono);
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
  flex-shrink: 0;
}

.subtask-status {
  flex-shrink: 0;
}

.subtask-priority-tag {
  flex-shrink: 0;
}

.subtask-link-title {
  flex: 1;
  font-size: var(--nb-font-size-base);
  color: var(--nb-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--nb-transition-fast);
}

.subtask-tree-item:hover .subtask-link-title {
  color: var(--nb-primary);
}

.arrow-icon {
  color: var(--nb-text-placeholder);
  font-size: var(--nb-font-size-sm);
  transition: color var(--nb-transition-fast);
}

.subtask-tree-item:hover .arrow-icon {
  color: var(--nb-primary);
}

/* 操作记录 */
.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nb-space-4) 0;
}

.activity-title {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-regular);
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.activity-count {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-3);
}

.activity-item {
  display: flex;
  gap: var(--nb-space-3);
  padding: var(--nb-space-3);
  background: var(--nb-bg-muted);
  border-radius: var(--nb-radius-md);
  transition: background var(--nb-transition-fast);
}

.activity-item:hover {
  background: var(--nb-bg-hover);
}

.activity-avatar {
  flex-shrink: 0;
}

.activity-avatar :deep(.el-avatar) {
  background: var(--nb-gradient-primary);
  color: white;
  font-weight: var(--nb-font-weight-medium);
  font-size: var(--nb-font-size-sm);
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-info {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  flex-wrap: wrap;
  margin-bottom: var(--nb-space-1);
}

.activity-user {
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
  font-size: var(--nb-font-size-base);
}

.activity-action {
  color: var(--nb-text-regular);
  font-size: var(--nb-font-size-base);
}

.activity-time {
  color: var(--nb-text-placeholder);
  font-size: var(--nb-font-size-sm);
  margin-left: auto;
}

.activity-remark {
  background: var(--nb-bg-elevated);
  border-radius: var(--nb-radius-sm);
  padding: var(--nb-space-3) var(--nb-space-3);
  font-size: var(--nb-font-size-base);
  color: var(--nb-text-regular);
  line-height: var(--nb-line-height-relaxed);
  word-break: break-word;
  border: 1px solid var(--nb-border);
}

.activity-remark :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  margin: var(--nb-space-2) 0;
}

.activity-remark :deep(video) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  margin: var(--nb-space-2) 0;
  display: block;
  background: #000;
}

.activity-remark :deep(p) {
  margin: var(--nb-space-1) 0;
}

/* 侧边栏 */
.side-content .content-card {
  position: sticky;
  top: var(--nb-space-5);
}

.side-content h3 {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0 0 var(--nb-space-4) 0;
  padding-bottom: var(--nb-space-3);
  border-bottom: 1px solid var(--nb-border);
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.side-content h3::before {
  content: '';
  width: 4px;
  height: 16px;
  background: var(--nb-primary);
  border-radius: 2px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-2);
}

.info-item .label {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
  font-weight: var(--nb-font-weight-medium);
}

.info-item .value {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
}

.info-value-row {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.inline-edit-btn {
  color: var(--nb-text-placeholder);
  padding: 2px;
  border-radius: var(--nb-radius-sm);
  transition: all var(--nb-transition-fast);
}

.inline-edit-btn:hover {
  color: var(--nb-primary);
  background: var(--nb-primary-lighter);
}

.assignee-display {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
}

.assignee-display .el-avatar {
  background: var(--nb-primary);
}

.text-muted {
  color: var(--nb-text-placeholder);
  font-size: var(--nb-font-size-md);
}

/* 悬浮操作栏 */
.floating-action-bar {
  position: fixed;
  bottom: var(--nb-space-6);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--nb-space-3);
  padding: var(--nb-space-4) var(--nb-space-6);
  background: var(--nb-bg-elevated);
  border-radius: 50px;
  box-shadow: var(--nb-shadow-lg);
  z-index: var(--nb-z-sticky);
}

.floating-action-bar .el-button {
  border-radius: var(--nb-radius-full);
  padding: var(--nb-space-3) var(--nb-space-5);
  font-weight: var(--nb-font-weight-medium);
}

/* 操作面板 */
.form-section {
  margin-bottom: var(--nb-space-5);
}

.form-section .label {
  display: block;
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-regular);
  margin-bottom: var(--nb-space-2);
  font-weight: var(--nb-font-weight-medium);
}

/* 空状态 */
:deep(.el-empty) {
  padding: var(--nb-space-10) 0;
}

:deep(.el-empty__description) {
  margin-top: var(--nb-space-2);
}

/* 分割线 */
:deep(.el-divider) {
  margin: 0;
}

:deep(.el-divider--horizontal) {
  margin: var(--nb-space-4) 0;
}

/* Drawer 样式 */
:deep(.el-drawer__body) {
  padding: 0;
  height: calc(100% - 56px);
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-body-scroll {
  flex: 1;
  overflow: hidden;
  padding: var(--nb-space-5);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.drawer-body-scroll .label {
  display: block;
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
  margin-bottom: var(--nb-space-3);
}

.drawer-body-scroll .form-section {
  margin-bottom: var(--nb-space-5);
  flex-shrink: 0;
}

.drawer-body-scroll .editor-section {
  margin-top: var(--nb-space-3);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.editor-wrapper {
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-md);
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--nb-space-3);
  padding: var(--nb-space-4) var(--nb-space-5);
  border-top: 1px solid var(--nb-border);
  background: var(--nb-bg-muted);
  flex-shrink: 0;
}
</style>
