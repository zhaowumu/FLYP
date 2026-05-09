<template>
  <div class="users-page">
    <div class="page-header">
      <div class="header-left">
        <h2>成员管理</h2>
        <p>管理系统成员信息</p>
      </div>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        添加成员
      </el-button>
    </div>

    <div class="content-card">
      <el-table :data="users" style="width: 100%">
        <el-table-column label="成员" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="row.avatar || undefined" class="user-avatar">
                {{ row.realName?.charAt(0) || 'U' }}
              </el-avatar>
              <div class="user-info">
                <div class="user-name">{{ row.realName }}</div>
                <div class="user-username">@{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="editUser(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="deleteUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑成员' : '添加成员'"
      width="480px"
      destroy-on-close
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="userForm.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="项目经理" value="project_manager" />
            <el-option label="程序" value="developer" />
            <el-option label="策划" value="designer" />
            <el-option label="美术" value="artist" />
            <el-option label="测试" value="tester" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUser" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, updateUser, deleteUser as deleteUserApi } from '../api/user'
import api from '../api'

const users = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const userFormRef = ref()
const currentUserId = ref<number | null>(null)
const submitting = ref(false)

const userForm = reactive({
  username: '',
  realName: '',
  phone: '',
  password: '',
  role: 'developer'
})

const userRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const getRoleType = (role: string) => {
  const map: Record<string, string> = {
    admin: 'danger',
    project_manager: 'warning',
    developer: 'primary',
    designer: 'success',
    artist: '',
    tester: 'info'
  }
  return map[role] || 'info'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    admin: '管理员',
    project_manager: '项目经理',
    developer: '程序',
    designer: '策划',
    artist: '美术',
    tester: '测试'
  }
  return map[role] || role
}

const loadUsers = async () => {
  try {
    const res = await getUsers()
    users.value = res.data
  } catch (error) {
    ElMessage.error('加载成员列表失败')
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  currentUserId.value = null
  Object.assign(userForm, {
    username: '',
    realName: '',
    phone: '',
    password: '',
    role: 'developer'
  })
  dialogVisible.value = true
}

const editUser = (user: any) => {
  isEdit.value = true
  currentUserId.value = user.id
  Object.assign(userForm, {
    username: user.username,
    realName: user.realName,
    phone: user.phone || '',
    password: '',
    role: user.role
  })
  dialogVisible.value = true
}

const deleteUser = async (user: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该成员吗？', '提示', {
      type: 'warning'
    })
    await deleteUserApi(user.id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const submitUser = async () => {
  if (!userFormRef.value) return
  
  await userFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value && currentUserId.value) {
          const updateData: any = {
            realName: userForm.realName,
            phone: userForm.phone,
            role: userForm.role
          }
          if (userForm.password) {
            updateData.password = userForm.password
          }
          await updateUser(currentUserId.value, updateData)
          ElMessage.success('更新成功')
        } else {
          if (!userForm.password) {
            ElMessage.error('请输入密码')
            submitting.value = false
            return
          }
          await api.post('/users/register', userForm)
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
        await loadUsers()
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
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

.user-cell {
  display: flex;
  align-items: center;
  gap: var(--nb-space-3);
}

.user-avatar {
  background: var(--nb-gradient-primary);
  color: white;
  font-weight: var(--nb-font-weight-medium);
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: var(--nb-font-size-md);
  color: var(--nb-text-primary);
  font-weight: var(--nb-font-weight-medium);
}

.user-username {
  font-size: var(--nb-font-size-sm);
  color: var(--nb-text-secondary);
}
</style>