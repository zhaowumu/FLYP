<template>
  <div class="project-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="project-title">
          <div class="project-title-area" v-if="!isEditingName">
            <h2>{{ project?.name }}</h2>
            <el-button v-if="canEdit" text size="small" @click="startEditName" class="edit-btn">
              <el-icon><Edit /></el-icon>
            </el-button>
          </div>
          <div v-else class="project-name-edit">
            <el-input v-model="editName" size="large" placeholder="请输入项目名称" @keyup.enter="saveName" ref="nameInputRef" />
            <div class="edit-actions">
              <el-button size="small" @click="cancelEditName">取消</el-button>
              <el-button size="small" type="primary" @click="saveName" :loading="saving">保存</el-button>
            </div>
          </div>
          <el-tag :type="getStatusType(project?.status)" size="small">
            {{ getStatusText(project?.status) }}
          </el-tag>
        </div>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="16">
        <div class="content-card">
          <div class="card-header">
            <h3>项目信息</h3>
            <el-button v-if="canEdit" text size="small" @click="startEditDescription" class="edit-btn">
              <el-icon><Edit /></el-icon>
              {{ project?.description ? '编辑描述' : '添加描述' }}
            </el-button>
          </div>
          <div class="info-grid">
            <div class="info-item full-width">
              <div class="info-label">项目描述</div>
              <div v-if="!isEditingDescription">
                <div class="info-value rich-content" v-html="project?.description || '<span style=color:#909399>暂无描述</span>'"></div>
              </div>
              <div v-else class="description-editor">
                <RichEditor
                  v-model="editDescription"
                  placeholder="请输入项目描述... 支持粘贴图片 (Ctrl+V)"
                  :height="300"
                />
                <div class="edit-actions">
                  <el-button size="small" @click="cancelEditDescription">取消</el-button>
                  <el-button size="small" type="primary" @click="saveDescription" :loading="saving">保存</el-button>
                </div>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item">
                <div class="info-label">创建时间</div>
                <div class="info-value">{{ project?.createdAt ? new Date(project.createdAt).toLocaleString() : '-' }}</div>
              </div>
              <div class="info-item">
                <div class="info-label">更新时间</div>
                <div class="info-value">{{ project?.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-' }}</div>
              </div>
            </div>
          </div>
        </div>

        <el-row :gutter="20" style="margin-top: 20px">
          <el-col :span="12">
            <div class="content-card">
              <div class="card-header">
                <h3>任务统计</h3>
              </div>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ taskStats.total }}</div>
                  <div class="stat-label">总任务</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value text-warning">{{ taskStats.inProgress }}</div>
                  <div class="stat-label">进行中</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value text-success">{{ taskStats.completed }}</div>
                  <div class="stat-label">已完成</div>
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="content-card">
              <div class="card-header">
                <h3>缺陷统计</h3>
              </div>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">{{ bugStats.total }}</div>
                  <div class="stat-label">总缺陷</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value text-warning">{{ bugStats.open }}</div>
                  <div class="stat-label">待处理</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value text-success">{{ bugStats.closed }}</div>
                  <div class="stat-label">已关闭</div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-col>

      <el-col :span="8">
        <div class="content-card">
          <div class="card-header">
            <h3>项目信息</h3>
          </div>
          <div class="info-list">
            <div class="info-item">
              <div class="info-label">项目状态</div>
              <div class="info-value">
                <el-tag :type="getStatusType(project?.status)" size="small">
                  {{ getStatusText(project?.status) }}
                </el-tag>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">创建时间</div>
              <div class="info-value">{{ project?.createdAt ? new Date(project.createdAt).toLocaleString() : '-' }}</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getProject, updateProject } from '../api/project'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const project = ref<any>(null)
const isEditingName = ref(false)
const editName = ref('')
const isEditingDescription = ref(false)
const editDescription = ref('')
const saving = ref(false)
const nameInputRef = ref()

const currentUserId = computed(() => userStore.user?.id)
const isCreator = computed(() => project.value?.createdBy === currentUserId.value)
const isProjectManager = computed(() => project.value?.manager?.id === currentUserId.value)
const isAdmin = computed(() => userStore.user?.role === 'admin')
const canEdit = computed(() => isCreator.value || isProjectManager.value || isAdmin.value)

const taskStats = computed(() => {
  const tasks = project.value?.tasks || []
  return {
    total: tasks.length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    completed: tasks.filter((t: any) => t.status === 'completed').length
  }
})

const bugStats = computed(() => {
  const bugs = project.value?.bugs || []
  return {
    total: bugs.length,
    open: bugs.filter((b: any) => b.status !== 'closed').length,
    closed: bugs.filter((b: any) => b.status === 'closed').length
  }
})

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

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    admin: '管理员',
    project_manager: '项目经理',
    developer: '开发人员',
    tester: '测试人员'
  }
  return map[role] || role
}

const goBack = () => {
  router.push('/projects')
}

const startEditName = () => {
  editName.value = project.value.name
  isEditingName.value = true
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}

const cancelEditName = () => {
  isEditingName.value = false
  editName.value = ''
}

const saveName = async () => {
  if (!editName.value.trim()) {
    ElMessage.warning('项目名称不能为空')
    return
  }
  saving.value = true
  try {
    await updateProject(project.value.id, { name: editName.value.trim() })
    project.value.name = editName.value.trim()
    isEditingName.value = false
    ElMessage.success('项目名称已更新')
  } catch (error) {
    ElMessage.error('更新项目名称失败')
  } finally {
    saving.value = false
  }
}

const startEditDescription = () => {
  editDescription.value = project.value.description || ''
  isEditingDescription.value = true
}

const cancelEditDescription = () => {
  isEditingDescription.value = false
  editDescription.value = ''
}

const saveDescription = async () => {
  saving.value = true
  try {
    await updateProject(project.value.id, { description: editDescription.value })
    project.value.description = editDescription.value
    isEditingDescription.value = false
    ElMessage.success('项目描述已更新')
  } catch (error) {
    ElMessage.error('更新项目描述失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const id = parseInt(route.params.id as string)
    const res = await getProject(id)
    project.value = res.data
  } catch (error) {
    console.error('Failed to load project:', error)
  }
})
</script>

<style scoped>
.project-detail {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-title-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-title h2 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.project-name-edit {
  min-width: 200px;
}

.project-name-edit .el-input {
  margin-bottom: 8px;
}

.edit-btn {
  color: #909399;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.edit-btn:hover {
  color: #409eff;
  background: #ecf5ff;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.description-editor {
  margin-top: 12px;
}

.description-editor .edit-actions {
  margin-top: 12px;
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.member-count {
  font-size: 14px;
  color: #909399;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  gap: 40px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 13px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  text-align: center;
}

.stat-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-value.text-warning {
  color: #e6a23c;
}

.stat-value.text-success {
  color: #67c23a;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.member-list {
  max-height: 300px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
  font-weight: 500;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 14px;
  color: #303133;
}

.member-role {
  font-size: 12px;
  color: #909399;
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}
</style>