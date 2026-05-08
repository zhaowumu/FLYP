<template>
  <div class="markdown-viewer">
    <div class="page-header">
      <div class="header-left">
        <h2>{{ title }}</h2>
        <p v-if="updatedAt">最后更新：{{ formatDate(updatedAt) }}</p>
      </div>
    </div>

    <div class="content-card" v-loading="loading">
      <div v-if="error" class="error-tip">
        <el-empty :description="error" />
      </div>
      <div v-else class="markdown-body" v-html="renderedHtml"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import api from '../api'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const title = ref('')
const updatedAt = ref('')
const renderedHtml = ref('')

async function loadMarkdown() {
  const filePath = route.query.path as string
  const fileName = route.query.name as string

  if (!filePath) {
    error.value = '缺少文件路径'
    loading.value = false
    return
  }

  title.value = fileName || 'Markdown 文档'
  loading.value = true

  try {
    const res = await api.get('/markdown/read', { params: { path: filePath } })
    renderedHtml.value = marked(res.data.content)
    updatedAt.value = res.data.updatedAt
  } catch (err: any) {
    error.value = err?.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadMarkdown()
})
</script>

<style scoped>
.markdown-viewer {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  padding: var(--nb-space-8);
  box-shadow: var(--nb-shadow-sm);
  min-height: 400px;
}

.error-tip {
  padding: 60px 0;
}

.markdown-body :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-body :deep(h3) {
  font-size: 1.25em;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-body :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
  line-height: 1.8;
}

.markdown-body :deep(code) {
  background-color: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow: auto;
  line-height: 1.45;
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding: 0 16px;
  color: #6a737d;
  margin: 0 0 16px 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}

.markdown-body :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

.markdown-body :deep(img) {
  max-width: 100%;
  box-sizing: border-box;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2em;
  margin-bottom: 16px;
}

.markdown-body :deep(hr) {
  border: 0;
  border-top: 1px solid #eaecef;
  margin: 24px 0;
}
</style>
