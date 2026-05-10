<template>
  <el-dialog
    v-model="visible"
    width="640px"
    :show-close="false"
    class="global-search-dialog"
    :before-close="handleClose"
  >
    <template #header>
      <div class="search-header">
        <el-icon class="search-icon"><Search /></el-icon>
        <el-input
          ref="inputRef"
          v-model="query"
          placeholder="搜索项目、任务、缺陷..."
          class="search-input"
          @input="handleSearch"
          @keydown.esc="handleClose"
        />
        <kbd class="shortcut-hint">ESC</kbd>
      </div>
    </template>

    <div v-loading="loading" class="search-results">
      <template v-if="query.trim().length > 0">
        <div v-if="hasResults" class="results-container">
          <!-- Projects -->
          <div v-if="results.projects.length > 0" class="result-group">
            <div class="result-group-title">
              <el-icon><Folder /></el-icon>
              <span>项目 ({{ results.projects.length }})</span>
            </div>
            <div
              v-for="project in results.projects"
              :key="'project-' + project.id"
              class="result-item"
              @click="handleSelect('project', project)"
            >
              <div class="result-icon project-icon">
                <el-icon><Folder /></el-icon>
              </div>
              <div class="result-content">
                <div class="result-title" v-html="highlightText(project.name)"></div>
                <div class="result-meta">
                  <span class="result-type">项目</span>
                  <span v-if="project.manager" class="result-separator">·</span>
                  <span v-if="project.manager" class="result-assignee">{{ project.manager.realName }}</span>
                </div>
              </div>
              <el-icon class="result-arrow"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- Tasks -->
          <div v-if="results.tasks.length > 0" class="result-group">
            <div class="result-group-title">
              <el-icon><List /></el-icon>
              <span>任务 ({{ results.tasks.length }})</span>
            </div>
            <div
              v-for="task in results.tasks"
              :key="'task-' + task.id"
              class="result-item"
              @click="handleSelect('task', task)"
            >
              <div class="result-icon task-icon">
                <el-icon><List /></el-icon>
              </div>
              <div class="result-content">
                <div class="result-title" v-html="highlightText(task.title)"></div>
                <div class="result-meta">
                  <span class="result-type">任务 #{{ task.id }}</span>
                  <span class="result-separator">·</span>
                  <el-tag :type="getPriorityType(task.priority)" size="small" class="priority-tag">{{ getPriorityLabel(task.priority) }}</el-tag>
                  <span class="result-separator">·</span>
                  <el-tag :type="getStatusType(task.status)" size="small" class="status-tag">{{ getStatusLabel(task.status) }}</el-tag>
                  <span v-if="task.project" class="result-separator">·</span>
                  <span v-if="task.project" class="result-project">{{ task.project.name }}</span>
                </div>
              </div>
              <el-icon class="result-arrow"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- Bugs -->
          <div v-if="results.bugs.length > 0" class="result-group">
            <div class="result-group-title">
              <el-icon><Warning /></el-icon>
              <span>缺陷 ({{ results.bugs.length }})</span>
            </div>
            <div
              v-for="bug in results.bugs"
              :key="'bug-' + bug.id"
              class="result-item"
              @click="handleSelect('bug', bug)"
            >
              <div class="result-icon bug-icon">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="result-content">
                <div class="result-title" v-html="highlightText(bug.title)"></div>
                <div class="result-meta">
                  <span class="result-type">缺陷 #{{ bug.id }}</span>
                  <span class="result-separator">·</span>
                  <el-tag :type="getSeverityType(bug.severity)" size="small" class="severity-tag">{{ getSeverityLabel(bug.severity) }}</el-tag>
                  <span class="result-separator">·</span>
                  <el-tag :type="getBugStatusType(bug.status)" size="small" class="status-tag">{{ getBugStatusLabel(bug.status) }}</el-tag>
                  <span v-if="bug.project" class="result-separator">·</span>
                  <span v-if="bug.project" class="result-project">{{ bug.project.name }}</span>
                </div>
              </div>
              <el-icon class="result-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>

        <div v-else class="no-results">
          <el-icon class="no-results-icon"><Search /></el-icon>
          <p>未找到匹配的结果</p>
          <p class="no-results-hint">尝试使用其他关键词搜索</p>
        </div>
      </template>

      <div v-else class="search-hint">
        <p>输入关键词搜索项目、任务和缺陷</p>
        <div class="shortcut-tips">
          <span><kbd>Ctrl</kbd> + <kbd>K</kbd> 打开搜索</span>
          <span><kbd>ESC</kbd> 关闭搜索</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { globalSearch } from '../api/search'
import { ElMessage } from 'element-plus'
import {
  Search,
  Folder,
  List,
  Warning,
  ArrowRight,
} from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const router = useRouter()
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const query = ref('')
const loading = ref(false)
const inputRef = ref()

