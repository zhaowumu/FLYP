<template>
  <div class="tasks-page">
    <div class="page-header">
      <div class="header-left">
        <h2>任务管理</h2>
        <p>管理所有任务</p>
      </div>
      <el-button type="primary" @click="showCreateDialog" v-if="userStore.getTaskPermission('create')">
        <el-icon><Plus /></el-icon>
        新建任务
      </el-button>
    </div>

    <div class="content-card">
      <div class="filter-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="filter-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </div>
      </div>

      <div class="table-toolbar">
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 150px">
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value">
            <span class="status-dot" :style="{ backgroundColor: statusColorMap[opt.value] }"></span>
            {{ opt.label }}
          </el-option>
        </el-select>
        <el-select v-model="filterPriority" placeholder="优先级筛选" clearable style="width: 150px">
          <el-option label="低" value="low" />
          <el-option label="中" value="medium" />
          <el-option label="高" value="high" />
          <el-option label="紧急" value="urgent" />
        </el-select>
        <el-select v-if="userStore.isAdmin || userStore.user?.role === 'project_manager'" v-model="filterUser" placeholder="按负责人筛选" clearable style="width: 150px">
          <el-option
            v-for="user in users"
            :key="user.id"
            :label="user.realName"
            :value="user.id"
          />
        </el-select>
        <el-select v-model="filterCategory" placeholder="分类筛选" clearable style="width: 150px">
          <el-option
            v-for="cat in categories"
            :key="cat"
            :label="cat"
            :value="cat"
          />
        </el-select>
      </div>

      <el-table 
        :data="treeTasks" 
        style="width: 100%"
        row-key="id"
        :tree-props="{ children: 'subtasks', hasChildren: 'hasSubtasks' }"
        :default-expand-all="true"
        :indent="32"
        class="task-tree-table"
        @row-click="handleRowClick"
      >
        <el-table-column label="#" width="60">
          <template #default="{ row }">
            <span class="text-muted">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="任务名称" min-width="300">
          <template #default="{ row }">
            <div class="task-cell">
              <span class="task-name">{{ row.title }}</span>
              <el-tag 
                v-if="row.level === 0 && row.subtasks && row.subtasks.length > 0" 
                size="small" 
                type="warning" 
                effect="dark"
                class="main-task-tag"
              >
                主任务
              </el-tag>
              <el-tag 
                v-else-if="row.level === 1" 
                size="small" 
                type="primary" 
                effect="light"
                class="sub-task-tag level-2"
              >
                二级任务
              </el-tag>
              <el-tag 
                v-else-if="row.level === 2" 
                size="small" 
                type="info" 
                effect="light"
                class="sub-task-tag level-3"
              >
                三级任务
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.category" type="info" size="small" effect="plain">{{ row.category }}</el-tag>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small">
              {{ getPriorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="200">
          <template #default="{ row }">
            <div v-if="row.assignees && row.assignees.length > 0" class="assignee-cell">
              <el-avatar v-for="a in row.assignees" :key="a.id" :size="24" :src="a.avatar || undefined" class="assignee-avatar">{{ a.realName?.charAt(0) }}</el-avatar>
              <span>{{ row.assignees.map((a: any) => a.realName).join('、') }}</span>
            </div>
            <span v-else class="text-muted">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="剩余时间" width="130">
          <template #default="{ row }">
            <span v-if="row.dueDate" :class="{ 'overdue': isOverdue(row.dueDate), 'time-remaining': true }">
              {{ getRemainingTime(row.dueDate) }}
            </span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="" width="50" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.level < 2 && userStore.getTaskPermission('create') && row.status !== 'closed'"
              text
              size="small"
              class="subtask-dots"
              @click.stop="showSubtaskDialog(row)"
            >
              <el-icon><MoreFilled /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      title="新建任务"
      width="90%"
      top="2vh"
      destroy-on-close
    >
      <el-form
        ref="taskFormRef"
        :model="taskForm"
        :rules="taskRules"
        label-width="100px"
        class="fullscreen-form"
      >
        <el-form-item label="所属项目" prop="projectId">
          <el-select v-model="taskForm.projectId" placeholder="请选择项目" style="width: 100%">
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="taskForm.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select
            v-model="taskForm.category"
            placeholder="请选择或输入分类（可选）"
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
        </el-form-item>
        <el-form-item label="任务描述" prop="description" class="flex-grow-item">
          <RichEditor
            v-model="taskForm.description"
            placeholder="请输入任务描述... 支持粘贴图片 (Ctrl+V)"
            :height="0"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="taskForm.priority" placeholder="请选择优先级" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="负责人" prop="assigneeIds">
              <el-select v-model="taskForm.assigneeIds" placeholder="请选择负责人" clearable multiple style="width: 100%">
                <el-option
                  v-for="user in users"
                  :key="user.id"
                  :label="user.realName"
                  :value="user.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="截止日期" prop="dueDate">
              <el-date-picker
                v-model="taskForm.dueDate"
                type="date"
                placeholder="选择截止日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTask" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加子任务对话框 -->
    <el-dialog
      v-model="subtaskDialogVisible"
      :title="`添加子任务 - ${parentTask?.title || ''}`"
      width="90%"
      top="2vh"
      destroy-on-close
    >
      <el-form
        ref="subtaskFormRef"
        :model="subtaskForm"
        :rules="subtaskRules"
        label-width="100px"
        class="fullscreen-form"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="subtaskForm.title" placeholder="请输入子任务标题" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description" class="flex-grow-item">
          <RichEditor
            v-model="subtaskForm.description"
            placeholder="请输入子任务描述... 支持粘贴图片 (Ctrl+V)"
            :height="0"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="subtaskForm.priority" placeholder="请选择优先级" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="assigneeIds">
              <el-select v-model="subtaskForm.assigneeIds" placeholder="请选择负责人" clearable multiple style="width: 100%">
                <el-option
                  v-for="user in users"
                  :key="user.id"
                  :label="user.realName"
                  :value="user.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="subtaskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSubtask" :loading="submitting">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTasks, createTask, addSubtask, getTaskCategories } from '../api/task'
import { getProjects } from '../api/project'
import { getUsers } from '../api/user'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const tasks = ref<any[]>([])
const projects = ref<any[]>([])
const users = ref<any[]>([])
const categories = ref<string[]>([])
const dialogVisible = ref(false)
const subtaskDialogVisible = ref(false)
const taskFormRef = ref()
const subtaskFormRef = ref()
const submitting = ref(false)
const filterStatus = ref('')
const filterPriority = ref('')
const filterUser = ref<number | null>(null)
const filterCategory = ref('')
const parentTask = ref<any>(null)
const activeTab = ref(userStore.isPM ? 'all' : 'assigned')

const taskForm = reactive({
  projectId: null as number | null,
  title: '',
  description: '',
  priority: 'medium',
  assigneeIds: [] as number[],
  dueDate: null as Date | null,
  category: ''
})

const subtaskForm = reactive({
  title: '',
  description: '',
  priority: 'medium',
  assigneeIds: [] as number[]
})

const taskRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

const subtaskRules = {
  title: [{ required: true, message: '请输入子任务标题', trigger: 'blur' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

const filteredTasks = computed(() => {
  const userId = userStore.user?.id
  return tasks.value.filter(task => {
    if (activeTab.value === 'my') {
      const isAssignee = task.assignees?.some((a: any) => a.id === userId)
      if (!isAssignee && task.creator?.id !== userId) return false
    } else if (activeTab.value === 'created') {
      if (task.creator?.id !== userId) return false
    } else if (activeTab.value === 'assigned') {
      if (!task.assignees?.some((a: any) => a.id === userId)) return false
    }
    if (filterStatus.value && task.status !== filterStatus.value) return false
    if (filterPriority.value && task.priority !== filterPriority.value) return false
    if (filterUser.value && !task.assignees?.some((a: any) => a.id === filterUser.value)) return false
    if (filterCategory.value && task.category !== filterCategory.value) return false
    return true
  })
})

const tabs = computed(() => {
  const userId = userStore.user?.id
  return [
    { key: 'assigned', label: '我负责的', count: tasks.value.filter((t: any) => t.assignees?.some((a: any) => a.id === userId)).length },
    { key: 'created', label: '我创建的', count: tasks.value.filter((t: any) => t.creator?.id === userId).length },
    { key: 'my', label: '我参与的', count: tasks.value.filter((t: any) => t.assignees?.some((a: any) => a.id === userId) || t.creator?.id === userId).length },
    { key: 'all', label: '全部', count: tasks.value.length },
  ]
})

// 将任务列表转换为树形结构
const treeTasks = computed(() => {
  const taskMap = new Map<number, any>()
  const roots: any[] = []
  
  // 首先创建所有任务的映射
  filteredTasks.value.forEach(task => {
    taskMap.set(task.id, { 
      ...task, 
      subtasks: [],
      hasSubtasks: false
    })
  })
  
  // 构建树形结构
  filteredTasks.value.forEach(task => {
    const node = taskMap.get(task.id)
    if (task.parentTask?.id && taskMap.has(task.parentTask.id)) {
      const parent = taskMap.get(task.parentTask.id)
      if (parent) {
        parent.subtasks = parent.subtasks || []
        parent.subtasks.push(node)
        parent.hasSubtasks = true
      }
    } else {
      roots.push(node)
    }
  })
  
  // 递归设置层级
  const setLevels = (nodes: any[], level: number) => {
    nodes.forEach(node => {
      node.level = level
      if (node.subtasks && node.subtasks.length > 0) {
        setLevels(node.subtasks, level + 1)
      }
    })
  }
  setLevels(roots, 0)
  
  return roots
})

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
    pending: 'primary', in_progress: 'warning', completed: 'success', closed: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理', in_progress: '进行中', completed: '已完成', closed: '已关闭'
  }
  return map[status] || status
}

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已关闭', value: 'closed' }
]

const statusColorMap: Record<string, string> = {
  pending: 'var(--el-color-primary)',
  in_progress: 'var(--el-color-warning)',
  completed: 'var(--el-color-success)',
  closed: 'var(--el-color-info)'
}

const getRemainingTime = (dueDate: Date | string) => {
  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  
  if (diffMs <= 0) {
    const absDiff = Math.abs(diffMs)
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return `已超时${days}天${hours}小时`
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return `剩余${days}天${hours}小时`
}

const isOverdue = (dueDate: Date | string) => {
  const now = new Date()
  const due = new Date(dueDate)
  return due.getTime() < now.getTime()
}

const loadTasks = async () => {
  try {
    const res = await getTasks()
    tasks.value = res.data
  } catch (error) {
    ElMessage.error('加载任务列表失败')
  }
}

const loadCategories = async () => {
  try {
    const res = await getTaskCategories()
    categories.value = res.data
  } catch (error) {
    console.error('Failed to load task categories:', error)
  }
}

const loadProjects = async () => {
  try {
    const res = await getProjects()
    projects.value = res.data
  } catch (error) {
    console.error('Failed to load projects:', error)
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

const showCreateDialog = () => {
  Object.assign(taskForm, {
    projectId: projects.value[0]?.id || null,
    title: '',
    description: '',
    priority: 'medium',
    assigneeIds: [],
    dueDate: null,
    category: ''
  })
  dialogVisible.value = true
}

const handleRowClick = (row: any) => {
  router.push(`/tasks/${row.id}`)
}

const viewTask = (task: any) => {
  router.push(`/tasks/${task.id}`)
}

const showSubtaskDialog = (task: any) => {
  parentTask.value = task
  Object.assign(subtaskForm, {
    title: '',
    description: '',
    priority: 'medium',
    assigneeIds: []
  })
  subtaskDialogVisible.value = true
}

const submitSubtask = async () => {
  if (!subtaskFormRef.value || !parentTask.value) return

  await subtaskFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        await addSubtask(parentTask.value.id, {
          title: subtaskForm.title,
          description: subtaskForm.description,
          priority: subtaskForm.priority,
          assigneeIds: subtaskForm.assigneeIds,
          projectId: parentTask.value.project?.id
        })
        ElMessage.success('子任务添加成功')
        subtaskDialogVisible.value = false
        Object.assign(subtaskForm, {
          title: '',
          description: '',
          priority: 'medium',
          assigneeIds: []
        })
        loadTasks()
      } catch (error) {
        ElMessage.error('添加子任务失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const submitTask = async () => {
  if (!taskFormRef.value) return
  
  await taskFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        await createTask(taskForm)
        ElMessage.success('创建成功')
        dialogVisible.value = false
        loadTasks()
      } catch (error) {
        ElMessage.error('创建失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadTasks()
  loadProjects()
  loadUsers()
  loadCategories()
  // 支持从路由 query 传入 assigneeId 进行过滤
  const queryAssigneeId = route.query.assigneeId
  if (queryAssigneeId) {
    filterUser.value = Number(queryAssigneeId)
  }
})
</script>

<style scoped>
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  vertical-align: middle;
}
.tasks-page {
  padding: var(--nb-space-6);
  background: var(--nb-bg-page);
  min-height: calc(100vh - 80px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-6);
  padding: 0 4px;
}

.page-header .header-left h2 {
  font-size: var(--nb-font-size-2xl);
  font-weight: var(--nb-font-weight-bold);
  color: var(--nb-text-primary);
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
}

.page-header .header-left p {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-secondary);
  margin: 0;
}

.page-header .el-button {
  padding: 10px 20px;
  border-radius: var(--nb-radius-md);
  font-weight: var(--nb-font-weight-medium);
  font-size: var(--nb-font-size-md);
  box-shadow: var(--nb-shadow-primary);
  transition: all var(--nb-transition-fast);
}

.page-header .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(91, 109, 239, 0.35);
}

.content-card {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  box-shadow: var(--nb-shadow-sm);
  overflow: hidden;
  border: var(--nb-card-border);
}

.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 20px 0;
}

.filter-tab {
  padding: var(--nb-space-2) var(--nb-space-4);
  border-radius: var(--nb-radius-md) var(--nb-radius-md) 0 0;
  cursor: pointer;
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-regular);
  transition: all var(--nb-transition-normal);
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  background: transparent;
}

.filter-tab:hover {
  color: var(--nb-primary);
  background: var(--nb-bg-hover);
}

.filter-tab.active {
  color: var(--nb-primary);
  background: var(--nb-bg-hover);
  font-weight: var(--nb-font-weight-semibold);
  border-bottom: 2px solid var(--nb-primary);
}

.tab-count {
  font-size: var(--nb-font-size-sm);
  background: var(--nb-bg-muted);
  color: var(--nb-text-secondary);
  padding: 1px var(--nb-space-2);
  border-radius: var(--nb-radius-full);
  min-width: 20px;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: var(--nb-primary-lighter);
  color: var(--nb-primary);
}

.table-toolbar {
  display: flex;
  gap: var(--nb-space-3);
  padding: var(--nb-space-4) var(--nb-space-5);
  border-bottom: 1px solid var(--nb-border-light);
  background: var(--nb-bg-muted);
}

.table-toolbar .el-select {
  width: 150px;
  border-radius: 8px;
}

.task-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  line-height: 1;
  padding: 4px 0;
}

