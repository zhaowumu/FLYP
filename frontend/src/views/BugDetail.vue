<template>
  <div class="bug-detail-page">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
      </div>
    </div>

    <div class="detail-container" v-if="bug">
      <div class="main-content">
        <div class="content-card">
          <div class="bug-header">
            <div class="bug-title-area" v-if="!isEditingTitle">
              <h1><span class="id-badge">#{{ bug.id }}</span> {{ bug.title }}</h1>
              <el-button v-if="canEdit" text size="small" @click="startEditTitle" class="edit-btn">
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>
            <div v-else class="bug-title-edit">
              <el-input v-model="editTitle" size="large" placeholder="请输入缺陷标题" @keyup.enter="saveTitle" ref="titleInputRef" />
              <div class="edit-actions">
                <el-button size="small" @click="cancelEditTitle">取消</el-button>
                <el-button size="small" type="primary" @click="saveTitle" :loading="saving">保存</el-button>
              </div>
            </div>
            <div class="bug-tags">
              <el-tag :type="getSeverityType(bug.severity)" size="small">
                {{ getSeverityText(bug.severity) }}
              </el-tag>
              <el-tag :type="getStatusType(bug.status)" :style="getTagStyle(bug.status)" size="small">
                {{ getStatusText(bug.status) }}
              </el-tag>
            </div>
          </div>

          <el-divider />

          <div class="bug-section">
            <div class="section-header">
              <h3>缺陷描述</h3>
              <el-button v-if="canEdit" text size="small" @click="startEditDescription('description')" class="edit-btn">
                <el-icon><Edit /></el-icon>
                {{ bug.description ? '编辑' : '添加描述' }}
              </el-button>
            </div>
            <div v-if="!isEditingDescription" class="section-content" v-html="sanitizeHtml(bug.description) || '<span style=color:var(--nb-text-secondary)>暂无描述</span>'" @click="handleImageClick"></div>
            <div v-else class="section-editor">
              <RichEditor
                v-model="editDescription"
                placeholder="请输入缺陷描述... 支持粘贴图片 (Ctrl+V)"
                :height="300"
              />
              <div class="edit-actions">
                <el-button size="small" @click="cancelEditDescription">取消</el-button>
                <el-button size="small" type="primary" @click="saveDescription('description')" :loading="saving">保存</el-button>
              </div>
            </div>
          </div>

          <div class="bug-section">
            <div class="section-header">
              <h3>重现步骤</h3>
              <el-button v-if="canEdit" text size="small" @click="startEditDescription('reproduceSteps')" class="edit-btn">
                <el-icon><Edit /></el-icon>
                {{ bug.reproduceSteps ? '编辑' : '添加步骤' }}
              </el-button>
            </div>
            <div v-if="!isEditingReproduceSteps" class="section-content" v-html="sanitizeHtml(bug.reproduceSteps) || '<span style=color:var(--nb-text-secondary)>暂无重现步骤</span>'" @click="handleImageClick"></div>
            <div v-else class="section-editor">
              <RichEditor
                v-model="editReproduceSteps"
                placeholder="请输入重现步骤... 支持粘贴图片 (Ctrl+V)"
                :height="300"
              />
              <div class="edit-actions">
                <el-button size="small" @click="cancelEditReproduceSteps">取消</el-button>
                <el-button size="small" type="primary" @click="saveDescription('reproduceSteps')" :loading="saving">保存</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="content-card" style="margin-top: 20px; padding-bottom: 80px;">
          <div class="activity-header">
            <span class="activity-title">操作记录</span>
            <span class="activity-count">{{ operationLogs.length }} 条记录</span>
          </div>

          <div class="activity-list">
            <div class="activity-item" v-for="log in operationLogs" :key="log.id">
              <div class="activity-avatar">
                <el-avatar :size="32" :src="log.user?.avatar || undefined">{{ log.user?.realName?.charAt(0) || 'U' }}</el-avatar>
              </div>
              <div class="activity-content">
                <div class="activity-info">
                  <span class="activity-user">{{ log.user?.realName || '未知用户' }}</span>
                  <span class="activity-action">{{ formatLogAction(log) }}</span>
                  <span class="activity-time">{{ formatTime(log.createdAt) }}</span>
                </div>
                <div class="activity-remark" v-if="hasRemarkContent(log.remark)" @click="handleImageClick">
                  <div v-html="renderRemark(log.remark)"></div>
                </div>
              </div>
            </div>
            <el-empty v-if="operationLogs.length === 0" description="暂无操作记录" :image-size="60" />
          </div>
        </div>
      </div>

      <div class="side-content">
        <div class="content-card">
          <h3>基本信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="label">状态</span>
              <div class="info-value-row">
              <el-tag :type="getStatusType(bug.status)" :style="getTagStyle(bug.status)" size="small">
                {{ getStatusText(bug.status) }}
              </el-tag>
              <el-button
                  v-if="canChangeStatus"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('changeStatus')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">严重程度</span>
              <div class="info-value-row">
                <el-tag :type="getSeverityType(bug.severity)" size="small">
                  {{ getSeverityText(bug.severity) }}
                </el-tag>
                <el-button
                  v-if="canChangeSeverity"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('severity')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">当前负责人</span>
              <div class="info-value-row">
                <div class="assignee-display" v-if="bug.assignee">
                  <el-avatar :size="24" :src="bug.assignee.avatar || undefined">{{ bug.assignee.realName?.charAt(0) }}</el-avatar>
                  <span>{{ bug.assignee.realName }}</span>
                </div>
                <span v-else class="text-muted">未处理</span>
                <el-button
                  v-if="canManageSidebar"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('editAssignee')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">报告人</span>
              <div class="info-value-row">
                <div class="assignee-display">
                  <el-avatar :size="24" :src="bug.reporter?.avatar || undefined">{{ bug.reporter?.realName?.charAt(0) || '-' }}</el-avatar>
                  <span>{{ bug.reporter?.realName || '-' }}</span>
                </div>
                <el-button
                  v-if="canManageSidebar"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('editReporter')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">所属项目</span>
              <span class="value">{{ bug.project?.name || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">分类</span>
              <div class="info-value-row">
                <el-tag v-if="bug.category" type="info" size="small" effect="plain">{{ bug.category }}</el-tag>
                <span v-else class="text-muted value">未设置</span>
                <el-button
                  v-if="canManageSidebar"
                  text size="small"
                  class="inline-edit-btn"
                  @click="showActionPanel('editCategory')"
                >
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatTime(bug.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="label">更新时间</span>
              <span class="value">{{ formatTime(bug.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 悬浮操作栏 -->
    <div class="floating-action-bar">
      <!-- 分配按钮：报告人+admin+PM可见（非 fixed/verified/closed 状态） -->
      <el-button 
        v-if="canAssign"
        type="primary" 
        @click="showActionPanel('assign')"
      >
        <el-icon><User /></el-icon>
        分配
      </el-button>
      
      <!-- 修复完成按钮：负责人可见（in_progress 状态） -->
      <el-button 
        v-if="canFix"
        type="primary" 
        @click="showActionPanel('fix')"
      >
        <el-icon><Check /></el-icon>
        修复完成
      </el-button>
      
      <!-- 转交按钮：负责人可见 -->
      <el-button
        v-if="canTransfer"
        type="warning"
        @click="showActionPanel('transfer')"
      >
        <el-icon><Switch /></el-icon>
        转交
      </el-button>

      <!-- 反馈按钮：负责人可见（in_progress 状态），交还给报告人 -->
      <el-button
        v-if="canFeedback"
        type="info"
        @click="showActionPanel('feedback')"
      >
        <el-icon><Promotion /></el-icon>
        反馈
      </el-button>

      <!-- 验证通过按钮：报告人可见（fixed 状态） -->
      <el-button 
        v-if="canVerify"
        type="success" 
        @click="showActionPanel('verify')"
      >
        <el-icon><CircleCheck /></el-icon>
        验证通过
      </el-button>
      
      <!-- 打回按钮：报告人可见（fixed 状态） -->
      <el-button 
        v-if="canReject"
        type="warning" 
        @click="showActionPanel('reject')"
      >
        <el-icon><RefreshRight /></el-icon>
        打回
      </el-button>
      
      <!-- 关闭按钮：报告人可见（verified 状态） -->
      <el-button 
        v-if="canClose"
        type="info" 
        @click="showActionPanel('close')"
      >
        <el-icon><Close /></el-icon>
        关闭
      </el-button>
      
      <!-- 重启按钮：任何人可见（closed 状态） -->
      <el-button 
        v-if="canRestart"
        type="primary" 
        @click="showActionPanel('restart')"
      >
        <el-icon><Refresh /></el-icon>
        重启
      </el-button>
      
      <!-- 备注按钮：任何人都可以添加 -->
      <el-button 
        v-if="canComment"
        type="primary" 
        plain 
        @click="showActionPanel('comment')"
      >
        <el-icon><ChatDotRound /></el-icon>
        备注
      </el-button>
      
      <!-- 延期按钮：仅管理员和项目经理 -->
      <el-button 
        v-if="canExtend"
        type="warning" 
        plain 
        @click="showActionPanel('extend')"
      >
        <el-icon><Clock /></el-icon>
        延期
      </el-button>
      
      <!-- 删除按钮：仅项目经理和管理员可见 -->
      <el-button 
        v-if="canDelete"
        type="danger" 
        plain 
        @click="confirmDelete"
      >
        <el-icon><Delete /></el-icon>
        删除
      </el-button>
    </div>

    <!-- 操作面板弹窗 - 从右侧弹出 -->
    <el-drawer
      v-model="showPanel"
      :title="getActionTitle(currentAction)"
      direction="rtl"
      size="85%"
      :close-on-click-modal="true"
      @closed="onDrawerClosed"
    >
      <div class="drawer-content">
        <div class="drawer-body-scroll">
          <!-- 分配：选择负责人 -->
          <div class="form-section" v-if="currentAction === 'assign'">
            <el-alert 
              title="分配缺陷" 
              type="primary" 
              :closable="false"
              show-icon
            >
              <template #default>
                选择负责人后，缺陷状态将变为"处理中"
              </template>
            </el-alert>
            <div style="margin-top: var(--nb-space-4);">
              <span class="label">选择负责人</span>
              <el-select filterable
                v-model="assignUserId" 
                placeholder="请选择负责人" 
                style="width: 100%"
              >
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
            </div>
          </div>

          <!-- 转交：选择负责人 -->
          <div class="form-section" v-if="currentAction === 'transfer'">
            <span class="label">转交给</span>
            <el-select filterable
              v-model="transferUserId" 
              placeholder="请选择负责人" 
              style="width: 100%"
            >
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
          </div>

          <!-- 反馈：交还给报告人 -->
          <div class="form-section" v-if="currentAction === 'feedback'">
            <el-alert type="warning" :closable="false" show-icon>
              <template #title>
                反馈后，缺陷将交还给报告人「{{ bug?.reporter?.realName || '未知' }}」处理，状态不变
              </template>
            </el-alert>
          </div>

          <!-- 打回：重选负责人 → in_progress -->
          <div class="form-section" v-if="currentAction === 'reject'">
            <el-alert 
              title="确认打回缺陷" 
              type="warning" 
              :closable="false"
              show-icon
            >
              <template #default>
                缺陷将被重新打开处理，状态将变为"处理中"，请选择新的负责人
              </template>
            </el-alert>
            <div style="margin-top: var(--nb-space-4);">
              <span class="label">选择负责人（可选）</span>
              <el-select filterable
                v-model="rejectAssignUserId" 
                placeholder="请选择负责人" 
                clearable
                style="width: 100%"
              >
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
            </div>
          </div>

          <!-- 关闭：确认关闭 → closed（清空负责人） -->
          <div class="form-section" v-if="currentAction === 'close'">
            <el-alert 
              title="确认关闭缺陷" 
              type="info" 
              :closable="false"
              show-icon
            >
              <template #default>
                缺陷将被关闭，状态将变为"已关闭"，负责人将被清空
              </template>
            </el-alert>
          </div>

          <!-- 重启：重选负责人 → in_progress/pending -->
          <div class="form-section" v-if="currentAction === 'restart'">
            <el-alert 
              title="确认重启缺陷" 
              type="primary" 
              :closable="false"
              show-icon
            >
              <template #default>
                缺陷将重新激活，请指定新的负责人（若指定则状态为"处理中"，否则为"待处理"）
              </template>
            </el-alert>
            <div style="margin-top: var(--nb-space-4);">
              <span class="label">选择负责人（可选）</span>
              <el-select filterable
                v-model="restartAssignUserId" 
                placeholder="请选择负责人" 
                clearable
                style="width: 100%"
              >
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
            </div>
          </div>

          <!-- 更改严重程度 -->
          <div class="form-section" v-if="currentAction === 'severity'">
            <span class="label">新严重程度</span>
            <el-select 
              v-model="newSeverity" 
              placeholder="请选择严重程度" 
              style="width: 100%"
            >
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
              <el-option label="严重" value="critical" />
            </el-select>
          </div>

          <!-- 更改状态 -->
          <div class="form-section" v-if="currentAction === 'changeStatus'">
            <span class="label">新状态</span>
            <el-select 
              v-model="newStatus" 
              placeholder="请选择状态" 
              style="width: 100%"
            >
              <el-option label="待处理" value="pending" :disabled="bug?.status === 'pending'">
                <span class="status-dot" :style="{ backgroundColor: getStatusColor('pending') }"></span>待处理
              </el-option>
              <el-option label="处理中" value="in_progress" :disabled="bug?.status === 'in_progress'">
                <span class="status-dot" :style="{ backgroundColor: getStatusColor('in_progress') }"></span>处理中
              </el-option>
              <el-option label="已修复" value="fixed" :disabled="bug?.status === 'fixed'">
                <span class="status-dot" :style="{ backgroundColor: getStatusColor('fixed') }"></span>已修复
              </el-option>
              <el-option label="已验证" value="verified" :disabled="bug?.status === 'verified'">
                <span class="status-dot" :style="{ backgroundColor: getStatusColor('verified') }"></span>已验证
              </el-option>
              <el-option label="已关闭" value="closed" :disabled="bug?.status === 'closed'">
                <span class="status-dot" :style="{ backgroundColor: getStatusColor('closed') }"></span>已关闭
              </el-option>
            </el-select>
          </div>

          <!-- 延期 -->
          <div class="form-section" v-if="currentAction === 'extend'">
            <span class="label">当前截止日期</span>
            <div style="margin-bottom: var(--nb-space-3); color: var(--nb-text-secondary); font-size: var(--nb-font-size-base);">
              {{ bug?.dueDate ? new Date(bug.dueDate).toLocaleString() : '未设置' }}
            </div>
            <span class="label">新截止日期</span>
            <el-date-picker
              v-model="newDueDate"
              type="datetime"
              placeholder="选择新的截止日期"
              style="width: 100%"
              format="YYYY-MM-DD HH:mm"
            />
          </div>

          <!-- 编辑负责人 -->
          <div class="form-section" v-if="currentAction === 'editAssignee'">
            <span class="label">选择负责人</span>
            <el-select filterable
              v-model="editAssigneeId"
              placeholder="请选择负责人"
              clearable
              style="width: 100%"
            >
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
          </div>

          <!-- 编辑报告人 -->
          <div class="form-section" v-if="currentAction === 'editReporter'">
            <span class="label">选择报告人</span>
            <el-select filterable
              v-model="editReporterId"
              placeholder="请选择报告人"
              style="width: 100%"
            >
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
          </div>

          <!-- 编辑分类 -->
          <div class="form-section" v-if="currentAction === 'editCategory'">
            <span class="label">分类</span>
            <el-select
              v-model="editCategory"
              placeholder="请选择或输入分类"
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
          </div>

          <!-- 重新打开 -->
          <div class="form-section" v-if="currentAction === 'reopen'">
            <el-alert 
              title="确认重新打开缺陷" 
              type="warning" 
              :closable="false"
              show-icon
            >
              <template #default>
                缺陷将被重新打开，状态将变为"待处理"
              </template>
            </el-alert>
          </div>
          
          <!-- 备注编辑器 -->
          <div class="editor-section">
            <span class="label">备注（可选）</span>
            <div class="editor-wrapper">
              <RichEditor
                :key="editorKey"
                v-model="commentText"
                placeholder="输入备注内容... 支持粘贴图片 (Ctrl+V)"
                :height="0"
                :showToolbar="true"
              />
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <el-button @click="closeActionPanel">取消</el-button>
          <el-button type="primary" @click="executeAction" :loading="submitting">
            {{ getActionConfirmText(currentAction) }}
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- 图片预览 -->
    <el-image-viewer
      v-if="previewVisible"
      :url-list="previewUrlList"
      :initial-index="previewStartIndex"
      @close="closePreview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { getBug, updateBugStatus, addComment as addBugComment, updateBug, assignBug, extendDueDate as extendBugDueDate, rejectBug, restartBug, deleteBug, getBugCategories } from '../api/bug'
import { getUsers } from '../api/user'
import { useUserStore } from '../stores/user'
import RichEditor from '../components/RichEditor.vue'
import { sanitizeHtml } from '../utils/sanitize'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const bug = ref<any>(null)
const users = ref<any[]>([])
const commentText = ref('')
const editorKey = ref(0)
const submitting = ref(false)
const currentAction = ref<string | null>(null)
const showPanel = ref(false)
const assignUserId = ref<number | null>(null)
const transferUserId = ref<number | null>(null)
const rejectAssignUserId = ref<number | null>(null)
const restartAssignUserId = ref<number | null>(null)
const newSeverity = ref('')
const newStatus = ref('')
const isEditingTitle = ref(false)
const editTitle = ref('')
const isEditingDescription = ref(false)
const editDescription = ref('')
const isEditingReproduceSteps = ref(false)
const editReproduceSteps = ref('')
const saving = ref(false)
const titleInputRef = ref()
const newDueDate = ref<Date | null>(null)
const editAssigneeId = ref<number | null>(null)
const editReporterId = ref<number | null>(null)
const editCategory = ref('')
const categories = ref<string[]>([])

// 图片预览
const previewVisible = ref(false)
const previewUrlList = ref<string[]>([])
const previewStartIndex = ref(0)

const handleImageClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    const src = (target as HTMLImageElement).src
    if (src) {
      const container = target.closest('.section-content, .activity-remark, .description-content')
      const images = container ? Array.from(container.querySelectorAll('img')) : [target]
      previewUrlList.value = images.map(img => (img as HTMLImageElement).src)
      previewStartIndex.value = images.indexOf(target)
      previewVisible.value = true
    }
  }
}

const closePreview = () => {
  previewVisible.value = false
}

// 图片加载失败时显示占位提示
const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  if (img.tagName !== 'IMG') return
  const placeholder = document.createElement('div')
  placeholder.className = 'image-missing-placeholder'
  placeholder.innerHTML = '<span>图片已失效</span>'
  img.replaceWith(placeholder)
}

const operationLogs = computed(() => {
  return bug.value?.operationLogs || []
})

// 角色判断
const currentUserId = computed(() => userStore.user?.id)
const isReporter = computed(() => {
  return bug.value?.reporter?.id === currentUserId.value
})
const isAssignee = computed(() => bug.value?.assignee?.id === currentUserId.value)
const isParticipant = computed(() => isReporter.value || isAssignee.value)
const isProjectManager = computed(() => bug.value?.project?.managers?.some((m: any) => m.id === currentUserId.value))
const isAdmin = computed(() => userStore.user?.role === 'admin')
const canManageSidebar = computed(() => isAdmin.value || userStore.user?.role === 'project_manager')

// 可编辑权限：当前负责人、创建人、项目经理、管理员，或拥有删除权限的角色
const canEdit = computed(() => isAssignee.value || isReporter.value || isProjectManager.value || isAdmin.value || canDelete.value)

// 状态判断
const isClosed = computed(() => bug.value?.status === 'closed')
const isVerified = computed(() => bug.value?.status === 'verified')
const isFixed = computed(() => bug.value?.status === 'fixed')
const isInProgress = computed(() => bug.value?.status === 'in_progress')
const isActive = computed(() => !isClosed.value && !isVerified.value && !isFixed.value)

// 按钮权限配置（角色权限 + 关系权限）
const canAssign = computed(() => userStore.getBugPermission('assign', { isReporter: isReporter.value }) && (isReporter.value || isAdmin.value || isProjectManager.value) && isActive.value)
const canFix = computed(() => userStore.getBugPermission('fix', { isAssignee: isAssignee.value }) && isAssignee.value && isInProgress.value)
const canVerify = computed(() => userStore.getBugPermission('verify', { isReporter: isReporter.value }) && isReporter.value && isFixed.value)
const canReject = computed(() => userStore.getBugPermission('rejectBug', { isReporter: isReporter.value }) && isReporter.value && isFixed.value)
const canClose = computed(() => (isReporter.value || isAdmin.value || isProjectManager.value) && isVerified.value)
const canRestart = computed(() => userStore.getBugPermission('restartBug') && bug.value?.status === 'closed')
const canTransfer = computed(() => userStore.getBugPermission('transfer', { isAssignee: isAssignee.value }) && isAssignee.value && isActive.value)
const canFeedback = computed(() => userStore.getBugPermission('feedback', { isAssignee: isAssignee.value }) && isAssignee.value && isInProgress.value)
const canChangeSeverity = computed(() => isAdmin.value || userStore.user?.role === 'project_manager')
const canChangeStatus = computed(() => isAdmin.value || userStore.user?.role === 'project_manager')
const canComment = computed(() => userStore.getBugPermission('comment'))
const canDelete = computed(() => (isAdmin.value || userStore.user?.role === 'project_manager'))
const canExtend = computed(() => userStore.getBugPermission('extendDueDate') && !isClosed.value)

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

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: 'var(--el-color-primary)',
    in_progress: 'var(--el-color-warning)',
    fixed: '#eb2f96',
    verified: 'var(--el-color-success)',
    closed: 'var(--el-color-info)'
  }
  return map[status] || 'var(--el-color-info)'
}

const formatLogAction = (log: any) => {
  const { action, oldStatus, newStatus, oldSeverity, newSeverity, oldAssignee, newAssignee, oldDueDate, newDueDate } = log
  
  switch (action) {
    case 'create':
      return '提交了缺陷'
    case 'status_change': {
      let text = `将状态从「${getStatusText(oldStatus || 'pending')}」变更为「${getStatusText(newStatus)}」`
      if (oldAssignee && newAssignee) {
        text += `，负责人从「${oldAssignee}」变更为「${newAssignee}」`
      } else if (newAssignee) {
        text += `，负责人变更为「${newAssignee}」`
      }
      return text
    }
    case 'severity_change':
      return `将严重程度从「${getSeverityText(oldSeverity || 'medium')}」调整为「${getSeverityText(newSeverity)}」`
    case 'assign':
      return newAssignee
        ? `将负责人从「${oldAssignee || '未处理'}」变更为「${newAssignee}」`
        : `分配给 ${oldAssignee || '未知用户'}`
    case 'fix': {
      let text = '标记缺陷为已修复'
      if (oldAssignee && newAssignee && oldAssignee !== newAssignee) {
        text += `，负责人从「${oldAssignee}」变更为「${newAssignee}」`
      }
      return text
    }
    case 'verify':
      return '验证通过'
    case 'reject': {
      let text = '打回了缺陷'
      if (oldAssignee && newAssignee && oldAssignee !== newAssignee) {
        text += `，负责人从「${oldAssignee}」变更为「${newAssignee}」`
      }
      text += '，状态改为处理中'
      return text
    }
    case 'restart': {
      let text = '重启了缺陷'
      if (oldAssignee && newAssignee && oldAssignee !== newAssignee) {
        text += `，负责人从「${oldAssignee}」变更为「${newAssignee}」`
      }
      text += `，状态改为${getStatusText(newStatus || '')}`
      return text
    }
    case 'close': {
      let text = '关闭了缺陷'
      if (oldAssignee && oldAssignee !== '无') {
        text += `，清空了负责人「${oldAssignee}」`
      }
      return text
    }
    case 'comment':
      return '添加了备注'
    case 'description_change':
      return '更新了缺陷描述'
    case 'reproduce_steps_change':
      return '更新了复现步骤'
    case 'extend_due_date':
      return `将截止日期从「${formatTime(oldDueDate)}」延期至「${formatTime(newDueDate)}」`
    case 'feedback': {
      let text = '反馈了缺陷'
      if (oldAssignee && newAssignee) {
        text += `，负责人从「${oldAssignee}」交还给「${newAssignee}」`
      }
      return text
    }
    case 'transfer': {
      let text = '转交了缺陷'
      if (oldAssignee && newAssignee) {
        text += `，负责人从「${oldAssignee}」变更为「${newAssignee}」`
      }
      return text
    }
    default:
      return action
  }
}

const getActionTitle = (action: string) => {
  const map: Record<string, string> = {
    assign: '分配缺陷',
    fix: '标记为已修复',
    reject: '打回缺陷',
    close: '关闭缺陷',
    restart: '重启缺陷',
    transfer: '转交缺陷',
    feedback: '反馈缺陷',
    severity: '更改严重程度',
    changeStatus: '更改状态',
    comment: '添加备注',
    extend: '延期缺陷',
    editAssignee: '编辑负责人',
    editReporter: '编辑报告人',
    editCategory: '编辑分类',
  }
  return map[action] || action
}

const getActionConfirmText = (action: string) => {
  const map: Record<string, string> = {
    assign: '确认分配',
    fix: '确认已修复',
    reject: '确认打回',
    close: '确认关闭',
    restart: '确认重启',
    transfer: '确认转交',
    feedback: '确认反馈',
    severity: '确认修改',
    changeStatus: '确认修改',
    comment: '添加备注',
    extend: '确认延期',
    editAssignee: '确认修改',
    editReporter: '确认修改',
    editCategory: '确认修改',
  }
  return map[action] || '确认'
}

const formatTime = (time: string | Date) => {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

const renderRemark = (remark: string) => {
  if (!remark) return ''
  if (remark.includes('<') && remark.includes('>')) {
    return sanitizeHtml(remark)
  }
  return remark.replace(/\[图片\]/g, '<span style="color:var(--nb-primary)">[图片]</span>')
}

/** 检查备注是否有可见内容（过滤空 HTML 标签） */
function hasRemarkContent(remark: string): boolean {
  if (!remark) return false
  // 包含图片或视频标签 → 有可见内容
  if (remark.includes('<img') || remark.includes('<video')) return true
  // 去掉 HTML 标签后检查是否有非空白的文本
  const text = remark.replace(/<[^>]*>/g, '').trim()
  return text.length > 0
}

const goBack = () => {
  router.push('/bugs')
}

const loadBug = async () => {
  try {
    const id = parseInt(route.params.id as string)
    const res = await getBug(id)
    bug.value = res.data
  } catch (error) {
    ElMessage.error('加载缺陷详情失败')
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

const loadCategories = async () => {
  try {
    const res = await getBugCategories()
    categories.value = res.data
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

const startEditTitle = () => {
  editTitle.value = bug.value.title
  isEditingTitle.value = true
  nextTick(() => {
    titleInputRef.value?.focus()
  })
}

const cancelEditTitle = () => {
  isEditingTitle.value = false
  editTitle.value = ''
}

const saveTitle = async () => {
  if (!editTitle.value.trim()) {
    ElMessage.warning('标题不能为空')
    return
  }
  saving.value = true
  try {
    await updateBug(bug.value.id, { title: editTitle.value.trim() })
    bug.value.title = editTitle.value.trim()
    isEditingTitle.value = false
    ElMessage.success('标题已更新')
  } catch (error) {
    ElMessage.error('更新标题失败')
  } finally {
    saving.value = false
  }
}

const startEditDescription = (field: string) => {
  if (field === 'description') {
    editDescription.value = bug.value.description || ''
    isEditingDescription.value = true
  } else if (field === 'reproduceSteps') {
    editReproduceSteps.value = bug.value.reproduceSteps || ''
    isEditingReproduceSteps.value = true
  }
}

const cancelEditDescription = () => {
  isEditingDescription.value = false
  editDescription.value = ''
}

const cancelEditReproduceSteps = () => {
  isEditingReproduceSteps.value = false
  editReproduceSteps.value = ''
}

const saveDescription = async (field: string) => {
  saving.value = true
  try {
    const data: any = {}
    if (field === 'description') {
      data.description = editDescription.value
    } else if (field === 'reproduceSteps') {
      data.reproduceSteps = editReproduceSteps.value
    }
    await updateBug(bug.value.id, data)
    if (field === 'description') {
      bug.value.description = editDescription.value
      isEditingDescription.value = false
      await addBugComment(bug.value.id, { action: 'description_change' })
    } else if (field === 'reproduceSteps') {
      bug.value.reproduceSteps = editReproduceSteps.value
      isEditingReproduceSteps.value = false
      await addBugComment(bug.value.id, { action: 'reproduce_steps_change' })
    }
    await loadBug()
    ElMessage.success('内容已更新')
  } catch (error) {
    ElMessage.error('更新失败')
  } finally {
    saving.value = false
  }
}

const showActionPanel = (action: string) => {
  commentText.value = ''
  assignUserId.value = null
  transferUserId.value = null
  rejectAssignUserId.value = null
  restartAssignUserId.value = null
  newSeverity.value = bug.value?.severity || 'medium'
  newStatus.value = bug.value?.status || ''
  newDueDate.value = bug.value?.dueDate ? new Date(bug.value.dueDate) : null
  editAssigneeId.value = bug.value?.assignee?.id || null
  editReporterId.value = bug.value?.reporter?.id || null
  editCategory.value = bug.value?.category || ''
  currentAction.value = action
  showPanel.value = true
}

const closeActionPanel = () => {
  showPanel.value = false
  commentText.value = ''
  editorKey.value++
}

const onDrawerClosed = () => {
  currentAction.value = null
  commentText.value = ''
  assignUserId.value = null
  transferUserId.value = null
  rejectAssignUserId.value = null
  restartAssignUserId.value = null
  newSeverity.value = ''
  newStatus.value = ''
  newDueDate.value = null
}

const executeAction = async () => {
  if (currentAction.value === 'assign' && !assignUserId.value) {
    ElMessage.warning('请选择负责人')
    return
  }

  if (currentAction.value === 'transfer' && !transferUserId.value) {
    ElMessage.warning('请选择负责人')
    return
  }

  if (currentAction.value === 'severity' && newSeverity.value === bug.value.severity) {
    ElMessage.warning('请选择不同的严重程度')
    return
  }

  if (currentAction.value === 'extend') {
    if (!newDueDate.value) {
      ElMessage.warning('请选择新的截止日期')
      return
    }
    if (bug.value.dueDate && newDueDate.value.getTime() <= new Date(bug.value.dueDate).getTime()) {
      ElMessage.warning('新截止日期必须晚于当前截止日期')
      return
    }
  }

  submitting.value = true
  try {
    switch (currentAction.value) {
      case 'assign': {
        if (!assignUserId.value) {
          ElMessage.warning('请选择负责人')
          submitting.value = false
          return
        }
        await assignBug(bug.value.id, assignUserId.value)
        ElMessage.success('分配成功')
        break
      }

      case 'fix': {
        await updateBugStatus(bug.value.id, 'fixed', {
          action: 'fix',
          remark: commentText.value || ''
        })
        ElMessage.success('已标记为修复')
        break
      }

      case 'verify': {
        await updateBugStatus(bug.value.id, 'verified', {
          action: 'verify',
          remark: commentText.value || ''
        })
        ElMessage.success('验证通过')
        break
      }

      case 'reject': {
        await rejectBug(bug.value.id, {
          assigneeId: rejectAssignUserId.value,
          remark: commentText.value || ''
        })
        ElMessage.success('缺陷已打回')
        break
      }

      case 'close': {
        await updateBugStatus(bug.value.id, 'closed', {
          action: 'close',
          remark: commentText.value || ''
        })
        ElMessage.success('缺陷已关闭')
        break
      }

      case 'restart': {
        await restartBug(bug.value.id, {
          assigneeId: restartAssignUserId.value,
          remark: commentText.value || ''
        })
        ElMessage.success('缺陷已重启')
        break
      }

      case 'transfer': {
        await addBugComment(bug.value.id, {
          action: 'assign',
          newAssigneeId: transferUserId.value,
          remark: commentText.value || ''
        })
        ElMessage.success('转交成功')
        break
      }

      case 'feedback': {
        await addBugComment(bug.value.id, {
          action: 'feedback',
          newAssigneeId: bug.value.reporter.id,
          remark: commentText.value || ''
        })
        ElMessage.success('反馈成功，已交还给报告人')
        break
      }

      case 'severity': {
        await addBugComment(bug.value.id, {
          action: 'severity_change',
          newSeverity: newSeverity.value,
          remark: commentText.value || ''
        })
        ElMessage.success('严重程度已更新')
        break
      }

      case 'changeStatus': {
        if (!newStatus.value) {
          ElMessage.warning('请选择状态')
          submitting.value = false
          return
        }
        await updateBugStatus(bug.value.id, newStatus.value, {
          action: 'status_change',
          remark: commentText.value || ''
        })
        ElMessage.success('状态已更新')
        break
      }

      case 'comment': {
        const hasContent = commentText.value.replace(/<[^>]*>/g, '').trim() || commentText.value.includes('<img') || commentText.value.includes('<video')
        if (!hasContent) {
          ElMessage.warning('请输入备注内容')
          submitting.value = false
          return
        }
        await addBugComment(bug.value.id, {
          action: 'comment',
          remark: commentText.value
        })
        ElMessage.success('备注添加成功')
        break
      }

      case 'extend': {
        const oldDueDate = bug.value.dueDate
        await extendBugDueDate(bug.value.id, {
          newDueDate: newDueDate.value.toISOString(),
          remark: commentText.value || ''
        })
        ElMessage.success(`截止日期已从 ${formatTime(oldDueDate)} 延期至 ${formatTime(newDueDate.value)}`)
        break
      }

      case 'editAssignee': {
        await updateBug(bug.value.id, {
          assigneeId: editAssigneeId.value,
          log: { remark: commentText.value || '' }
        })
        ElMessage.success('负责人已更新')
        break
      }

      case 'editReporter': {
        if (!editReporterId.value) {
          ElMessage.warning('请选择报告人')
          submitting.value = false
          return
        }
        await updateBug(bug.value.id, {
          reporterId: editReporterId.value,
          log: { remark: commentText.value || '' }
        })
        ElMessage.success('报告人已更新')
        break
      }

      case 'editCategory': {
        await updateBug(bug.value.id, { category: editCategory.value || null })
        ElMessage.success('分类已更新')
        break
      }
    }

    closeActionPanel()
    await loadBug()
  } catch (error) {
    console.error('Action error:', error)
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

const confirmDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个缺陷吗？此操作不可恢复。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteBug(bug.value.id)
    ElMessage.success('缺陷已删除')
    router.push('/bugs')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete bug error:', error)
      ElMessage.error('删除缺陷失败')
    }
  }
}

onMounted(() => {
  loadBug()
  loadUsers()
  loadCategories()
  // 捕获阶段监听图片加载失败（v-html 渲染的 img 无法直接绑定 onerror）
  window.addEventListener('error', handleImageError, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('error', handleImageError, true)
})
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
.bug-detail-page {
  padding: 0;
}

.page-header {
  margin-bottom: var(--nb-space-5);
}

.detail-container {
  display: flex;
  gap: var(--nb-space-5);
}

.main-content {
  flex: 1;
  min-width: 0;
}

.side-content {
  width: 300px;
  flex-shrink: 0;
}

.content-card {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  padding: var(--nb-space-6);
  box-shadow: var(--nb-shadow-sm);
}

.bug-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.bug-title-area {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  flex: 1;
}

.bug-header h1 {
  font-size: var(--nb-font-size-3xl);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0;
  flex: 1;
  display: flex;
  align-items: center;
}

.id-badge {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-secondary);
  font-weight: var(--nb-font-weight-medium);
  background: var(--nb-bg-muted);
  padding: 2px 8px;
  border-radius: var(--nb-radius-sm);
  margin-right: 8px;
  flex-shrink: 0;
}

.bug-title-edit {
  flex: 1;
}

.bug-title-edit .el-input {
  margin-bottom: var(--nb-space-2);
}

.bug-title-edit .edit-actions {
  display: flex;
  gap: var(--nb-space-2);
  justify-content: flex-end;
  margin-top: var(--nb-space-2);
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-3);
}

.section-editor {
  margin-top: var(--nb-space-3);
}

.section-editor .edit-actions {
  display: flex;
  gap: var(--nb-space-2);
  justify-content: flex-end;
  margin-top: var(--nb-space-3);
}

.bug-tags {
  display: flex;
  gap: var(--nb-space-2);
}

.bug-section {
  margin-bottom: var(--nb-space-5);
}

.bug-section h3 {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-secondary);
  margin: 0 0 var(--nb-space-3) 0;
}

.section-content {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-regular);
  line-height: var(--nb-line-height-relaxed);
}

.section-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  cursor: pointer;
  transition: opacity var(--nb-transition-fast);
}

.section-content :deep(img:hover) {
  opacity: 0.85;
}

:deep(.image-missing-placeholder) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 80px;
  margin: var(--nb-space-2) 0;
  border: 1px dashed var(--nb-border-color);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-bg-page);
  color: var(--nb-text-secondary);
  font-size: 12px;
}