const results = ref<{
  tasks: any[]
  bugs: any[]
  projects: any[]
}>({
  tasks: [],
  bugs: [],
  projects: []
})

const hasResults = computed(() => {
  return results.value.tasks.length > 0 ||
    results.value.bugs.length > 0 ||
    results.value.projects.length > 0
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  
  if (query.value.trim().length === 0) {
    results.value = { tasks: [], bugs: [], projects: [] }
    return
  }

  loading.value = true
  searchTimer = setTimeout(async () => {
    try {
      const res = await globalSearch(query.value.trim())
      results.value = res.data
    } catch {
      ElMessage.error('搜索失败')
    } finally {
      loading.value = false
    }
  }, 300)
}

function highlightText(text: string) {
  if (!query.value.trim()) return text
  const regex = new RegExp(`(${query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function handleSelect(type: string, item: any) {
  visible.value = false
  switch (type) {
    case 'project':
      router.push(`/projects/${item.id}`)
      break
    case 'task':
      router.push(`/tasks/${item.id}`)
      break
    case 'bug':
      router.push(`/bugs/${item.id}`)
      break
  }
}

function handleClose() {
  visible.value = false
  query.value = ''
  results.value = { tasks: [], bugs: [], projects: [] }
}

function getPriorityType(priority: string) {
  const map: Record<string, any> = {
    urgent: 'danger',
    high: 'warning',
    medium: '',
    low: 'info'
  }
  return map[priority] || ''
}

function getPriorityLabel(priority: string) {
  const map: Record<string, string> = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[priority] || priority
}

function getStatusType(status: string) {
  const map: Record<string, any> = {
    pending: 'primary',
    in_progress: 'warning',
    completed: 'success',
    closed: ''
  }
  return map[status] || ''
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    closed: '已关闭'
  }
  return map[status] || status
}

function getSeverityType(severity: string) {
  const map: Record<string, any> = {
    critical: 'danger',
    high: 'warning',
    medium: '',
    low: 'info'
  }
  return map[severity] || ''
}

function getSeverityLabel(severity: string) {
  const map: Record<string, string> = {
    critical: '严重',
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[severity] || severity
}

function getBugStatusType(status: string) {
  const map: Record<string, any> = {
    pending: 'primary',
    in_progress: 'warning',
    fixed: 'warning',
    verified: '',
    closed: 'info'
  }
  return map[status] || ''
}

function getBugStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    in_progress: '处理中',
    fixed: '已修复',
    verified: '已验证',
    closed: '已关闭'
  }
  return map[status] || status
}

watch(visible, async (val) => {
  if (val) {
    await nextTick()
    inputRef.value?.focus()
  }
})
</script>

<style scoped>
.global-search-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.global-search-dialog :deep(.el-dialog__body) {
  padding: 0;
  max-height: 480px;
  overflow-y: auto;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  gap: 12px;
}

.search-icon {
  font-size: 20px;
  color: #909399;
}

.search-input {
  flex: 1;
}

.search-input :deep(.el-input__wrapper) {
  box-shadow: none;
  padding: 0;
}

.search-input :deep(.el-input__inner) {
  font-size: 16px;
}

.shortcut-hint {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.search-results {
  min-height: 120px;
}

.results-container {
  padding: 8px 0;
}

.result-group {
  margin-bottom: 8px;
}

.result-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  font-size: 12px;
  color: #909399;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 12px;
}

.result-item:hover {
  background-color: #f5f7fa;
}

.result-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.project-icon {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
}

.task-icon {
  background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%);
  color: white;
}

.bug-icon {
  background: linear-gradient(135deg, #f56c6c 0%, #e6a23c 100%);
  color: white;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-title :deep(mark) {
  background: #fff5e6;
  color: #e6a23c;
  padding: 0 2px;
  border-radius: 2px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.result-type {
  color: #606266;
}

.result-separator {
  color: #dcdfe6;
}

.result-project {
  color: #409eff;
}

.result-assignee {
  color: #606266;
}

.priority-tag,
.status-tag,
.severity-tag {
  font-size: 11px;
  padding: 0 6px;
  height: 20px;
  line-height: 18px;
}

.result-arrow {
  color: #c0c4cc;
  opacity: 0;
  transition: opacity 0.2s;
}

.result-item:hover .result-arrow {
  opacity: 1;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #909399;
}

.no-results-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #dcdfe6;
}

.no-results p {
  margin: 0;
  font-size: 14px;
}

.no-results-hint {
  font-size: 12px;
  margin-top: 8px !important;
  color: #c0c4cc;
}

.search-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #909399;
}

.search-hint p {
  margin: 0;
  font-size: 14px;
}

.shortcut-tips {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  font-size: 12px;
  color: #c0c4cc;
}

.shortcut-tips kbd {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  margin: 0 2px;
}
</style>
