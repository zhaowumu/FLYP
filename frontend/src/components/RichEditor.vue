<template>
  <div class="rich-editor-wrapper">
    <Toolbar
      :editor="editorRef"
      :default-config="toolbarConfig"
      :mode="mode"
      class="toolbar-wrapper"
    />
    <div class="extra-toolbar">
      <el-button size="small" @click="openVideoDialog">插入视频</el-button>
    </div>
    <Editor
      v-model="contentHtml"
      :default-config="editorConfig"
      :mode="mode"
      :style="editorStyle"
      class="editor-area"
      @on-created="handleCreated"
      @on-change="handleChange"
    />

    <el-dialog
      v-model="videoDialogVisible"
      title="插入视频"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="视频链接">
          <el-input v-model="videoForm.url" placeholder="请输入视频链接" />
        </el-form-item>
        <el-form-item label="宽度">
          <el-input-number v-model="videoForm.width" :min="200" :max="1920" :step="10" />
          <span class="unit-tip">px</span>
        </el-form-item>
        <el-form-item label="高度">
          <el-input-number v-model="videoForm.height" :min="150" :max="1080" :step="10" />
          <span class="unit-tip">px</span>
        </el-form-item>
        <el-form-item label="比例">
          <el-radio-group v-model="videoForm.ratio" @change="onRatioChange">
            <el-radio-button value="16:9">16:9</el-radio-button>
            <el-radio-button value="4:3">4:3</el-radio-button>
            <el-radio-button value="1:1">1:1</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="videoDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertVideoFromDialog">插入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, computed, onBeforeUnmount } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { ElMessage } from 'element-plus'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  height?: number
}>(), {
  placeholder: '请输入内容...',
  height: 300
})

const emit = defineEmits(['update:modelValue'])

const editorRef = shallowRef()
const mode = 'default'
const contentHtml = ref(props.modelValue || '')

const editorHeight = computed(() => `${props.height}px`)

const editorStyle = computed(() => {
  if (props.height === 0) {
    return { flex: '1', minHeight: '150px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
  }
  return { height: editorHeight.value, overflowY: 'hidden' }
})

const videoDialogVisible = ref(false)
const videoForm = ref({ url: '', width: 640, height: 360, ratio: '16:9' })

// 图片上传辅助函数
function uploadImage(file: File, insertFn: any) {
  const formData = new FormData()
  formData.append('file', file)
  fetch('/api/upload/image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData
  })
    .then(res => res.json())
    .then(res => {
      if (res.errno === 0) {
        insertFn(res.data[0].url, '', '')
        ElMessage.success('图片上传成功')
      } else {
        ElMessage.error('图片上传失败')
      }
    })
    .catch(() => {
      ElMessage.error('图片上传失败')
    })
}

const toolbarConfig = {
  toolbarKeys: [
    'undo', 'redo',
    'bold', 'italic', 'through', 'underline',
    'headerSelect', 'fontSize', 'fontFamily',
    'color', 'bgColor',
    'bulletedList', 'numberedList',
    'todo',
    'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyJustify',
    'indent', 'delIndent',
    'divider', 'lineHeight',
    'blockquote', 'code', 'codeBlock',
    'insertLink',
    'insertImage', 'uploadImage',
    'uploadVideo',
    'insertTable',
    'emotion',
    'fullScreen'
  ]
}

