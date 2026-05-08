# 全局样式统一：Design Tokens 完成

## 已完成工作

将整个 FLYP 前端项目的 14 个 Vue 视图文件中的所有硬编码颜色值替换为 `var(--nb-*)` 设计令牌变量。

### 涉及文件

| 文件 | 主要改动 |
|------|---------|
| `style.css` | 完整设计令牌系统（120+ CSS 变量） |
| `App.vue` | 侧边栏/布局引用设计令牌 |
| `Dashboard.vue` | 全局样式 + SVG 环形图颜色 |
| `Tasks.vue` | page-header, content-card, table-toolbar, el-table, dialog |
| `Bugs.vue` | page-header, content-card, filter-tab, bug-title |
| `Projects.vue` | page-header, project-grid, project-card |
| `Users.vue` | page-header, content-card, user-cell, user-avatar |
| `Settings.vue` | permissions, export, backup, cloud-backup, dingtalk |
| `Login.vue` | 渐变背景 `--nb-gradient-login` |
| `BugDetail.vue` | content-card, edit-btn, activity, drawer |
| `TaskDetail.vue` | content-card, subtask, activity, sidebar, drawer |
| `ProjectDetail.vue` | page-header, stats, member-item |
| `MarkdownViewer.vue` | page-header, content-card |

### 设计令牌核心

- **主色**: `--nb-primary` (`#5b6def`)
- **背景**: `--nb-bg-page` (`#f1f5f9`), `--nb-bg-card` (`#ffffff`), `--nb-bg-muted`, `--nb-bg-hover`
- **文字**: `--nb-text-primary`, `--nb-text-regular`, `--nb-text-secondary`, `--nb-text-placeholder`
- **边框**: `--nb-border`, `--nb-border-light`, `--nb-border-dark`
- **语义色**: `--nb-success`, `--nb-warning`, `--nb-danger`, `--nb-info`
- **字体**: `--nb-font-size-*` (sm/md/lg/xl/2xl/3xl)
- **间距**: `--nb-space-*` (1-12)
- **圆角**: `--nb-radius-*` (sm/md/lg/xl)
- **阴影**: `--nb-shadow-*` (xs/sm/md/lg/xl)
- **渐变**: `--nb-gradient-*` (primary/success/warning/danger/info/login)
