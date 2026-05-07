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
          <el-option label="待处理" value="pending" />
          <el-option label="进行中" value="in_progress" />
          <el-option label="已完成" value="completed" />
          <el-option label="已关闭" value="closed" />
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
        :header-cell-style="{ background: '#f8f9fa', color: '#606266', fontWeight: 600, fontSize: '13px' }"
        class="task-tree-table"
      >
        <el-table-column prop="title" label="任务名称" min-width="280">
          <template #default="{ row }">
            <div class="task-cell" @click.stop="viewTask(row)">
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
        <el-table-column label="所属项目" width="150">
          <template #default="{ row }">
            {{ row.project?.name || '-' }}
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
        <el-table-column label="负责人" width="120">
          <template #default="{ row }">
            <div v-if="row.assignee" class="assignee-cell">
              <el-avatar :size="24">{{ row.assignee.realName?.charAt(0) }}</el-avatar>
              <span>{{ row.assignee.realName }}</span>
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
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <template v-if="row.level < 2">
              <el-button 
                type="primary" 
                link 
                size="small" 
                @click="showSubtaskDialog(row)"
                :disabled="row.status === 'closed'"
              >
                <el-icon><Plus /></el-icon>
                子任务
              </el-button>
            </template>
            <el-button 
              type="info" 
              link 
              size="small" 
              @click="viewTask(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      title="新建任务"
      width="800px"
      destroy-on-close
    >
      <el-form
        ref="taskFormRef"
        :model="taskForm"
        :rules="taskRules"
        label-width="100px"
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
        <el-form-item label="任务描述" prop="description">
          <RichEditor
            v-model="taskForm.description"
            placeholder="请输入任务描述... 支持粘贴图片 (Ctrl+V)"
            :height="250"
          />
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
            <el-form-item label="负责人" prop="assigneeId">
              <el-select v-model="taskForm.assigneeId" placeholder="请选择负责人" clearable style="width: 100%">
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
      width="800px"
      destroy-on-close
    >
      <el-form
        ref="subtaskFormRef"
        :model="subtaskForm"
        :rules="subtaskRules"
        label-width="100px"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="subtaskForm.title" placeholder="请输入子任务标题" />
        </el-form-item>
        <el-form-item label="任务描述" prop="description">
          <RichEditor
            v-model="subtaskForm.description"
            placeholder="请输入子任务描述... 支持粘贴图片 (Ctrl+V)"
            :height="250"
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
            <el-form-item label="负责人" prop="assigneeId">
              <el-select v-model="subtaskForm.assigneeId" placeholder="请选择负责人" clearable style="width: 100%">
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
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTasks, createTask, addSubtask, getTaskCategories } from '../api/task'
import { getProjects } from '../api/project'
import { getUsers } from '../api/user'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

const router = useRouter()
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
const activeTab = ref('my')

const taskForm = reactive({
  projectId: null as number | null,
  title: '',
  description: '',
  priority: 'medium',
  assigneeId: null as number | null,
  dueDate: null as Date | null,
  category: ''
})

const subtaskForm = reactive({
  title: '',
  description: '',
  priority: 'medium',
  assigneeId: null as number | null
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
      if (task.assignee?.id !== userId && task.creator?.id !== userId) return false
    } else if (activeTab.value === 'created') {
      if (task.creator?.id !== userId) return false
    } else if (activeTab.value === 'assigned') {
      if (task.assignee?.id !== userId) return false
    }
    if (filterStatus.value && task.status !== filterStatus.value) return false
    if (filterPriority.value && task.priority !== filterPriority.value) return false
    if (filterUser.value && task.assignee?.id !== filterUser.value) return false
    if (filterCategory.value && task.category !== filterCategory.value) return false
    return true
  })
})

const tabs = computed(() => {
  const userId = userStore.user?.id
  return [
    { key: 'my', label: '我参与的', count: tasks.value.filter((t: any) => t.assignee?.id === userId || t.creator?.id === userId).length },
    { key: 'created', label: '我创建的', count: tasks.value.filter((t: any) => t.creator?.id === userId).length },
    { key: 'assigned', label: '我负责的', count: tasks.value.filter((t: any) => t.assignee?.id === userId).length },
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
    projectId: null,
    title: '',
    description: '',
    priority: 'medium',
    assigneeId: null,
    dueDate: null,
    category: ''
  })
  dialogVisible.value = true
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
    assigneeId: null
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
          assigneeId: subtaskForm.assigneeId,
          projectId: parentTask.value.project?.id
        })
        ElMessage.success('子任务添加成功')
        subtaskDialogVisible.value = false
        Object.assign(subtaskForm, {
          title: '',
          description: '',
          priority: 'medium',
          assigneeId: null
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
        loadCategories()
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
})
</script>

