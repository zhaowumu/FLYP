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
                <div class="export-title">导出全部数据</div>
                <div class="export-desc">将所有数据导出为Excel文件（包含用户、项目、任务、缺陷多个工作表）</div>
              </div>
              <el-button type="success" @click="exportAllData">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </div>
            <el-divider />
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">导出任务</div>
                <div class="export-desc">将所有任务导出为Excel文件</div>
              </div>
              <el-button @click="exportTasks">导出</el-button>
            </div>
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">导出缺陷</div>
                <div class="export-desc">将所有缺陷导出为Excel文件</div>
              </div>
              <el-button @click="exportBugs">导出</el-button>
            </div>
            <el-divider />
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">任务导入模板</div>
                <div class="export-desc">下载任务导入Excel模板</div>
              </div>
              <el-button @click="downloadTaskTemplate">下载</el-button>
            </div>
            <div class="export-item">
              <div class="export-info">
                <div class="export-title">缺陷导入模板</div>
                <div class="export-desc">下载缺陷导入Excel模板</div>
              </div>
              <el-button @click="downloadBugTemplate">下载</el-button>
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
                <div class="backup-desc">将所有数据（任务、缺陷、项目、用户）备份为JSON文件</div>
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
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { exportTasks as exportTasksApi, exportBugs as exportBugsApi, downloadTaskTemplate as downloadTaskTemplateApi, downloadBugTemplate as downloadBugTemplateApi, backupData as backupDataApi, restoreData as restoreDataApi, exportAll as exportAllApi, clearDatabase as clearDatabaseApi } from '../api/excel'
import { getPermissions, updatePermissions } from '../api/permission'

const activeTab = ref('permissions')
const backupLoading = ref(false)
const restoreLoading = ref(false)
const clearLoading = ref(false)
const savingPermissions = ref(false)

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

async function exportTasks() {
  try {
    const res = await exportTasksApi()
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tasks_${Date.now()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

async function exportBugs() {
  try {
    const res = await exportBugsApi()
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bugs_${Date.now()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

async function downloadTaskTemplate() {
  try {
    const res = await downloadTaskTemplateApi()
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'task_import_template.xlsx'
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch {
    ElMessage.error('下载失败')
  }
}

async function downloadBugTemplate() {
  try {
    const res = await downloadBugTemplateApi()
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'bug_import_template.xlsx'
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch {
    ElMessage.error('下载失败')
  }
}

async function exportAllData() {
  try {
    const res = await exportAllApi()
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `full_export_${Date.now()}.xlsx`
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

onMounted(() => {
  loadPermissions()
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
