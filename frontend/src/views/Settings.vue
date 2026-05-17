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
                <span class="section-tip">以下操作由关系权限控制，不在系统设置中显示：完成、转交（仅负责人）、打回、关闭（仅创建人）</span>
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
                <span class="section-tip">以下操作由关系权限控制，不在系统设置中显示：修复（仅负责人）、验证通过/打回/关闭（仅报告人）、转交（仅负责人）</span>
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
          <!-- 自动备份状态 -->
          <div class="auto-backup-status">
            <div class="backup-item backup-item-info" style="background: var(--nb-primary-lighter); border: 1px solid var(--nb-primary-lighter);">
              <div class="backup-info">
                <div class="backup-title">
                  <span>自动备份</span>
                  <el-tag v-if="backupStatus.running" type="success" size="small" style="margin-left: 8px;">运行中</el-tag>
                  <el-tag v-else type="info" size="small" style="margin-left: 8px;">未运行</el-tag>
                </div>
                <div class="backup-desc">
                  每天凌晨 3:00 自动备份，保留最近 30 份 &nbsp;|&nbsp; 当前已有 <strong>{{ backupStatus.backupCount }}</strong> 份备份
                </div>
              </div>
              <el-button type="success" @click="handleBackupNow" :loading="backupNowLoading" plain>
                <el-icon><RefreshRight /></el-icon>
                立即备份
              </el-button>
            </div>
          </div>

          <!-- 云端备份（Gitee） -->
          <div class="cloud-backup-section">
            <div class="cloud-backup-header">
              <span class="list-title" style="border-left-color: var(--nb-warning);">Gitee 云端备份</span>
              <el-switch
                v-model="giteeConfig.enabled"
                active-text="启用"
                inactive-text="关闭"
                style="--el-switch-on-color: #13ce66"
              />
            </div>
            <p style="margin: 0 0 16px 13px; font-size: var(--nb-font-size-sm); color: var(--nb-text-secondary);">
              启用后，每次自动备份和手动备份都会同步上传到 Gitee 仓库，实现异地灾备
            </p>
            <el-form v-if="giteeConfig.enabled" label-width="120px" style="margin-bottom: 16px">
              <el-form-item label="Access Token">
                <el-input
                  v-model="giteeConfig.token"
                  placeholder="在 Gitee 设置 → 私人令牌 中生成"
                  style="width: 500px"
                  show-password
                  clearable
                />
              </el-form-item>
              <el-form-item label="仓库路径">
                <el-input
                  v-model="giteeConfig.owner"
                  placeholder="用户名"
                  style="width: 200px"
                  clearable
                />
                <span style="margin: 0 8px; color: var(--nb-text-secondary);">/</span>
                <el-input
                  v-model="giteeConfig.repo"
                  placeholder="仓库名"
                  style="width: 200px"
                  clearable
                />
              </el-form-item>
              <el-form-item label="分支">
                <el-input
                  v-model="giteeConfig.branch"
                  placeholder="main"
                  style="width: 200px"
                  clearable
                />
                <span style="margin-left: 12px; color: var(--nb-text-secondary); font-size: var(--nb-font-size-sm);">默认 main</span>
              </el-form-item>
            </el-form>
            <div class="cloud-backup-actions" v-if="giteeConfig.enabled">
              <el-button type="primary" @click="saveGiteeConfig" :loading="savingGiteeConfig" plain>
                保存配置
              </el-button>
              <el-button @click="testGiteeConfig" :loading="testingGiteeConfig" plain>
                测试连接
              </el-button>
            </div>
            <div v-if="giteeTestResult" :class="['cloud-backup-result', giteeTestResult.success ? 'success' : 'error']">
              {{ giteeTestResult.message }}
            </div>
          </div>

          <el-divider />
          <div class="backup-list-header">
            <span class="list-title">备份文件列表</span>
            <el-button size="small" @click="loadBackupList" :loading="backupListLoading" circle>
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <el-table :data="backupFiles" size="small" style="width: 100%" v-loading="backupListLoading" max-height="300">
            <el-table-column label="文件名" prop="name" min-width="200">
              <template #default="{ row }">
                <span :style="{ fontWeight: row.name.startsWith('newbee_auto_') ? 'normal' : '500' }">
                  {{ row.name }}
                </span>
                <el-tag v-if="row.name.startsWith('newbee_auto_')" type="success" size="small" style="margin-left: 6px;">自动</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="大小" width="100" align="center">
              <template #default="{ row }">
                {{ formatSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column label="时间" width="180" align="center">
              <template #default="{ row }">
                {{ formatDate(row.date) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="handleDownloadBackup(row.name)">
                  下载
                </el-button>
                <el-button size="small" type="danger" link @click="handleDeleteBackup(row.name)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!backupListLoading && backupFiles.length === 0" description="暂无备份文件" :image-size="60" />

          <el-divider />

          <!-- 手动备份操作 -->
          <div class="backup-section">
            <div class="backup-item">
              <div class="backup-info">
                <div class="backup-title">手动备份数据库</div>
                <div class="backup-desc">直接下载数据库文件（newbee.db），100% 完整备份，恢复最快最可靠</div>
              </div>
              <el-button type="primary" @click="backupData" :loading="backupLoading">
                <el-icon><Download /></el-icon>
                备份
              </el-button>
            </div>
            <div class="backup-item">
              <div class="backup-info">
                <div class="backup-title">恢复数据库</div>
                <div class="backup-desc">从备份的数据库文件恢复（会覆盖现有数据，请谨慎操作）</div>
              </div>
              <el-upload
                :show-file-list="false"
                :before-upload="restoreData"
                accept=".db"
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
            <div class="backup-item">
              <div class="backup-info">
                <div class="backup-title">清理孤儿文件</div>
                <div class="backup-desc">扫描上传目录，删除不被任何任务、缺陷或操作日志引用的图片、视频等文件，释放磁盘空间</div>
              </div>
              <el-button type="warning" @click="cleanOrphanedFiles" :loading="cleaningOrphaned">
                <el-icon><Delete /></el-icon>
                清理
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="钉钉通知" name="dingtalk">
        <div class="content-card">
          <el-alert
            title="钉钉机器人配置说明"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          >
            <template #default>
              <p><strong>配置步骤：</strong></p>
              <p>1. 打开钉钉电脑版，进入需要接收通知的群聊</p>
              <p>2. 点击右上角「群设置」→「智能群助手」→「添加机器人」</p>
              <p>3. 选择「自定义」机器人，设置机器人名称</p>
              <p>4. 勾选「加签」或「关键字」安全设置（建议勾选关键字：任务、BUG、通知）</p>
              <p>5. 复制机器人Webhook地址，粘贴到下方输入框</p>
              <p>6. <strong>Webhook地址格式：</strong> https://oapi.dingtalk.com/robot/send?access_token=xxxxx</p>
            </template>
          </el-alert>

          <el-divider content-position="left">基础配置</el-divider>

          <el-form label-width="120px" style="margin-bottom: 24px">
            <el-form-item label="Webhook地址">
              <el-input
                v-model="dingtalkWebhook"
                placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxxxx"
                style="width: 500px"
                clearable
              />
            </el-form-item>
            <el-form-item label="加签密钥">
              <el-input
                v-model="dingtalkSecret"
                placeholder="SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                style="width: 500px"
                clearable
              />
              <span style="margin-left: 12px; color: var(--nb-text-secondary); font-size: var(--nb-font-size-sm);">勾选"加签"时填写</span>
            </el-form-item>
            <el-form-item label="关键字">
              <el-input
                v-model="dingtalkKeyword"
                placeholder="任务"
                style="width: 200px"
                clearable
              />
              <span style="margin-left: 12px; color: var(--nb-text-secondary); font-size: var(--nb-font-size-sm);">勾选"关键字"时填写</span>
            </el-form-item>
            <el-form-item label="系统地址">
              <el-input
                v-model="dingtalkBaseUrl"
                placeholder="http://192.168.1.100:3000"
                style="width: 500px"
                clearable
              />
              <span style="margin-left: 12px; color: var(--nb-text-secondary); font-size: var(--nb-font-size-sm);">用于生成通知中的详情链接</span>
            </el-form-item>
          </el-form>

          <el-divider content-position="left">通知模板配置</el-divider>

          <el-alert
            title="模板变量说明"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 20px"
          >
            <template #default>
              <p><strong>通用变量：</strong> {type}（任务/BUG）、{title}、{time}、{baseUrl}、{detailLink}</p>
              <p><strong>创建通知：</strong> {type}、{title}、{priority}、{creator}、{assigneeName}、{assigneePhones}、{time}</p>
              <p><strong>状态变更：</strong> {type}、{title}、{oldStatus}、{newStatus}、{operator}、{time}</p>
              <p><strong>负责人变更：</strong> {type}、{title}、{oldAssignee}、{newAssignee}、{assigneePhones}、{operator}、{time}</p>
              <p style="margin-top: 8px;">
                <strong>@ 提及说明：</strong>
                模板中使用 <code>{assigneePhones}</code> 会自动渲染为 <code>@手机号</code> 格式，
                同时系统会设置消息 @ 属性的手机号列表。该变量依赖用户的手机号字段。
              </p>
              <p style="margin-top: 4px;">
                <strong>标题链接：</strong>
                模板中使用 <code>{detailLink}</code> 即生成完整的详情页URL，
                也可直接使用 Markdown 链接语法 <code>[标题文字]({detailLink})</code>。
                未填写模板时使用系统默认模板（含标题链接和 @ 提及）。
              </p>
              <p>留空则使用默认模板，支持Markdown格式</p>
            </template>
          </el-alert>

          <div class="notify-config-list">
            <div v-for="(item, key) in notifyConfigs" :key="key" class="notify-config-item">
              <div class="notify-header">
                <div class="notify-header-left">
                  <el-switch
                    v-model="item.enabled"
                    active-text=""
                    style="--el-switch-on-color: #13ce66"
                  />
                  <span class="notify-type-label">{{ item.label }}</span>
                </div>
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :loading="testLoadingByType[key]"
                  :disabled="!dingtalkWebhook"
                  @click="testDingTalkByTypeHandler(key)"
                >
                  <el-icon style="margin-right: 4px"><VideoPlay /></el-icon>
                  测试发送
                </el-button>
              </div>
              <div class="template-preview" v-if="item.enabled">
                <div class="template-preview-header">
                  <span class="template-label">自定义模板</span>
                  <span class="template-label-hint">留空使用默认模板</span>
                </div>
              <el-input
                v-if="item.enabled"
                v-model="item.template"
                type="textarea"
                :rows="3"
                :placeholder="'默认模板：' + item.defaultTemplate"
                style="margin-top: 0"
              />
              </div>
            </div>
          </div>

          <div class="dingtalk-actions">
            <el-button type="primary" @click="saveDingTalkConfig" :loading="savingDingtalk">
              保存配置
            </el-button>
            <el-button @click="testDingTalkGeneral" :loading="testingDingtalk" :disabled="!dingtalkWebhook">
              发送通用测试
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Download, Upload, Refresh, RefreshRight, VideoPlay } from '@element-plus/icons-vue'
import { backupData as backupDataApi, restoreData as restoreDataApi, exportAll as exportAllApi, clearDatabase as clearDatabaseApi, clearAllDatabase as clearAllDatabaseApi, getBackupStatus as getBackupStatusApi, getBackupList as getBackupListApi, downloadBackup as downloadBackupApi, deleteBackupFile as deleteBackupFileApi, backupNow as backupNowApi } from '../api/excel'
import { getPermissions, updatePermissions } from '../api/permission'
import { getCustomLinks, updateCustomLinks, listMarkdownFiles } from '../api/customLink'
import { getDingTalkConfig, updateDingTalkConfig, testDingTalkByType, getGiteeBackupConfig, updateGiteeBackupConfig, testGiteeBackupConnection } from '../api/systemConfig'
import api from '../api'

const activeTab = ref('permissions')
const backupLoading = ref(false)
const restoreLoading = ref(false)
const clearLoading = ref(false)
const clearAllLoading = ref(false)
const cleaningOrphaned = ref(false)
const backupStatus = ref<{ running: boolean; schedule: string; backupCount: number }>({ running: false, schedule: '', backupCount: 0 })
const backupFiles = ref<Array<{ name: string; size: number; date: string }>>([])
const backupListLoading = ref(false)
const backupNowLoading = ref(false)
const savingPermissions = ref(false)
const savingCustomLinks = ref(false)
const savingDingtalk = ref(false)
const testingDingtalk = ref(false)
const testLoadingByType = ref<Record<string, boolean>>({})
const customLinks = ref<Array<{ name: string; url: string; icon: string; type: string }>>([])
const markdownFiles = ref<Array<{ name: string; path: string }>>([])
const dingtalkWebhook = ref('')
const dingtalkSecret = ref('')
const dingtalkKeyword = ref('')
const dingtalkBaseUrl = ref('')

// Gitee 云备份
const giteeConfig = ref({ enabled: false, token: '', owner: '', repo: '', branch: 'main' })
const savingGiteeConfig = ref(false)
const testingGiteeConfig = ref(false)
const giteeTestResult = ref<{ success: boolean; message: string } | null>(null)

const defaultTemplates = {
  create_task: '🔗 **[{title}]({detailLink})**\n\n**操作：** 创建任务\n**创建人：** {creator}\n**优先级：** {priority}\n**负责人：** {assigneeName}\n**时间：** {time}',
  create_bug: '🔗 **[{title}]({detailLink})**\n\n**操作：** 创建缺陷\n**创建人：** {creator}\n**严重程度：** {severity}\n**负责人：** {assigneeName}\n**时间：** {time}',
  assign_task: '🔗 **[{title}]({detailLink})**\n\n**操作：** 指派任务\n**{oldAssignee}** → **{newAssignee}**\n**操作人：** {operator}\n**时间：** {time}',
  complete_task: '🔗 **[{title}]({detailLink})**\n\n**操作：** 完成任务\n**完成人：** {operator}\n**时间：** {time}',
  reject_task: '🔗 **[{title}]({detailLink})**\n\n**操作：** 打回任务\n**操作人：** {operator}\n**时间：** {time}',
  submit_test_task: '🔗 **[{title}]({detailLink})**\n\n**操作：** 提测\n**测试负责人：** {assigneeName}\n**操作人：** {operator}\n**时间：** {time}',
  pass_test_task: '🔗 **[{title}]({detailLink})**\n\n**操作：** 测试通过\n**操作人：** {operator}\n**时间：** {time}',
  restart_task: '🔗 **[{title}]({detailLink})**\n\n**操作：** 重启任务\n**负责人：** {assigneeName}\n**操作人：** {operator}\n**时间：** {time}',
  assign_bug: '🔗 **[{title}]({detailLink})**\n\n**操作：** 分配缺陷\n**{oldAssignee}** → **{newAssignee}**\n**操作人：** {operator}\n**时间：** {time}',
  fix_bug: '🔗 **[{title}]({detailLink})**\n\n**操作：** 修复缺陷\n**修复人：** {operator}\n**时间：** {time}',
  verify_bug: '🔗 **[{title}]({detailLink})**\n\n**操作：** 验证通过\n**操作人：** {operator}\n**时间：** {time}',
  reject_bug: '🔗 **[{title}]({detailLink})**\n\n**操作：** 打回缺陷\n**操作人：** {operator}\n**时间：** {time}',
  restart_bug: '🔗 **[{title}]({detailLink})**\n\n**操作：** 重启缺陷\n**负责人：** {assigneeName}\n**操作人：** {operator}\n**时间：** {time}'
}

const notifyConfigLabels = {
  create_task: '新建任务',
  create_bug: '新建缺陷',
  assign_task: '指派任务',
  complete_task: '完成任务',
  reject_task: '打回任务',
  submit_test_task: '提测任务',
  pass_test_task: '任务测试通过',
  restart_task: '重启任务',
  assign_bug: '分配缺陷',
  fix_bug: '修复缺陷',
  verify_bug: '验证通过',
  reject_bug: '打回缺陷',
  restart_bug: '重启缺陷'
}

const notifyConfigs = ref<Record<string, { enabled: boolean; template: string; label: string; defaultTemplate: string }>>({})

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
  { key: 'assign', label: '指派' },
  { key: 'restart', label: '重启' },
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
  { key: 'assign', label: '分配' },
  { key: 'restartBug', label: '重启' },
  { key: 'comment', label: '备注' },
  { key: 'delete', label: '删除' },
  { key: 'extendDueDate', label: '延期' },
]

const DEFAULT_PERMISSIONS = {
  admin: {
    task: { create: true, assign: true, restart: true, comment: true, delete: true, extendDueDate: true },
    bug: { create: true, assign: true, restartBug: true, comment: true, delete: true, extendDueDate: true },
    project: { create: true, delete: true },
  },
  project_manager: {
    task: { create: true, assign: true, restart: true, comment: true, delete: true, extendDueDate: true },
    bug: { create: true, assign: true, restartBug: true, comment: true, delete: true, extendDueDate: true },
    project: { create: true, delete: false },
  },
  developer: {
    task: { create: true, assign: false, restart: true, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, assign: false, restartBug: true, comment: true, delete: false, extendDueDate: false },
    project: { create: false, delete: false },
  },
  artist: {
    task: { create: true, assign: false, restart: true, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, assign: false, restartBug: true, comment: true, delete: false, extendDueDate: false },
    project: { create: false, delete: false },
  },
  designer: {
    task: { create: true, assign: false, restart: true, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, assign: false, restartBug: true, comment: true, delete: false, extendDueDate: false },
    project: { create: false, delete: false },
  },
  tester: {
    task: { create: true, assign: false, restart: true, comment: true, delete: false, extendDueDate: false },
    bug: { create: true, assign: false, restartBug: true, comment: true, delete: false, extendDueDate: false },
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

async function loadDingTalkConfig() {
  try {
    const res = await getDingTalkConfig()
    if (res.data) {
      dingtalkWebhook.value = res.data.webhook || ''
      dingtalkSecret.value = res.data.secret || ''
      dingtalkKeyword.value = res.data.keyword || ''
      dingtalkBaseUrl.value = res.data.baseUrl || ''
      
      const notify = res.data.notify || {}
      const configs: Record<string, any> = {}
      // 只加载有效的通知类型，跳过废弃的 priority_change
      for (const [key, label] of Object.entries(notifyConfigLabels)) {
        const cfg = notify[key] || { enabled: true, template: '' }
        configs[key] = {
          enabled: cfg.enabled !== false,
          template: cfg.template || '',
          label,
          defaultTemplate: defaultTemplates[key as keyof typeof defaultTemplates]
        }
      }
      notifyConfigs.value = configs
    }
  } catch {
    dingtalkWebhook.value = ''
    dingtalkSecret.value = ''
    dingtalkKeyword.value = ''
    dingtalkBaseUrl.value = ''
  }
}

async function saveDingTalkConfig() {
  if (!dingtalkWebhook.value) {
    ElMessage.warning('请输入Webhook地址')
    return
  }
  savingDingtalk.value = true
  try {
    const notify: Record<string, { enabled: boolean; template: string }> = {}
    for (const [key, cfg] of Object.entries(notifyConfigs.value)) {
      notify[key] = { enabled: cfg.enabled, template: cfg.template }
    }
    await updateDingTalkConfig({
      webhook: dingtalkWebhook.value,
      secret: dingtalkSecret.value,
      keyword: dingtalkKeyword.value,
      baseUrl: dingtalkBaseUrl.value,
      notify
    })
    ElMessage.success('钉钉配置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingDingtalk.value = false
  }
}

async function testDingTalkGeneral() {
  testingDingtalk.value = true
  try {
    const res = await testDingTalkByType()
    if (res.data.success) {
      ElMessage.success('通用测试通知已发送，请检查钉钉')
    } else {
      ElMessage.error('发送失败：' + (res.data.error || '未知错误'))
    }
  } catch (err: any) {
    ElMessage.error('发送失败：' + (err?.response?.data?.error || '网络错误'))
  } finally {
    testingDingtalk.value = false
  }
}

async function testDingTalkByTypeHandler(type: string) {
  testLoadingByType.value[type] = true
  try {
    // 取当前编辑框里的模板内容，为空则发 undefined（后端用默认模板）
    const template = notifyConfigs.value[type]?.template || undefined
    const res = await testDingTalkByType(type, template)
    if (res.data.success) {
      ElMessage.success(`[${notifyConfigLabels[type as keyof typeof notifyConfigLabels]}] 测试通知已发送，请检查钉钉`)
    } else {
      ElMessage.error('发送失败：' + (res.data.error || '未知错误'))
    }
  } catch (err: any) {
    ElMessage.error('发送失败：' + (err?.response?.data?.error || '网络错误'))
  } finally {
    testLoadingByType.value[type] = false
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

async function loadGiteeBackupConfig() {
  try {
    const res = await getGiteeBackupConfig()
    if (res.data) {
      giteeConfig.value = {
        enabled: res.data.enabled || false,
        token: res.data.token || '',
        owner: res.data.owner || '',
        repo: res.data.repo || '',
        branch: res.data.branch || 'main',
      }
    }
  } catch {
    giteeConfig.value = { enabled: false, token: '', owner: '', repo: '', branch: 'main' }
  }
}

async function saveGiteeConfig() {
  if (!giteeConfig.value.token) {
    ElMessage.warning('请填写 Access Token')
    return
  }
  if (!giteeConfig.value.owner || !giteeConfig.value.repo) {
    ElMessage.warning('请填写仓库路径')
    return
  }
  savingGiteeConfig.value = true
  try {
    await updateGiteeBackupConfig(giteeConfig.value)
    ElMessage.success('Gitee 备份配置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingGiteeConfig.value = false
  }
}

async function testGiteeConfig() {
  if (!giteeConfig.value.token) {
    ElMessage.warning('请先填写 Access Token')
    return
  }
  if (!giteeConfig.value.owner || !giteeConfig.value.repo) {
    ElMessage.warning('请先填写仓库路径')
    return
  }
  testingGiteeConfig.value = true
  giteeTestResult.value = null
  try {
    const res = await testGiteeBackupConnection({
      token: giteeConfig.value.token,
      owner: giteeConfig.value.owner,
      repo: giteeConfig.value.repo,
      branch: giteeConfig.value.branch || 'main',
    })
    giteeTestResult.value = { success: res.data.success, message: res.data.message }
  } catch (err: any) {
    giteeTestResult.value = { success: false, message: '请求失败: ' + (err?.message || '网络错误') }
  } finally {
    testingGiteeConfig.value = false
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
    link.download = `newbee_export_raw_${Date.now()}.xlsx`
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
    link.download = `newbee_export_${Date.now()}.xlsx`
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
    const blob = new Blob([res.data], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    link.download = `newbee_backup_${timestamp}.db`
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
    await restoreDataApi(file)
    ElMessage.success('数据恢复成功，请刷新页面')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '恢复失败，请检查备份文件')
    }
  } finally {
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

async function cleanOrphanedFiles() {
  try {
    await ElMessageBox.confirm(
      '将扫描上传目录，删除不被任何任务、缺陷或操作日志引用的图片和视频文件。此操作不可撤销，确定要继续吗？',
      '清理孤儿文件',
      {
        confirmButtonText: '确定清理',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    cleaningOrphaned.value = true
    const res = await api.post('/upload/cleanup-orphaned')
    ElMessage.success(res.data.message || '清理完成')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '清理失败')
    }
  } finally {
    cleaningOrphaned.value = false
  }
}

async function loadBackupStatus() {
  try {
    const res = await getBackupStatusApi()
    if (res.data) {
      backupStatus.value = res.data
    }
  } catch {
    // ignore
  }
}

async function loadBackupList() {
  backupListLoading.value = true
  try {
    const res = await getBackupListApi()
    if (res.data) {
      backupFiles.value = res.data
    }
  } catch {
    backupFiles.value = []
  } finally {
    backupListLoading.value = false
  }
}

async function handleBackupNow() {
  backupNowLoading.value = true
  try {
    await backupNowApi()
    ElMessage.success('备份成功')
    await loadBackupList()
    await loadBackupStatus()
  } catch {
    ElMessage.error('备份失败')
  } finally {
    backupNowLoading.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function handleDownloadBackup(filename: string) {
  try {
    const res = await downloadBackupApi(filename)
    const blob = new Blob([res.data], { type: 'application/octet-stream' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败')
  }
}

async function handleDeleteBackup(filename: string) {
  try {
    await ElMessageBox.confirm(
      `确定要删除备份文件 "${filename}" 吗？`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await deleteBackupFileApi(filename)
    ElMessage.success('已删除')
    await loadBackupList()
    await loadBackupStatus()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadPermissions()
  loadCustomLinks()
  loadMarkdownFiles()
  loadDingTalkConfig()
  loadGiteeBackupConfig()
  loadBackupStatus()
  loadBackupList()
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

.permissions-container {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  padding: var(--nb-space-5);
  box-shadow: var(--nb-shadow-sm);
}

.permission-sections {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-8);
}

.permission-section {
  padding: var(--nb-space-2) 0;
}

.section-header {
  margin-bottom: var(--nb-space-4);
  display: flex;
  align-items: baseline;
  gap: var(--nb-space-4);
}

.section-header h3 {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0;
  padding-left: var(--nb-space-3);
  border-left: 3px solid var(--nb-primary);
  white-space: nowrap;
}

.section-tip {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.permission-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--nb-space-3);
  margin-top: var(--nb-space-5);
  padding-top: var(--nb-space-4);
  border-top: 1px solid var(--nb-border);
}

.export-section {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-4);
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
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
  margin-bottom: var(--nb-space-1);
}

.export-desc {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.backup-section {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-4);
}

.auto-backup-status {
  margin-bottom: var(--nb-space-2);
}

.backup-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-3);
}

.list-title {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  padding-left: var(--nb-space-3);
  border-left: 3px solid var(--nb-success);
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--nb-space-4);
  background: var(--nb-bg-hover);
  border-radius: var(--nb-radius-md);
}

.backup-item.danger {
  background: var(--nb-danger-light);
  border: 1px solid var(--nb-danger-light);
}

.backup-info {
  flex: 1;
}

.backup-title {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
  margin-bottom: var(--nb-space-1);
  font-weight: var(--nb-font-weight-medium);
}

.backup-desc {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.custom-links-container {
  display: flex;
  flex-direction: column;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-3);
  margin-bottom: var(--nb-space-5);
}

.link-item {
  padding: var(--nb-space-3);
  background: var(--nb-bg-hover);
  border-radius: var(--nb-radius-md);
}

.link-fields {
  display: flex;
  align-items: center;
  gap: var(--nb-space-3);
  flex-wrap: wrap;
}

.links-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--nb-space-3);
  padding-top: var(--nb-space-4);
  border-top: 1px solid var(--nb-border);
}

.markdown-upload-area,
.markdown-input-area {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.uploaded-file-name {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-success);
  white-space: nowrap;
}

.dingtalk-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--nb-space-3);
  margin-top: var(--nb-space-5);
  padding-top: var(--nb-space-4);
  border-top: 1px solid var(--nb-border);
}

.notify-config-list {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-4);
  margin-bottom: var(--nb-space-5);
}

.notify-config-item {
  padding: var(--nb-space-4);
  background: var(--nb-bg-hover);
  border-radius: var(--nb-radius-md);
}

.notify-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notify-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notify-type-label {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
}

.template-preview {
  margin-top: 12px;
}

.template-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.template-label {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-primary);
  font-weight: var(--nb-font-weight-medium);
}

.template-label-hint {
  font-size: var(--nb-font-size-xs);
  color: var(--nb-text-secondary);
}

.cloud-backup-section {
  margin-top: var(--nb-space-2);
  padding: var(--nb-space-4);
  background: var(--nb-warning-light);
  border-radius: var(--nb-radius-md);
  border: 1px solid var(--nb-warning-light);
}

.cloud-backup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-1);
}

.cloud-backup-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--nb-space-3);
}

.cloud-backup-result {
  margin-top: var(--nb-space-3);
  padding: var(--nb-space-2) var(--nb-space-3);
  border-radius: var(--nb-radius-sm);
  font-size: var(--nb-font-size-base);
}

.cloud-backup-result.success {
  background: var(--nb-success-light);
  color: var(--nb-success);
  border: 1px solid var(--nb-success-light);
}

.cloud-backup-result.error {
  background: var(--nb-danger-light);
  color: var(--nb-danger);
  border: 1px solid var(--nb-danger-light);
}

:deep(.el-tabs__content) {
  padding: 0;
}

:deep(.el-tabs--border-card) {
  border: none;
  box-shadow: none;
}

:deep(.el-alert__description p) {
  margin: var(--nb-space-1) 0;
  line-height: var(--nb-line-height-relaxed);
}
</style>