.section-content :deep(video) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  margin: var(--nb-space-2) 0;
  display: block;
  background: #000;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--nb-space-4);
}

.activity-title {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-regular);
}

.activity-count {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-4);
}

.activity-item {
  display: flex;
  gap: var(--nb-space-3);
}

.activity-avatar {
  flex-shrink: 0;
}

.activity-avatar :deep(.el-avatar) {
  background: var(--nb-gradient-danger);
  color: white;
  font-weight: var(--nb-font-weight-medium);
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-info {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  margin-bottom: var(--nb-space-2);
}

.activity-user {
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
  font-size: var(--nb-font-size-base);
}

.activity-action {
  color: var(--nb-text-regular);
  font-size: var(--nb-font-size-base);
}

.activity-time {
  color: var(--nb-text-secondary);
  font-size: var(--nb-font-size-sm);
  margin-left: auto;
}

.activity-remark {
  background: var(--nb-bg-hover);
  border-radius: var(--nb-radius-md);
  padding: var(--nb-space-3) var(--nb-space-3);
  font-size: var(--nb-font-size-base);
  color: var(--nb-text-regular);
  line-height: var(--nb-line-height-relaxed);
  word-break: break-word;
}

.activity-remark :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  margin: var(--nb-space-2) 0;
  cursor: pointer;
  transition: opacity var(--nb-transition-fast);
}

