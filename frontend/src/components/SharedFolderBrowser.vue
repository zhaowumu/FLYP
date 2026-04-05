<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="folder-browser">
      <div class="breadcrumb-bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <a href="#" @click.prevent="navigateTo(rootPath)">{{ rootPath }}</a>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-for="(part, index) in breadcrumbParts" :key="index">
            <a href="#" @click.prevent="navigateTo(buildPath(index))">{{ part }}</a>
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <el-table
        v-loading="loading"
        :data="items"
        stripe
        style="width: 100%"
        @row-dblclick="handleRowDblClick"
      >
        <el-table-column label="名称" min-width="300">
          <template #default="{ row }">
            <div class="file-name">
              <el-icon class="file-icon" :class="{ 'is-folder': row.isDirectory }">
                <Folder v-if="row.isDirectory" />
                <Document v-else />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120" align="right">
          <template #default="{ row }">
            <span v-if="!row.isDirectory">{{ formatSize(row.size) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.modifiedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="!row.isDirectory"
              type="primary"
              link
              @click="downloadFile(row.path)"
            >
              下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="items.length === 0 && !loading" class="empty-tip">
        文件夹为空
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Folder, Document } from '@element-plus/icons-vue'
import api from '../api'

const props = defineProps<{
  modelValue: boolean
  title: string
  rootPath: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const loading = ref(false)
const currentPath = ref('')
const items = ref<Array<{ name: string; isDirectory: boolean; size: number; modifiedAt: string; path: string }>>([])

const breadcrumbParts = computed(() => {
  if (!currentPath.value) return []
  const normalized = currentPath.value.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length > 2) return parts.slice(2)
  return parts
})

function buildPath(index: number): string {
  const normalized = currentPath.value.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  const isUnc = currentPath.value.startsWith('\\\\')
  if (isUnc) {
    return '\\\\' + parts.slice(0, index + 3).join('\\')
  }
  return parts.slice(0, index + 1).join('/')
}

function navigateTo(path: string) {
  loadFolder(path)
}

async function loadFolder(folderPath: string) {
  loading.value = true
  try {
    const res = await api.get('/shared-folder/list', { params: { path: folderPath } })
    currentPath.value = res.data.path
    items.value = res.data.items
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '读取文件夹失败')
  } finally {
    loading.value = false
  }
}

function handleRowDblClick(row: any) {
  if (row.isDirectory) {
    loadFolder(row.path)
  }
}

async function downloadFile(filePath: string) {
  try {
    const res = await api.get('/shared-folder/download', {
      params: { path: filePath },
      responseType: 'blob',
    })
    const blob = new Blob([res.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filePath.split(/[\\/]/).pop() || 'file'
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '下载失败')
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

function handleClose() {
  items.value = []
  currentPath.value = ''
}

watch(visible, (val) => {
  if (val && props.rootPath) {
    loadFolder(props.rootPath)
  }
})
</script>

<style scoped>
.folder-browser {
  min-height: 300px;
}

.breadcrumb-bar {
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 18px;
  color: #909399;
}

.file-icon.is-folder {
  color: #e6a23c;
}

.empty-tip {
  text-align: center;
  padding: 40px;
  color: #909399;
}

:deep(.el-table__row) {
  cursor: pointer;
}
</style>
