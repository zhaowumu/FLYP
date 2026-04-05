<template>
  <div class="settings-page">
    <div class="page-header">
      <div class="header-left">
        <h2>系统设置</h2>
        <p>配置系统参数与角色权限</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="角色权限" name="permissions">
        <div class="permissions-container">
          <el-alert
            title="权限说明"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          >
            <template #default>
              <p>1. 此表配置的是各角色的<strong>基础权限</strong>，修改后需重新登录生效</p>
              <p>2. 实际权限 = 角色基础权限 ∪ 关系权限（负责人/创建人/报告人自动获得部分权限）</p>
            </template>
          </el-alert>

          <div class="permission-sections">
            <div class="permission-section">
              <div class="section-header">
                <h3>任务权限</h3>
                <span class="section-tip">创建人自动获得：转交、更改状态、更改优先级、关闭、重新打开 | 负责人自动获得：转交、更改状态、更改优先级、完成</span>
              </div>
              <el-table :data="taskActions" border size="default" style="width: 100%">
                <el-table-column prop="label" label="操作" width="150" align="center" />
                <el-table-column v-for="role in roleKeys" :key="role" :label="ROLE_LABELS[role]" align="center">
                  <template #default="{ row }">
                    <el-switch
                      :model-value="getPerm(role, 'task', row.key)"
                      @update:model-value="(val: boolean) => setPerm(role, 'task', row.key, val)"
                      :active-color="'#13ce66'"
                      :inactive-color="'#ff4949'"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="permission-section">
              <div class="section-header">
                <h3>缺陷权限</h3>
                <span class="section-tip">报告人自动获得：转交、更改状态、更改严重程度、验证通过、关闭、重新打开 | 负责人自动获得：转交、更改状态、更改优先级、已修复</span>
              </div>
              <el-table :data="bugActions" border size="default" style="width: 100%">
                <el-table-column prop="label" label="操作" width="150" align="center" />
                <el-table-column v-for="role in roleKeys" :key="role" :label="ROLE_LABELS[role]" align="center">
                  <template #default="{ row }">
                    <el-switch
                      :model-value="getPerm(role, 'bug', row.key)"
                      @update:model-value="(val: boolean) => setPerm(role, 'bug', row.key, val)"
                      :active-color="'#13ce66'"
                      :inactive-color="'#ff4949'"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="permission-section">
              <div class="section-header">
                <h3>项目权限</h3>
                <span class="section-tip">仅管理员和项目经理可创建项目，仅管理员可删除项目</span>
              </div>
              <el-table :data="projectActions" border size="default" style="width: 100%">
                <el-table-column prop="label" label="操作" width="150" align="center" />
                <el-table-column v-for="role in roleKeys" :key="role" :label="ROLE_LABELS[role]" align="center">
                  <template #default="{ row }">
                    <el-switch
                      :model-value="getPerm(role, 'project', row.key)"
                      @update:model-value="(val: boolean) => setPerm(role, 'project', row.key, val)"
                      :active-color="'#13ce66'"
                      :inactive-color="'#ff4949'"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>

          <div class="permission-actions">
            <el-button @click="resetPermissions">恢复默认</el-button>
            <el-button type="primary" @click="savePermissions" :loading="savingPermissions">保存权限配置</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="数据导入导出" name="export">
        <div class="content-card">
          <div class="export-section">
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">导出全部数据（原始格式）</div>
                <div class="export-desc">按数据表原结构导出，外键字段仅保存ID，适合数据备份和迁移</div>
              </div>
              <el-button type="warning" @click="exportRawData">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </div>
            <el-divider />
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">导出全部数据（可读格式）</div>
                <div class="export-desc">外键字段显示为对应的名称（如创建人显示为真实姓名），适合查看和汇报</div>
              </div>
              <el-button type="success" @click="exportAllData">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="自定义链接" name="customLinks">
        <div class="content-card">
          <div class="custom-links-container">
            <el-alert
              title="自定义链接说明"
              type="info"
              :closable="false"
              show-icon
              style="margin-bottom: 20px"
            >
              <template #default>
                <p>外链：点击后在新窗口打开指定URL</p>
                <p>共享文件夹：点击后复制路径到剪贴板，提示用户 Win+R 打开</p>
                <p>MD文档：点击后在应用内渲染显示 Markdown 文件内容</p>
              </template>
            </el-alert>

            <div class="links-list">
              <div v-for="(link, index) in customLinks" :key="index" class="link-item">
                <div class="link-fields">
                  <el-input
                    v-model="link.name"
                    placeholder="链接名称（如：代码规范）"
                    style="width: 160px"
                  />
                  <el-select v-model="link.type" placeholder="类型" style="width: 120px">
                    <el-option label="外链" value="url" />
                    <el-option label="共享文件夹" value="folder" />
                    <el-option label="MD文档" value="markdown" />
                  </el-select>
                  <div v-if="link.type === 'markdown'" class="markdown-input-area">
                    <el-select
                      v-model="link.url"
                      placeholder="选择 Markdown 文件"
                      style="width: 280px"
                      filterable
                    >
                      <el-option
                        v-for="file in markdownFiles"
                        :key="file.path"
                        :label="file.name"
                        :value="file.path"
                      />
                    </el-select>
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(file: File) => handleMarkdownUpload(file, index)"
                      accept=".md"
                    >
                      <el-button size="small" type="success" plain>
                        <el-icon><Upload /></el-icon>
                        上传
                      </el-button>
                    </el-upload>
                  </div>
                  <el-input
                    v-else
                    v-model="link.url"
                    :placeholder="link.type === 'folder' ? '文件夹路径（如：\\\\192.168.1.100\\share）' : '链接地址（如：https://docs.example.com）'"
                    style="width: 300px"
                  />
                  <el-select v-model="link.icon" placeholder="图标" style="width: 130px">
                    <el-option label="📄 文档" value="Document" />
                    <el-option label="🔗 链接" value="Link" />
                    <el-option label="📚 书籍" value="Reading" />
                    <el-option label="🌐 网站" value="Monitor" />
                    <el-option label="📊 图表" value="DataAnalysis" />
                    <el-option label="🛠️ 工具" value="Tools" />
                    <el-option label="💬 消息" value="ChatDotRound" />
                    <el-option label="📁 文件夹" value="FolderOpened" />
                  </el-select>
                  <el-button type="danger" :icon="Delete" @click="removeLink(index)" circle />
                </div>
              </div>
            </div>

            <div class="links-actions">
              <el-button type="primary" plain @click="addLink">
                <el-icon><Plus /></el-icon>
                添加链接
              </el-button>
              <el-button type="primary" @click="saveCustomLinks" :loading="savingCustomLinks">
                保存配置
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="数据备份" name="backup">
        <div class="content-card">
          <div class="backup-section">
            <div class="backup-item">
              <div class="backup-info">
                <div class="backup-title">备份数据</div>
                <div class="backup-desc">将所有数据（用户、项目、任务、缺陷、操作日志、系统配置）备份为JSON文件</div>
              </div>
              <el-button type="primary" @click="backupData" :loading="backupLoading">
                <el-icon><Download /></el-icon>
                备份
              </el-button>
            </div>
            <div class="backup-item">
              <div class="backup-info">
                <div class="backup-title">恢复数据</div>
                <div class="backup-desc">从备份文件恢复数据（会覆盖现有数据，请谨慎操作）</div>
              </div>
              <el-upload
                :show-file-list="false"
                :before-upload="restoreData"
                accept=".json"
              >
                <el-button type="warning" :loading="restoreLoading">
                  <el-icon><Upload /></el-icon>
                  恢复
                </el-button>
              </el-upload>
            </div>
            <div class="backup-item danger">
              <div class="backup-info">
                <div class="backup-title">清空数据库</div>
                <div class="backup-desc">清空所有项目、任务、缺陷数据（用户数据保留）</div>
              </div>
              <el-button type="danger" @click="clearDatabase" :loading="clearLoading">
                <el-icon><Delete /></el-icon>
                清空
              </el-button>
            </div>
            <div class="backup-item danger">
              <div class="backup-info">
                <div class="backup-title">清空所有数据</div>
                <div class="backup-desc">清空所有数据（包含用户、配置等全部数据表）</div>
              </div>
              <el-button type="danger" @click="clearAllDatabase" :loading="clearAllLoading">
                <el-icon><Delete /></el-icon>
                清空全部
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Download, Upload } from '@element-plus/icons-vue'
import { backupData as backupDataApi, restoreData as restoreDataApi, exportAll as exportAllApi, clearDatabase as clearDatabaseApi, clearAllDatabase as clearAllDatabaseApi } from '../api/excel'
import { getPermissions, updatePermissions } from '../api/permission'
import { getCustomLinks, updateCustomLinks, listMarkdownFiles } from '../api/customLink'
import api from '../api'

