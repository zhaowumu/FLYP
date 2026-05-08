<template>
  <div class="projects-page">
    <div class="page-header">
      <div class="header-left">
        <h2>项目管理</h2>
        <p>管理所有项目</p>
      </div>
      <el-button type="primary" @click="showCreateDialog" v-if="userStore.getProjectPermission('create')">
        <el-icon><Plus /></el-icon>
        新建项目
      </el-button>
    </div>

    <div class="project-grid">
      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        @click="viewProject(project)"
      >
        <div class="card-header">
          <h3 class="card-title">{{ project.name }}</h3>
          <el-tag :type="getStatusType(project.status)" size="small">
            {{ getStatusText(project.status) }}
          </el-tag>
        </div>
        <div class="card-desc" v-html="stripHtml(project.description)"></div>
        <div class="card-stats">
          <div class="stat-item">
            <el-icon><Document /></el-icon>
            <span>{{ project.tasks?.length || 0 }} 任务</span>
          </div>
          <div class="stat-item">
            <el-icon><Warning /></el-icon>
            <span>{{ project.bugs?.length || 0 }} 缺陷</span>
          </div>
          <div class="stat-item">
            <el-icon><Clock /></el-icon>
            <span>{{ formatDate(project.createdAt) }}</span>
          </div>
        </div>
        <div class="card-actions" v-if="userStore.isAdmin || userStore.getProjectPermission('delete')" @click.stop>
          <el-button link type="primary" size="small" @click="editProject(project)" v-if="userStore.isAdmin">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button link type="danger" size="small" @click="deleteProject(project)" v-if="userStore.getProjectPermission('delete')">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </div>
      </div>
      <div v-if="projects.length === 0" class="empty-state">
        <el-empty description="暂无项目" />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑项目' : '新建项目'"
      width="90%"
      top="2vh"
      destroy-on-close
    >
      <el-form
        ref="projectFormRef"
        :model="projectForm"
        :rules="projectRules"
        label-width="100px"
        class="fullscreen-form"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述" prop="description" class="flex-grow-item">
          <RichEditor
            v-model="projectForm.description"
            placeholder="请输入项目描述... 支持粘贴图片 (Ctrl+V)"
            :height="0"
          />
        </el-form-item>
        <el-form-item label="项目状态" prop="status">
          <el-select v-model="projectForm.status" placeholder="请选择项目状态" style="width: 100%">
            <el-option label="进行中" value="active" />
            <el-option label="已归档" value="archived" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProject" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Document, Warning, Clock, Edit, Delete } from '@element-plus/icons-vue'
import { getProjects, createProject, updateProject, deleteProject as deleteProjectApi } from '../api/project'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

const router = useRouter()
const userStore = useUserStore()
const projects = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const projectFormRef = ref()
const currentProjectId = ref<number | null>(null)
const submitting = ref(false)

const projectForm = reactive({
  name: '',
  description: '',
  status: 'active'
})

const projectRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择项目状态', trigger: 'change' }]
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    active: 'success',
    archived: 'info',
    completed: 'warning'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    active: '进行中',
    archived: '已归档',
    completed: '已完成'
  }
  return map[status] || status
}

const stripHtml = (html: string) => {
  if (!html) return '暂无描述'
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const text = tmp.textContent || tmp.innerText || ''
  return text.length > 100 ? text.slice(0, 100) + '...' : text || '暂无描述'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const loadProjects = async () => {
  try {
    const res = await getProjects()
    projects.value = res.data
  } catch (error) {
    ElMessage.error('加载项目列表失败')
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  currentProjectId.value = null
  Object.assign(projectForm, {
    name: '',
    description: '',
    status: 'active'
  })
  dialogVisible.value = true
}

const viewProject = (project: any) => {
  router.push(`/projects/${project.id}`)
}

const editProject = (project: any) => {
  isEdit.value = true
  currentProjectId.value = project.id
  Object.assign(projectForm, {
    name: project.name,
    description: project.description,
    status: project.status
  })
  dialogVisible.value = true
}

const deleteProject = async (project: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该项目吗？', '提示', {
      type: 'warning'
    })
    await deleteProjectApi(project.id)
    ElMessage.success('删除成功')
    loadProjects()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const submitProject = async () => {
  if (!projectFormRef.value) return
  
  await projectFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value && currentProjectId.value) {
          await updateProject(currentProjectId.value, projectForm)
          ElMessage.success('更新成功')
        } else {
          await createProject(projectForm)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadProjects()
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.projects-page {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left h2 {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.header-left p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card:hover {
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.15);
  transform: translateY(-4px);
  border-color: #409eff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.card-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.stat-item .el-icon {
  font-size: 14px;
  color: #909399;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
  justify-content: flex-end;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 40px 0;
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