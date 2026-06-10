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
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value">
            <span class="status-dot" :style="{ backgroundColor: statusColorMap[opt.value] }"></span>
            {{ opt.label }}
          </el-option>
        </el-select>
        <el-select v-model="filterSeverity" placeholder="严重程度" clearable style="width: 150px">
          <el-option label="低" value="low" />
          <el-option label="中" value="medium" />
          <el-option label="高" value="high" />
          <el-option label="严重" value="critical" />
        </el-select>
        <el-select v-model="filterUser" placeholder="按负责人筛选" clearable filterable style="width: 180px">
          <el-option
            v-for="user in users"
            :key="user.id"
            :label="user.realName"
            :value="user.id"
          >
            <span style="display: flex; align-items: center; gap: 6px">
              <el-avatar :size="20" :src="user.avatar || undefined">{{ user.realName?.charAt(0) }}</el-avatar>
              {{ user.realName }}
            </span>
          </el-option>
        </el-select>
        <el-select v-model="filterReporter" placeholder="按报告人筛选" clearable filterable style="width: 180px">
          <el-option
            v-for="user in users"
            :key="user.id"
            :label="user.realName"
            :value="user.id"
          >
            <span style="display: flex; align-items: center; gap: 6px">
              <el-avatar :size="20" :src="user.avatar || undefined">{{ user.realName?.charAt(0) }}</el-avatar>
              {{ user.realName }}
            </span>
          </el-option>
        </el-select>
        <el-select v-model="filterCategory" placeholder="分类筛选" clearable style="width: 150px">
          <el-option
            v-for="cat in categories"
            :key="cat"
            :label="cat"
            :value="cat"
          />
        </el-select>
        <el-date-picker
          v-model="filterUpdatedRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="更新开始"
          end-placeholder="更新结束"
          style="width: 360px"
          clearable
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
      </div>

      <el-table :data="filteredBugs" style="width: 100%">
        <el-table-column label="#" width="60">
          <template #default="{ row }">
            <span class="text-muted">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="缺陷标题" min-width="250">
          <template #default="{ row }">
            <div class="bug-title" @click="viewBug(row)">{{ row.title }}</div>
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
            <el-tag :type="getStatusType(row.status)" :style="getTagStyle(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="120">
          <template #default="{ row }">
            <div v-if="row.assignee" class="assignee-cell">
              <el-avatar :size="24" :src="row.assignee.avatar || undefined">{{ row.assignee.realName?.charAt(0) }}</el-avatar>
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
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.updatedAt).toLocaleString() }}
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
      <el-pagination
        v-if="total > 0"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="loadBugs"
        @size-change="loadBugs"
        style="margin-top: 16px; justify-content: flex-end; padding: 0 4px 4px;"
      />
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
              <el-select v-model="bugForm.assigneeId" placeholder="请选择负责人" clearable filterable style="width: 100%">
                <el-option
                  v-for="user in users"
                  :key="user.id"
                  :label="user.realName"
                  :value="user.id"
                >
                  <span style="display: flex; align-items: center; gap: 6px">
                    <el-avatar :size="20" :src="user.avatar || undefined">{{ user.realName?.charAt(0) }}</el-avatar>
                    {{ user.realName }}
                  </span>
                </el-option>
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
import { ref, reactive, computed, watch, onMounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getBugs, createBug, getBugCategories } from '../api/bug'
import { getProjectOptions } from '../api/project'
import { getUsers } from '../api/user'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

defineOptions({ name: 'Bugs' })

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const bugs = ref<any[]>([])
const projects = ref<any[]>([])
const users = ref<any[]>([])
const categories = ref<string[]>([])
const dialogVisible = ref(false)
const bugFormRef = ref()
const submitting = ref(false)
const filterStatus = ref('')
const filterUnassigned = ref(false)
const filterSeverity = ref('')
const filterUser = ref<number | null>(null)
const filterReporter = ref<number | null>(null)
const filterCategory = ref('')
const filterUpdatedRange = ref<[string, string] | null>(null)
const activeTab = ref(userStore.isPM ? 'all' : 'assigned')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const tabCounts = ref({ assigned: 0, reported: 0, my: 0, all: 0, recent: 0 })
const lastLoadTime = ref(0)
const STALE_TTL = 60_000 // 数据缓存60秒

// 筛选条件变化时重置到第一页并重新加载
watch([activeTab, filterStatus, filterSeverity, filterUser, filterReporter, filterCategory, filterUpdatedRange, filterUnassigned], () => {
  currentPage.value = 1
  loadBugs()
})

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
  // 所有 tab 过滤逻辑均已由后端处理，直接返回数据
  return bugs.value
})