.activity-remark :deep(img:hover) {
  opacity: 0.85;
}

.activity-remark :deep(video) {
  max-width: 100%;
  height: auto;
  border-radius: var(--nb-radius-sm);
  margin: var(--nb-space-2) 0;
  display: block;
  background: #000;
}

.activity-remark :deep(p) {
  margin: var(--nb-space-1) 0;
}

/* 功能按钮栏 */
.action-bar {
  display: flex;
  gap: var(--nb-space-3);
  margin-top: var(--nb-space-4);
  flex-wrap: wrap;
}

/* 悬浮操作栏 */
.floating-action-bar {
  position: fixed;
  bottom: var(--nb-space-6);
  left: 50%;
  transform: translateX(-50%);
  background: var(--nb-bg-card);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: var(--nb-z-sticky);
  padding: var(--nb-space-3) var(--nb-space-5);
  border-radius: var(--nb-radius-lg);
  display: inline-flex;
  gap: var(--nb-space-3);
  flex-wrap: wrap;
  justify-content: center;
  max-width: calc(100% - 48px);
}

/* Drawer 样式 */
:deep(.el-drawer__body) {
  padding: 0;
  height: calc(100% - 56px);
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-body-scroll {
  flex: 1;
  overflow: hidden;
  padding: var(--nb-space-5);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.drawer-body-scroll .label {
  display: block;
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-medium);
  color: var(--nb-text-primary);
  margin-bottom: var(--nb-space-3);
}

.drawer-body-scroll .form-section {
  margin-bottom: var(--nb-space-5);
  flex-shrink: 0;
}

.drawer-body-scroll .editor-section {
  margin-top: var(--nb-space-3);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.editor-wrapper {
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-md);
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--nb-space-3);
  padding: var(--nb-space-4) var(--nb-space-5);
  border-top: 1px solid var(--nb-border);
  background: var(--nb-bg-muted);
  flex-shrink: 0;
}

/* 侧边栏样式 */
.side-content h3 {
  font-size: var(--nb-font-size-md);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin: 0 0 var(--nb-space-4) 0;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-2);
}

.info-item .label {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
  font-weight: var(--nb-font-weight-medium);
}

.info-item .value {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
}

.info-value-row {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
}

.inline-edit-btn {
  color: var(--nb-text-placeholder);
  padding: 2px;
  border-radius: var(--nb-radius-sm);
  transition: all var(--nb-transition-fast);
}

.inline-edit-btn:hover {
  color: var(--nb-primary);
  background: var(--nb-primary-lighter);
}

.assignee-display {
  display: flex;
  align-items: center;
  gap: var(--nb-space-2);
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
}

.text-muted {
  color: var(--nb-text-secondary);
  font-size: var(--nb-font-size-md);
}
</style>