const activeTab = ref('permissions')
const backupLoading = ref(false)
const restoreLoading = ref(false)
const clearLoading = ref(false)
const clearAllLoading = ref(false)
const savingPermissions = ref(false)
const savingCustomLinks = ref(false)
const customLinks = ref<Array<{ name: string; url: string; icon: string; type: string }>>([])
const markdownFiles = ref<Array<{ name: string; path: string }>>([])

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  project_manager: '项目经理',
  developer: '程序',
  artist: '美术',
  designer: '策划',
  tester: '测试',
}

const roleKeys = Object.keys(ROLE_LABELS)

const taskActions = [
  { key: 'create', label: '创建任务' },
  { key: 'complete', label: '完成' },
  { key: 'reopen', label: '重新打开' },
  { key: 'close', label: '关闭' },
  { key: 'transfer', label: '转交' },
  { key: 'changePriority', label: '更改优先级' },
  { key: 'changeStatus', label: '更改状态' },
  { key: 'comment', label: '备注' },
  { key: 'delete', label: '删除' },
  { key: 'extendDueDate', label: '延期' },
]

const projectActions = [
  { key: 'create', label: '创建项目' },
  { key: 'delete', label: '删除项目' },
]

const bugActions = [
  { key: 'create', label: '创建BUG' },
  { key: 'fix', label: '已修复' },
  { key: 'reopen', label: '重新打开' },
  { key: 'verify', label: '验证通过' },
  { key: 'close', label: '关闭' },
  { key: 'transfer', label: '转交' },
  { key: 'changeSeverity', label: '更改严重程度' },
  { key: 'changeStatus', label: '更改状态' },
  { key: 'comment', label: '备注' },
  { key: 'delete', label: '删除' },
]

