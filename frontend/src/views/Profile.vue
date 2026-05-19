<template>
  <div class="profile-page">
    <div class="page-header">
      <div class="header-left">
        <h2>个人设置</h2>
        <p>修改头像和密码</p>
      </div>
    </div>

    <div class="profile-layout">
      <!-- 左侧：头像 + 用户摘要 -->
      <div class="profile-sidebar">
        <div class="content-card avatar-card">
          <div class="avatar-wrap" @click="triggerAvatarUpload">
            <el-avatar :size="120" class="profile-avatar" v-if="!avatarPreview">
              {{ userStore.user?.realName?.charAt(0) || 'U' }}
            </el-avatar>
            <el-avatar :size="120" class="profile-avatar" v-else :src="avatarPreview" />
            <div class="avatar-overlay">
              <el-icon><Camera /></el-icon>
              <span>更换头像</span>
            </div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style="display: none"
            @change="handleFileChange"
          />
          <div class="avatar-summary">
            <div class="summary-name">{{ userStore.user?.realName || '用户' }}</div>
            <div class="summary-role">{{ roleText }}</div>
          </div>
          <p class="avatar-tip">支持 JPG / PNG / GIF / WebP<br/>最大 5MB</p>
        </div>
      </div>

      <!-- 右侧：表单区域 -->
      <div class="profile-main">
        <!-- 基本信息（只读展示） -->
        <div class="content-card">
          <div class="section-title">基本信息</div>
          <el-form label-width="100px" class="profile-form">
            <el-form-item label="用户名">
              <el-input :model-value="username" disabled class="disabled-input" />
              <span class="form-tip">用户名不可修改</span>
            </el-form-item>
            <el-form-item label="姓名">
              <el-input :model-value="userStore.user?.realName || ''" disabled class="disabled-input" />
              <span class="form-tip">仅管理员可修改</span>
            </el-form-item>
            <el-form-item label="手机号">
              <el-input :model-value="userStore.user?.phone || ''" disabled class="disabled-input" />
              <span class="form-tip">仅管理员可修改</span>
            </el-form-item>
          </el-form>
        </div>

        <!-- 修改密码 -->
        <div class="content-card">
          <div class="section-title">修改密码</div>
          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="100px"
            class="profile-form"
          >
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="请输入当前密码"
                show-password
              />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="请输入新密码（至少6位）"
                show-password
              />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                show-password
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="changeUserPassword" :loading="changingPassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { changePassword as changePasswordApi, uploadAvatar as uploadAvatarApi } from '../api/user'

const userStore = useUserStore()
const fileInputRef = ref<HTMLInputElement>()
const passwordFormRef = ref()
const changingPassword = ref(false)

const username = computed(() => userStore.user?.username || '')

const roleText = computed(() => {
  const map: Record<string, string> = {
    admin: '管理员',
    project_manager: '项目经理',
    developer: '程序',
    designer: '策划',
    artist: '美术',
    model: '模型',
    vfx: '特效',
    animation: '动画',
    concept_art: '原画',
    ui: 'UI',
    level_design: '地编',
    sound: '音效',
    tech_art: '技美',
    tester: '测试',
    operations: '运营',
  }
  return map[userStore.user?.role || ''] || userStore.user?.role || ''
})

// 头像预览
const avatarPreview = ref<string | null>(userStore.user?.avatar || null)

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// 触发文件选择
function triggerAvatarUpload() {
  fileInputRef.value?.click()
}

// 选择文件后预览
async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 文件大小验证
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }

  // 本地预览
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // 上传到服务器
  try {
    const res = await uploadAvatarApi(file)
    const avatarUrl = res.data.url

    // 更新用户资料中的头像
    await userStore.updateProfileAction({ avatar: avatarUrl })
    ElMessage.success('头像已更新')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.error || '头像上传失败')
    // 恢复预览
    avatarPreview.value = userStore.user?.avatar || null
  }

  // 清空 input 以便重新选择同一文件
  target.value = ''
}

// 修改密码
async function changeUserPassword() {
  if (!passwordFormRef.value) return
  await passwordFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    changingPassword.value = true
    try {
      await changePasswordApi({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      ElMessage.success('密码修改成功')
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } catch (err: any) {
      ElMessage.error(err?.response?.data?.error || '密码修改失败')
    } finally {
      changingPassword.value = false
    }
  })
}

onMounted(() => {
  avatarPreview.value = userStore.user?.avatar || null
})
</script>

<style scoped>
.profile-page {
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

/* ============ 左右布局 ============ */
.profile-layout {
  display: flex;
  gap: var(--nb-space-5);
  align-items: flex-start;
}

.profile-sidebar {
  width: 280px;
  flex-shrink: 0;
}

.profile-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-5);
}

/* ============ 卡片通用 ============ */
.content-card {
  background: var(--nb-bg-card);
  border-radius: var(--nb-radius-lg);
  padding: var(--nb-space-6);
  box-shadow: var(--nb-shadow-sm);
}

.section-title {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin-bottom: var(--nb-space-5);
  padding-bottom: var(--nb-space-3);
  border-bottom: 1px solid var(--nb-border-light);
}

/* ============ 左侧头像卡片 ============ */
.avatar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: var(--nb-space-8);
  padding-bottom: var(--nb-space-8);
}

.avatar-wrap {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: var(--nb-space-4);
}

.avatar-wrap:hover .avatar-overlay {
  opacity: 1;
}

.profile-avatar {
  display: block;
  background: var(--nb-gradient-primary);
  color: white;
  font-weight: var(--nb-font-weight-semibold);
  font-size: 44px;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--nb-font-size-sm);
  gap: 4px;
  opacity: 0;
  transition: opacity var(--nb-transition-fast);
  border-radius: 50%;
}

.avatar-overlay .el-icon {
  font-size: 26px;
}

.avatar-summary {
  margin-bottom: var(--nb-space-3);
}

.summary-name {
  font-size: var(--nb-font-size-lg);
  font-weight: var(--nb-font-weight-semibold);
  color: var(--nb-text-primary);
  margin-bottom: var(--nb-space-1);
}

.summary-role {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

.avatar-tip {
  font-size: var(--nb-font-size-xs);
  color: var(--nb-text-tertiary);
  margin: 0;
  line-height: 1.6;
}

/* ============ 表单 ============ */
.profile-form {
  max-width: 520px;
}

.disabled-input :deep(.el-input__wrapper) {
  background: var(--nb-bg-muted);
}

.form-tip {
  margin-left: var(--nb-space-3);
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}

/* ============ 响应式 ============ */
@media (max-width: 900px) {
  .profile-layout {
    flex-direction: column;
  }
  .profile-sidebar {
    width: 100%;
  }
  .avatar-card {
    flex-direction: row;
    gap: var(--nb-space-6);
    padding: var(--nb-space-5);
    text-align: left;
  }
  .avatar-summary {
    margin-bottom: 0;
  }
}
</style>
