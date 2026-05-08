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
                <div class="info-value rich-content" v-html="project?.description || '<span style=color:var(--nb-text-secondary)>暂无描述</span>'"></div>
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
              <div class="info-label">项目负责人</div>
              <div class="info-value">
                <template v-if="!isChangingManager">
                  {{ project?.manager?.realName || project?.manager?.username || '未设置' }}
                  <el-button v-if="isAdmin" text size="small" @click="startChangeManager" class="edit-btn" style="margin-left: 4px">
                    <el-icon><Edit /></el-icon>
                  </el-button>
                </template>
                <template v-else>
                  <el-select v-model="newManagerId" size="small" style="width: 150px" placeholder="选择负责人">
                    <el-option
                      v-for="u in users"
                      :key="u.id"
                      :label="`${u.realName} (${u.username})`"
                      :value="u.id"
                    />
                  </el-select>
                  <el-button size="small" @click="cancelChangeManager" style="margin-left: 4px">取消</el-button>
                  <el-button size="small" type="primary" @click="saveChangeManager" :loading="saving">保存</el-button>
                </template>
              </div>
            </div>
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
import { getProject, updateProject, changeProjectManager } from '../api/project'
import { getUsers } from '../api/user'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const project = ref<any>(null)
const users = ref<any[]>([])
const isEditingName = ref(false)
const editName = ref('')
const isEditingDescription = ref(false)
const editDescription = ref('')
const saving = ref(false)
const nameInputRef = ref()
const isChangingManager = ref(false)
const newManagerId = ref<number | null>(null)

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

const startChangeManager = () => {
  newManagerId.value = project.value?.manager?.id || null
  isChangingManager.value = true
}

const cancelChangeManager = () => {
  isChangingManager.value = false
  newManagerId.value = null
}

const saveChangeManager = async () => {
  if (!newManagerId.value) {
    ElMessage.warning('请选择项目负责人')
    return
  }
  saving.value = true
  try {
    const res = await changeProjectManager(project.value.id, newManagerId.value)
    project.value = res.data
    isChangingManager.value = false
    ElMessage.success('项目负责人已更新')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '更新项目负责人失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const id = parseInt(route.params.id as string)
    const res = await getProject(id)
    project.value = res.data
    if (isAdmin.value) {
      const usersRes = await getUsers()
      users.value = usersRes.data
    }
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
  margin-bottom: var(--nb-space-5);
  background: var(--nb-bg-card);
  padding: var(--nb-space-4) var(--nb-space-5);
  border-radius: var(--nb-radius-md);
  box-shadow: var(--nb-shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--nb-space-4);
}

.project-title {
  display: flex;
  align-items: center;
  gap: var(--nb-space-3);
}

.project-title-area {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.project-title h2 {
  font-size: var(--nb-font-size-2xl);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0;
}

.project-name-edit {
  min-width: 200px;
}

.project-name-edit .el-input {
  margin-bottom: var(--nb-space-2);
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

.edit-actions {
  display: flex;
  gap: var(--nb-space-2);
  justify-content: flex-end;
  margin-top: var(--nb-space-2);
}

.description-editor {
  margin-top: var(--nb-space-3);
}

.description-editor .edit-actions {
  margin-top: var(--nb-space-3);
}

.content-card {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  padding: var(--nb-space-5);
  box-shadow: var(--nb-shadow-sm);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-4);
}

.card-header h3 {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0;
}

.member-count {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-secondary);
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-4);
}

.info-row {
  display: flex;
  gap: var(--nb-space-10);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-1);
}

.info-label {
  font-size: var(--nb-font-size-base);
  color: var(--nb-text-secondary);
}

.info-value {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
  line-height: var(--nb-line-height-relaxed);
  white-space: pre-wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--nb-space-4);
  text-align: center;
}

.stat-item {
  padding: var(--nb-space-3);
  background: var(--nb-bg-hover);
  border-radius: var(--nb-radius-md);
}

.stat-value {
  font-size: var(--nb-font-size-3xl);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
}

.stat-value.text-warning {
  color: var(--nb-warning);
}

.stat-value.text-success {
  color: var(--nb-success);
}

.stat-label {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
  margin-top: var(--nb-space-1);
}

.member-list {
  max-height: 300px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: var(--nb-space-3);
  padding: var(--nb-space-2) 0;
  border-bottom: 1px solid var(--nb-border-light);
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  background: var(--nb-gradient-primary);
  color: white;
  font-weight: var(--nb-font-weight-medium);
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
}

.member-role {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.empty-tip {
  text-align: center;
  color: var(--nb-text-secondary);
  padding: var(--nb-space-10) 0;
}
</style>