const DEFAULT_PERMISSIONS = {
  admin: {
    task: { create: true, complete: true, reopen: true, close: true, transfer: true, changePriority: true, changeStatus: true, comment: true, delete: true, extendDueDate: true },
    bug: { create: true, fix: true, reopen: true, verify: true, close: true, transfer: true, changeSeverity: true, changeStatus: true, comment: true, delete: true, extendDueDate: true },
    project: { create: true, delete: true },
  },
  project_manager: {
    task: { create: true, complete: true, reopen: true, close: true, transfer: true, changePriority: true, changeStatus: true, comment: true, delete: true, extendDueDate: true },
    bug: { create: true, fix: true, reopen: true, verify: true, close: true, transfer: true, changeSeverity: true, changeStatus: true, comment: true, delete: true, extendDueDate: true },
    project: { create: true, delete: false },
  },
  developer: {
    task: { create: true, complete: false, reopen: false, close: false, transfer: false, changePriority: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, fix: false, reopen: false, verify: false, close: false, transfer: false, changeSeverity: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    project: { create: false, delete: false },
  },
  artist: {
    task: { create: true, complete: false, reopen: false, close: false, transfer: false, changePriority: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, fix: false, reopen: false, verify: false, close: false, transfer: false, changeSeverity: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    project: { create: false, delete: false },
  },
  designer: {
    task: { create: true, complete: false, reopen: false, close: false, transfer: false, changePriority: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, fix: false, reopen: false, verify: false, close: false, transfer: false, changeSeverity: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    project: { create: false, delete: false },
  },
  tester: {
    task: { create: true, complete: false, reopen: false, close: false, transfer: false, changePriority: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, fix: false, reopen: false, verify: false, close: false, transfer: false, changeSeverity: false, changeStatus: false, comment: true, delete: false, extendDueDate: false },
    project: { create: false, delete: false },
  },
}

const permissions = ref<any>(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)))

function getPerm(role: string, module: string, key: string): boolean {
  return permissions.value?.[role]?.[module]?.[key] ?? false
}

function setPerm(role: string, module: string, key: string, value: boolean) {
  if (!permissions.value[role]) {
    permissions.value[role] = { task: {}, bug: {} }
  }
  if (!permissions.value[role][module]) {
    permissions.value[role][module] = {}
  }
  permissions.value[role][module][key] = value
}

async function loadPermissions() {
  try {
    const res = await getPermissions()
    if (res.data) {
      permissions.value = res.data
    }
  } catch {
    permissions.value = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
  }
}

async function savePermissions() {
  savingPermissions.value = true
  try {
    await updatePermissions(permissions.value)
    ElMessage.success('权限配置已保存，用户重新登录后生效')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingPermissions.value = false
  }
}

function resetPermissions() {
  permissions.value = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS))
  ElMessage.success('已恢复为默认权限配置')
}

function addLink() {
  customLinks.value.push({ name: '', url: '', icon: 'Link', type: 'url' })
}

function removeLink(index: number) {
  customLinks.value.splice(index, 1)
}