.task-cell:hover .task-name {
  color: var(--nb-primary);
}

.task-name {
  color: var(--nb-text-primary);
  font-weight: var(--nb-font-weight-medium);
  font-size: var(--nb-font-size-md);
  transition: color var(--nb-transition-fast);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtask-dots {
  flex-shrink: 0;
  margin-left: auto;
  color: var(--nb-text-tertiary);
  padding: 2px 4px;
  border-radius: var(--nb-radius-sm);
  transition: all var(--nb-transition-fast);
}

.subtask-dots:hover {
  color: var(--nb-primary);
  background: var(--nb-primary-lighter);
}

.main-task-tag {
  flex-shrink: 0;
  font-size: 11px;
  padding: 0 8px;
  height: 20px;
  line-height: 20px;
  border-radius: 4px;
}

.sub-task-tag {
  flex-shrink: 0;
  font-size: 10px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
  border-radius: 4px;
}

.sub-task-tag.level-2 {
  color: var(--nb-primary);
  background: var(--nb-primary-lighter);
  border-color: var(--nb-primary-light);
}

.sub-task-tag.level-3 {
  color: var(--nb-text-secondary);
  background: var(--nb-bg-muted);
  border-color: var(--nb-border);
}

.assignee-cell {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  font-size: var(--nb-font-size-base);
  color: var(--nb-text-regular);
  flex-wrap: wrap;
}

.assignee-cell .el-avatar {
  background: var(--nb-gradient-primary);
  font-size: var(--nb-font-size-xs);
  font-weight: var(--nb-font-weight-medium);
}

.assignee-avatar {
  margin-left: -4px;
}

.assignee-avatar:first-child {
  margin-left: 0;
}

.text-muted {
  color: var(--nb-text-placeholder);
  font-size: var(--nb-font-size-base);
}

.time-remaining {
  font-size: var(--nb-font-size-base);
}

.time-remaining.overdue {
  color: var(--nb-danger);
  font-weight: var(--nb-font-weight-medium);
}

/* 树形表格样式 */
:deep(.el-table) {
  font-size: var(--nb-font-size-base);
  border-radius: 0;
  --el-table-border-color: var(--nb-border-light);
  --el-table-header-bg-color: var(--nb-bg-muted);
  --el-table-row-hover-bg-color: var(--nb-primary-lighter);
}

:deep(.el-table th.el-table__cell) {
  background: var(--nb-bg-muted) !important;
  color: var(--nb-text-regular);
  font-weight: var(--nb-font-weight-semibold);
  font-size: var(--nb-font-size-base);
  padding: 14px 0;
  border-bottom: 1px solid var(--nb-border) !important;
}

:deep(.el-table td.el-table__cell) {
  padding: 0;
  border-bottom: 1px solid var(--nb-border-light);
}

:deep(.el-table__row) {
  transition: all var(--nb-transition-normal) ease;
}

:deep(.el-table__row:hover) {
  background: var(--nb-primary-lighter) !important;
}

/* 展开图标 - 确保与任务名称同行显示 */
:deep(.el-table__expand-icon) {
  display: inline-flex !important;
  align-items: center !important;
  width: 20px !important;
  height: 20px !important;
  margin: 0 var(--nb-space-1) 0 0 !important;
  padding: 0 !important;
  color: var(--nb-text-secondary);
  font-size: var(--nb-font-size-sm);
  transition: all var(--nb-transition-normal) ease;
  border-radius: var(--nb-radius-sm);
  position: relative;
  top: 0 !important;
}

:deep(.el-table__expand-icon:hover) {
  background: var(--nb-bg-hover);
  color: var(--nb-primary);
}

:deep(.el-table__expand-icon--expanded) {
  color: var(--nb-text-regular);
}

:deep(.el-table__expand-icon .el-icon) {
  display: inline-flex;
  align-items: center;
  transition: transform var(--nb-transition-normal) ease;
}

:deep(.el-table__expand-icon--expanded .el-icon) {
  transform: rotate(90deg);
}

/* 树形缩进 - 确保子任务正确缩进 */
:deep(.el-table__indent) {
  display: inline-block !important;
  width: var(--indent-size, 32px) !important;
}

:deep(.el-table__placeholder) {
  display: inline-block !important;
  width: 20px !important;
}

/* 单元格内容容器 */
:deep(.cell) {
  display: flex !important;
  align-items: center !important;
  padding: 12px 16px !important;
  min-height: 48px;
}

/* 子任务行样式 */
:deep(.el-table__row--level-1) {
  background: var(--nb-bg-muted);
}

:deep(.el-table__row--level-1:hover) {
  background: var(--nb-primary-lighter) !important;
}

:deep(.el-table__row--level-1 .task-name) {
  color: var(--nb-text-regular);
  font-weight: var(--nb-font-weight-regular);
  font-size: var(--nb-font-size-base);
}

/* 主任务行样式 */
:deep(.el-table__row--level-0) {
  background: var(--nb-bg-card);
}

:deep(.el-table__row--level-0 .task-name) {
  color: var(--nb-text-primary);
  font-weight: var(--nb-font-weight-medium);
  font-size: var(--nb-font-size-md);
}

/* 任务名称单元格 */
:deep(.el-table__row td:first-child .cell) {
  padding-left: 16px !important;
}

/* 状态标签样式 */
:deep(.el-tag) {
  border: none;
  font-size: var(--nb-tag-font-size);
  padding: 0 10px;
  height: 24px;
  line-height: 24px;
  border-radius: var(--nb-tag-radius);
  font-weight: var(--nb-font-weight-medium);
}

/* 操作按钮 */
:deep(.el-button--small) {
  font-size: var(--nb-font-size-base);
  padding: var(--nb-space-1) var(--nb-space-2);
}

:deep(.el-button--link) {
  font-weight: var(--nb-font-weight-medium);
  transition: all var(--nb-transition-normal);
}

:deep(.el-button--link:hover) {
  transform: translateX(2px);
}

/* 空状态 */
:deep(.el-table__empty-text) {
  padding: 60px 0;
  color: var(--nb-text-secondary);
  font-size: var(--nb-font-size-md);
}

/* 对话框样式 */
:deep(.el-dialog) {
  border-radius: var(--nb-radius-lg);
  overflow: hidden;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
}

:deep(.el-dialog__header) {
  padding: var(--nb-space-5) var(--nb-space-6);
  border-bottom: 1px solid var(--nb-border-light);
  background: var(--nb-bg-muted);
  flex-shrink: 0;
}

:deep(.el-dialog__title) {
  font-weight: var(--nb-font-weight-semibold);
  font-size: var(--nb-font-size-lg);
  color: var(--nb-text-primary);
}

:deep(.el-dialog__body) {
  padding: var(--nb-space-6);
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.el-dialog__footer) {
  padding: var(--nb-space-4) var(--nb-space-6);
  flex-shrink: 0;
  border-top: 1px solid var(--nb-border-light);
  background: var(--nb-bg-muted);
}

/* 全屏弹窗表单自适应布局 */
.fullscreen-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fullscreen-form :deep(.el-form-item) {
  flex-shrink: 0;
}

.fullscreen-form .flex-grow-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fullscreen-form .flex-grow-item :deep(.el-form-item__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 表单样式 */
:deep(.el-form-item__label) {
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-regular);
}

:deep(.el-input__wrapper) {
  border-radius: var(--nb-input-radius);
  padding: var(--nb-space-2) var(--nb-space-3);
}

:deep(.el-select .el-input__wrapper) {
  border-radius: var(--nb-input-radius);
}

/* 响应式 */
@media (max-width: 768px) {
  .tasks-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .table-toolbar {
    flex-direction: column;
  }
  
  .table-toolbar .el-select {
    width: 100%;
  }
}
</style>