<style scoped>
.tasks-page {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  min-height: calc(100vh - 80px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.page-header .header-left h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
}

.page-header .header-left p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.page-header .el-button {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25);
  transition: all 0.2s ease;
}

.page-header .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
}

.content-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 20px 0;
}

.filter-tab {
  padding: 8px 16px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
}

.filter-tab:hover {
  color: #409eff;
  background: #f5f7fa;
}

.filter-tab.active {
  color: #409eff;
  background: #f5f7fa;
  font-weight: 600;
  border-bottom: 2px solid #409eff;
}

.tab-count {
  font-size: 12px;
  background: #f0f0f0;
  color: #909399;
  padding: 1px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.filter-tab.active .tab-count {
  background: #ecf5ff;
  color: #409eff;
}

.table-toolbar {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
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
  color: #409eff;
}

.task-name {
  color: #262626;
  font-weight: 500;
  font-size: 14px;
  transition: color 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  color: #409eff;
  background: #ecf5ff;
  border-color: #d9ecff;
}

.sub-task-tag.level-3 {
  color: #909399;
  background: #f4f4f5;
  border-color: #e9e9eb;
}

.assignee-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4a5568;
}

.assignee-cell .el-avatar {
  background: linear-gradient(135deg, #409eff 0%, #6366f1 100%);
  font-size: 11px;
  font-weight: 500;
}

.text-muted {
  color: #c0c4cc;
  font-size: 13px;
}

.time-remaining {
  font-size: 13px;
}

.time-remaining.overdue {
  color: #f56c6c;
  font-weight: 500;
}

/* 树形表格样式 */
:deep(.el-table) {
  font-size: 13px;
  border-radius: 0;
  --el-table-border-color: #f0f0f0;
  --el-table-header-bg-color: #fafbfc;
  --el-table-row-hover-bg-color: #f5f8ff;
}

:deep(.el-table th.el-table__cell) {
  background: #fafbfc !important;
  color: #4a5568;
  font-weight: 600;
  font-size: 13px;
  padding: 14px 0;
  border-bottom: 1px solid #e8eaed !important;
}

:deep(.el-table td.el-table__cell) {
  padding: 0;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-table__row) {
  transition: all 0.2s ease;
}

:deep(.el-table__row:hover) {
  background: #f5f8ff !important;
}

/* 展开图标 - 确保与任务名称同行显示 */
:deep(.el-table__expand-icon) {
  display: inline-flex !important;
  align-items: center !important;
  width: 20px !important;
  height: 20px !important;
  margin: 0 4px 0 0 !important;
  padding: 0 !important;
  color: #9ca3af;
  font-size: 12px;
  transition: all 0.2s ease;
  border-radius: 4px;
  position: relative;
  top: 0 !important;
}

:deep(.el-table__expand-icon:hover) {
  background: #e5e7eb;
  color: #409eff;
}

:deep(.el-table__expand-icon--expanded) {
  color: #6b7280;
}

:deep(.el-table__expand-icon .el-icon) {
  display: inline-flex;
  align-items: center;
  transition: transform 0.2s ease;
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
  background: #fafbfc;
}

:deep(.el-table__row--level-1:hover) {
  background: #eef2ff !important;
}

:deep(.el-table__row--level-1 .task-name) {
  color: #6b7280;
  font-weight: 400;
  font-size: 13px;
}

/* 主任务行样式 */
:deep(.el-table__row--level-0) {
  background: #ffffff;
}

:deep(.el-table__row--level-0 .task-name) {
  color: #1f2937;
  font-weight: 500;
  font-size: 14px;
}

/* 任务名称单元格 */
:deep(.el-table__row td:first-child .cell) {
  padding-left: 16px !important;
}

/* 状态标签样式 */
:deep(.el-tag) {
  border: none;
  font-size: 12px;
  padding: 0 10px;
  height: 24px;
  line-height: 24px;
  border-radius: 6px;
  font-weight: 500;
}

/* 操作按钮 */
:deep(.el-button--small) {
  font-size: 13px;
  padding: 4px 8px;
}

:deep(.el-button--link) {
  font-weight: 500;
  transition: all 0.2s;
}

:deep(.el-button--link:hover) {
  transform: translateX(2px);
}

/* 空状态 */
:deep(.el-table__empty-text) {
  padding: 60px 0;
  color: #9ca3af;
  font-size: 14px;
}

/* 对话框样式 */
:deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
}

:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 16px;
  color: #1a1a2e;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafbfc;
}

/* 表单样式 */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #4a5568;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  padding: 8px 12px;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
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