async function loadCustomLinks() {
  try {
    const res = await getCustomLinks()
    if (res.data) {
      customLinks.value = res.data
    }
  } catch {
    customLinks.value = []
  }
}

async function loadMarkdownFiles() {
  try {
    const res = await listMarkdownFiles()
    if (res.data) {
      markdownFiles.value = res.data
    }
  } catch {
    markdownFiles.value = []
  }
}

async function saveCustomLinks() {
  const validLinks = customLinks.value
    .filter(link => link.name && link.url)
    .map(({ name, url, icon, type }) => ({ name, url, icon, type }))
  if (validLinks.length === 0 && customLinks.value.length > 0) {
    ElMessage.warning('请至少填写一个完整的链接')
    return
  }
  savingCustomLinks.value = true
  try {
    await updateCustomLinks(validLinks)
    ElMessage.success('自定义链接已保存，刷新页面后生效')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingCustomLinks.value = false
  }
}

async function handleMarkdownUpload(file: File, index: number) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await api.post('/markdown/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    customLinks.value[index].url = res.data.path
    ElMessage.success('上传成功')
    await loadMarkdownFiles()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.error || '上传失败')
  }
  return false
}

async function exportRawData() {
  try {
    const res = await exportAllApi("raw")
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `flyp_export_raw_${Date.now()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

async function exportAllData() {
  try {
    const res = await exportAllApi()
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `flyp_export_${Date.now()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

async function backupData() {
  backupLoading.value = true
  try {
    const res = await backupDataApi()
    const blob = new Blob([res.data], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup_${Date.now()}.json`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('备份成功')
  } catch {
    ElMessage.error('备份失败')
  } finally {
    backupLoading.value = false
  }
}

async function restoreData(file: File) {
  try {
    await ElMessageBox.confirm(
      '恢复数据会覆盖现有数据，此操作不可撤销。确定要继续吗？',
      '警告',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    restoreLoading.value = true
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        await restoreDataApi(data)
        ElMessage.success('数据恢复成功')
      } catch {
        ElMessage.error('恢复失败，请检查备份文件格式')
      } finally {
        restoreLoading.value = false
      }
    }
    reader.onerror = () => {
      ElMessage.error('读取文件失败')
      restoreLoading.value = false
    }
    reader.readAsText(file)
  } catch {
    restoreLoading.value = false
  }
  return false
}

async function clearDatabase() {
  try {
    await ElMessageBox.confirm(
      '此操作将清空所有项目、任务和缺陷数据，此操作不可撤销！确定要继续吗？',
      '警告',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    clearLoading.value = true
    await clearDatabaseApi()
    ElMessage.success('数据库已清空')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '清空失败')
    }
  } finally {
    clearLoading.value = false
  }
}

async function clearAllDatabase() {
  try {
    await ElMessageBox.confirm(
      '此操作将清空所有数据（包含用户、配置等全部数据表），此操作不可撤销！确定要继续吗？',
      '严重警告',
      {
        confirmButtonText: '确定清空全部',
        cancelButtonText: '取消',
        type: 'error',
      }
    )

    clearAllLoading.value = true
    await clearAllDatabaseApi()
    ElMessage.success('所有数据已清空')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '清空失败')
    }
  } finally {
    clearAllLoading.value = false
  }
}

onMounted(() => {
  loadPermissions()
  loadCustomLinks()
  loadMarkdownFiles()
})
</script>

<style scoped>
.settings-page {
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

.permissions-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.permission-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.permission-section {
  padding: 8px 0;
}

.section-header {
  margin-bottom: 16px;
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.section-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  white-space: nowrap;
}

.section-tip {
  font-size: 12px;
  color: #909399;
}

.permission-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.export-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.export-info {
  flex: 1;
}

.export-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.export-desc {
  font-size: 12px;
  color: #909399;
}

.backup-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.backup-item.danger {
  background: #fef0f0;
  border: 1px solid #fde2e2;
}

.backup-info {
  flex: 1;
}

.backup-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
  font-weight: 500;
}

.backup-desc {
  font-size: 12px;
  color: #909399;
}

.custom-links-container {
  display: flex;
  flex-direction: column;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.link-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.link-fields {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.links-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.markdown-upload-area,
.markdown-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.uploaded-file-name {
  font-size: 12px;
  color: #67c23a;
  white-space: nowrap;
}

:deep(.el-tabs__content) {
  padding: 0;
}

:deep(.el-tabs--border-card) {
  border: none;
  box-shadow: none;
}

:deep(.el-alert__description p) {
  margin: 4px 0;
  line-height: 1.6;
}
</style>