const tabs = computed(() => {
  return [
    { key: 'assigned', label: '我负责的', count: tabCounts.value.assigned },
    { key: 'reported', label: '我报告的', count: tabCounts.value.reported },
    { key: 'my', label: '我参与的', count: tabCounts.value.my },
    { key: 'recent', label: '最近打开', count: tabCounts.value.recent },
    { key: 'all', label: '全部', count: tabCounts.value.all },
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
    pending: 'primary', in_progress: 'warning',
    fixed: '', verified: 'success', closed: 'info'
  }
  return map[status] || 'info'
}

const pinkTagStyle = {
  '--el-tag-bg-color': '#fff0f6',
  '--el-tag-border-color': '#ffd6e7',
  '--el-tag-text-color': '#eb2f96'
}

const getTagStyle = (status: string) => {
  return status === 'fixed' ? pinkTagStyle : {}
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理', in_progress: '处理中',
    fixed: '已修复', verified: '已验证', closed: '已关闭'
  }
  return map[status] || status
}

const statusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'in_progress' },
  { label: '已修复', value: 'fixed' },
  { label: '待指派', value: 'pending,in_progress,fixed' },
  { label: '已验证', value: 'verified' },
  { label: '待关闭', value: 'verified' },
  { label: '已关闭', value: 'closed' }
]

const statusColorMap: Record<string, string> = {
  pending: 'var(--el-color-primary)',
  in_progress: 'var(--el-color-warning)',
  fixed: '#eb2f96',
  verified: 'var(--el-color-success)',
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

const loadBugs = async () => {
  try {
    const userId = userStore.user?.id
    const params: any = { page: currentPage.value, pageSize: pageSize.value }
    // 传筛选条件到后端做前置过滤（下拉筛选优先于 tab）
    if (filterStatus.value) params.status = filterStatus.value
    if (filterUnassigned.value) params.unassigned = 'true'
    if (filterSeverity.value) params.severity = filterSeverity.value
    if (filterCategory.value) params.category = filterCategory.value
    if (filterUser.value) params.assigneeId = filterUser.value
    else if (activeTab.value === 'assigned') params.assigneeId = userId
    if (filterReporter.value) params.reporterId = filterReporter.value
    else if (activeTab.value === 'reported') params.reporterId = userId
    // 'my' 传 myUserId 由后端做 OR 查询，不再前端过滤
    if (activeTab.value === 'my' && !filterUser.value && !filterReporter.value) {
      params.myUserId = userId
    }
    if (activeTab.value === 'recent') {
      params.recentUserId = userId
    }
    if (filterUpdatedRange.value) {
      params.updatedAfter = filterUpdatedRange.value[0]
      params.updatedBefore = filterUpdatedRange.value[1]
    }
    const res = await getBugs(params)
    bugs.value = res.data.data
    total.value = res.data.total
    if (res.data.tabs) tabCounts.value = res.data.tabs
    lastLoadTime.value = Date.now()
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
    const res = await getProjectOptions()
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
    projectId: projects.value[0]?.id || null,
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
  // 并行加载辅助数据（用户列表、项目列表、分类）
  Promise.all([loadProjects(), loadUsers(), loadCategories()])
})

// keep-alive 激活时，仅当数据过期才刷新列表（辅助数据不频繁变化，不刷新）
onActivated(() => {
  if (lastLoadTime.value && Date.now() - lastLoadTime.value > STALE_TTL) {
    loadBugs()
  }
})

// 首次挂载 + 路由变化时同步 URL 查询参数到筛选条件
// 只有 URL 中显式存在的参数才会覆盖，避免从详情页返回时丢失筛选
watch(() => route.fullPath, () => {
  if (route.query.status !== undefined) filterStatus.value = route.query.status as string
  if (route.query.severity !== undefined) filterSeverity.value = route.query.severity as string
  if (route.query.unassigned !== undefined) filterUnassigned.value = route.query.unassigned === 'true'
  loadBugs()
}, { immediate: true })
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
.bugs-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-6);
}

.header-left h2 {
  font-size: var(--nb-font-size-2xl);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0 0 var(--nb-space-1) 0;
}

.header-left p {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-secondary);
  margin: 0;
}

.content-card {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  padding: var(--nb-space-5);
  box-shadow: var(--nb-shadow-sm);
}

.filter-tabs {
  display: flex;
  gap: var(--nb-space-1);
  padding: 0 0 var(--nb-space-4);
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
  margin-bottom: var(--nb-space-4);
}

.bug-title {
  color: var(--nb-primary);
  cursor: pointer;
  font-weight: var(--nb-font-weight-medium);
}

.bug-title:hover {
  text-decoration: underline;
}

.assignee-cell {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.text-muted {
  color: var(--nb-text-secondary);
}

.time-remaining {
  font-size: var(--nb-font-size-base);
}

.time-remaining.overdue {
  color: var(--nb-danger);
  font-weight: var(--nb-font-weight-medium);
}

/* 对话框样式 */
:deep(.el-dialog) {
  border-radius: var(--nb-radius-lg);
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