const editorConfig = {
  placeholder: props.placeholder,
  MENU_CONF: {
    uploadImage: {
      fieldName: 'file',
      maxFileSize: 10 * 1024 * 1024,
      maxNumberOfFiles: 10,
      customUpload(file: File, insertFn: any) {
        const COMPRESS_THRESHOLD = 500 * 1024 // 500KB 以下不压缩
        const MAX_WIDTH = 1920
        const QUALITY = 0.8

        // 小图直接上传
        if (file.size < COMPRESS_THRESHOLD) {
          uploadImage(file, insertFn)
          return
        }

        // GIF 不压缩（Canvas 无法保留动图）
        if (file.type === 'image/gif') {
          uploadImage(file, insertFn)
          return
        }

        // Canvas 压缩大图
        const img = new Image()
        img.onload = () => {
          let { width, height } = img
          // 宽度未超标也不压缩，直接上传原图
          if (width <= MAX_WIDTH) {
            URL.revokeObjectURL(img.src)
            uploadImage(file, insertFn)
            return
          }
          // 等比缩放
          const scale = MAX_WIDTH / width
          width = MAX_WIDTH
          height = Math.round(height * scale)

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, width, height)
          URL.revokeObjectURL(img.src)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                // 压缩后比原图还大，用原图
                const compressedFile = new File([blob], file.name, { type: blob.type })
                uploadImage(compressedFile.size < file.size ? compressedFile : file, insertFn)
              } else {
                uploadImage(file, insertFn)
              }
            },
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            QUALITY
          )
        }
        img.onerror = () => {
          URL.revokeObjectURL(img.src)
          uploadImage(file, insertFn)
        }
        img.src = URL.createObjectURL(file)
      }
    },
    uploadVideo: {
      fieldName: 'file',
      server: '/api/upload/video',
      maxFileSize: 100 * 1024 * 1024,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      customInsert(res: any, insertFn: any) {
        if (res.errno === 0) {
          const url = res.data[0].url
          insertFn(url, '', '640')
          ElMessage.success('视频上传成功')
        } else {
          ElMessage.error('视频上传失败')
        }
      },
      onError(file: File, err: any, res: any) {
        ElMessage.error('视频上传失败: ' + (err?.message || ''))
      }
    }
  }
}

watch(() => props.modelValue, (val) => {
  if (editorRef.value && val !== contentHtml.value) {
    contentHtml.value = val || ''
  }
})

function handleCreated(editor: any) {
  editorRef.value = editor
}

function handleChange(editor: any) {
  emit('update:modelValue', editor.getHtml())
}

function openVideoDialog() {
  videoForm.value = { url: '', width: 640, height: 360, ratio: '16:9' }
  videoDialogVisible.value = true
}

function onRatioChange(ratio: string) {
  const ratios: Record<string, number> = { '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1 }
  if (ratio === 'custom') return
  const r = ratios[ratio]
  if (r) {
    videoForm.value.height = Math.round(videoForm.value.width / r)
  }
}

function insertVideoFromDialog() {
  if (!videoForm.value.url) {
    ElMessage.warning('请输入视频链接')
    return
  }
  const editor = editorRef.value
  if (!editor) return

  const { url, width, height } = videoForm.value
  editor.focus(true)
  editor.insertNode({
    type: 'video',
    src: url,
    children: [{ text: '' }]
  })
  videoDialogVisible.value = false
  ElMessage.success('视频已插入')
}

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})

defineExpose({
  getHtml: () => editorRef.value?.getHtml() || '',
  getText: () => editorRef.value?.getText() || ''
})
</script>

<style scoped>
.rich-editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  min-height: 0;
}

.toolbar-wrapper {
  border-bottom: 1px solid #dcdfe6;
  flex-shrink: 0;
}

.extra-toolbar {
  padding: 6px 8px;
  border-bottom: 1px solid #dcdfe6;
  background: #fafafa;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.editor-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.unit-tip {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

:deep(.w-e-toolbar) {
  background: #f5f7fa !important;
}

:deep(.w-e-text-container) {
  background: #fff !important;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.w-e-scroll) {
  min-height: v-bind(editorHeight);
  flex: 1;
  min-height: 0;
  overflow-y: auto !important;
}

:deep(.w-e-text-container video) {
  max-width: 100% !important;
  border-radius: 4px;
  display: block;
}

:deep(.w-e-text-container .w-e-textarea-video-container) {
  overflow: hidden;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  display: inline-block;
  max-width: 100%;
}

:deep(.w-e-text-container .w-e-textarea-video-container video) {
  display: block;
}
</style>
