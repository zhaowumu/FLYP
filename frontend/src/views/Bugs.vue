<template>
  <div class="bugs-page">
    <div class="page-header">
      <div class="header-left">
        <h2>缺陷管理</h2>
        <p>管理所有缺陷</p>
      </div>
      <el-button type="primary" @click="showCreateDialog" v-if="userStore.getBugPermission('create')">
        <el-icon><Plus /></el-icon>
        提交缺陷
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
          <el-option label="已分配" value="assigned" />
          <el-option label="修复中" value="fixing" />
          <el-option label="已修复" value="fixed" />
          <el-option label="已验证" value="verified" />
          <el-option label="已关闭" value="closed" />
        </el-select>
        <el-select v-model="filterSeverity" placeholder="严重程度" clearable style="width: 150px">
          <el-option label="低" value="low" />
          <el-option label="中" value="medium" />
          <el-option label="高" value="high" />
          <el-option label="严重" value="critical" />
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

      <el-table :data="filteredBugs" style="width: 100%">
        <el-table-column prop="title" label="缺陷标题" min-width="250">
          <template #default="{ row }">
            <div class="bug-title" @click="viewBug(row)">{{ row.title }}</div>
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
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getSeverityType(row.severity)" size="small">
              {{ getSeverityText(row.severity) }}
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
        <el-table-column label="报告人" width="120">
          <template #default="{ row }">
            {{ row.reporter?.realName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
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
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      title="提交缺陷"
      width="90%"
      top="2vh"
      destroy-on-close
    >
      <el-form
        ref="bugFormRef"
        :model="bugForm"
        :rules="bugRules"
        label-width="80px"
        class="fullscreen-form"
      >
        <el-form-item label="所属项目" prop="projectId">
          <el-select v-model="bugForm.projectId" placeholder="请选择项目" style="width: 100%">
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.name"
              :value="project.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="缺陷标题" prop="title">
          <el-input v-model="bugForm.title" placeholder="请输入缺陷标题" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select
            v-model="bugForm.category"
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
        <el-form-item label="缺陷描述" prop="description" class="flex-grow-item">
          <RichEditor
            v-model="bugForm.description"
            placeholder="请描述缺陷现象... 支持粘贴图片 (Ctrl+V)"
            :height="0"
          />
        </el-form-item>
        <el-form-item label="重现步骤" prop="reproduceSteps" class="flex-grow-item">
          <RichEditor
            v-model="bugForm.reproduceSteps"
            placeholder="请描述重现步骤... 支持粘贴图片 (Ctrl+V)"
            :height="0"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="严重程度" prop="severity">
              <el-select v-model="bugForm.severity" placeholder="请选择严重程度" style="width: 100%">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
                <el-option label="严重" value="critical" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="负责人" prop="assigneeId">
              <el-select v-model="bugForm.assigneeId" placeholder="请选择负责人" clearable style="width: 100%">
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBug" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getBugs, createBug, getBugCategories } from '../api/bug'
import { getProjects } from '../api/project'
import { getUsers } from '../api/user'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

const router = useRouter()
const userStore = useUserStore()
const bugs = ref<any[]>([])
const projects = ref<any[]>([])
const users = ref<any[]>([])
const categories = ref<string[]>([])
const dialogVisible = ref(false)
const bugFormRef = ref()
const submitting = ref(false)
const filterStatus = ref('')
const filterSeverity = ref('')
const filterUser = ref<number | null>(null)
const filterCategory = ref('')
const activeTab = ref('my')

const bugForm = reactive({
  projectId: null as number | null,
  title: '',
  description: '',
  reproduceSteps: '',
  severity: 'medium',
  assigneeId: null as number | null,
  category: ''
})

const bugRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  title: [{ required: true, message: '请输入缺陷标题', trigger: 'blur' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }]
}

const filteredBugs = computed(() => {
  const userId = userStore.user?.id
  return bugs.value.filter(bug => {
    if (activeTab.value === 'my') {
      if (bug.assignee?.id !== userId && bug.reporter?.id !== userId) return false
    } else if (activeTab.value === 'reported') {
      if (bug.reporter?.id !== userId) return false
    } else if (activeTab.value === 'assigned') {
      if (bug.assignee?.id !== userId) return false
    }
    if (filterStatus.value && bug.status !== filterStatus.value) return false
    if (filterSeverity.value && bug.severity !== filterSeverity.value) return false
    if (filterUser.value && bug.assignee?.id !== filterUser.value) return false
    if (filterCategory.value && bug.category !== filterCategory.value) return false
    return true
  })
})

const tabs = computed(() => {
  const userId = userStore.user?.id
  return [
    { key: 'my', label: '我参与的', count: bugs.value.filter((b: any) => b.assignee?.id === userId || b.reporter?.id === userId).length },
    { key: 'reported', label: '我报告的', count: bugs.value.filter((b: any) => b.reporter?.id === userId).length },
    { key: 'assigned', label: '我负责的', count: bugs.value.filter((b: any) => b.assignee?.id === userId).length },
    { key: 'all', label: '全部', count: bugs.value.length },
  ]
})

const getSeverityType = (severity: string) => {
  const map: Record<string, string> = {
    low: 'info', medium: 'warning', high: 'danger', critical: 'danger'
  }
  return map[severity] || 'info'
}

const getSeverityText = (severity: string) => {
  const map: Record<string, string> = {
    low: '低', medium: '中', high: '高', critical: '严重'
  }
  return map[severity] || severity
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info', assigned: 'warning', fixing: 'warning',
    fixed: 'success', verified: 'success', closed: 'info'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理', assigned: '已分配', fixing: '修复中',
    fixed: '已修复', verified: '已验证', closed: '已关闭'
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

const loadBugs = async () => {
  try {
    const res = await getBugs()
    bugs.value = res.data
  } catch (error) {
    ElMessage.error('加载缺陷列表失败')
  }
}

const loadCategories = async () => {
  try {
    const res = await getBugCategories()
    categories.value = res.data
  } catch (error) {
    console.error('Failed to load bug categories:', error)
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
  Object.assign(bugForm, {
    projectId: null,
    title: '',
    description: '',
    reproduceSteps: '',
    severity: 'medium',
    assigneeId: null,
    category: ''
  })
  dialogVisible.value = true
}

const viewBug = (bug: any) => {
  router.push(`/bugs/${bug.id}`)
}

const submitBug = async () => {
  if (!bugFormRef.value) return
  
  await bugFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        await createBug(bugForm)
        ElMessage.success('提交成功')
        dialogVisible.value = false
        loadBugs()
        loadCategories()
      } catch (error) {
        ElMessage.error('提交失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadBugs()
  loadProjects()
  loadUsers()
  loadCategories()
})
</script>

<style scoped>
.bugs-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h2 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.header-left p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.filter-tabs {
  display: flex;
  gap: 4px;
  padding: 0 0 16px;
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
  margin-bottom: 16px;
}

.bug-title {
  color: #409eff;
  cursor: pointer;
  font-weight: 500;
}

.bug-title:hover {
  text-decoration: underline;
}

.assignee-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-muted {
  color: #909399;
}

.time-remaining {
  font-size: 13px;
}

.time-remaining.overdue {
  color: #f56c6c;
  font-weight: 500;
}

/* 对话框样式 */
:deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
}

:deep(.el-dialog__body) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.el-dialog__header),
:deep(.el-dialog__footer) {
  flex-shrink: 0;
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
</style>