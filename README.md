# FLYP - 游戏开发项目管理系统

面向游戏开发团队的一体化项目管理系统，支持任务追踪、Bug 管理、文档协作与数据备份，采用前后端分离架构。

## 技术栈

### 后端
- Node.js 18+ + Express 5 + TypeScript
- SQLite（`better-sqlite3`）+ TypeORM（零配置，开箱即用）
- JWT 认证 + bcryptjs 密码加密
- `node-cron` 定时任务（自动数据库备份）
- 钉钉机器人集成（`dingtalk-robot`）
- Gitee API 云端备份集成
- Excel 数据导入导出（`xlsx`）
- `multer` 文件上传

### 前端
- Vue 3 + TypeScript + Vite
- Element Plus UI 组件库 + `@element-plus/icons-vue`
- Pinia 状态管理
- Vue Router 4 路由管理
- Axios HTTP 客户端
- wangEditor 富文本编辑器
- `marked` Markdown 渲染

## 功能模块

### 1. 用户管理
- 用户注册、登录（JWT 认证）
- 6 种角色权限管理：`admin`、`project_manager`、`developer`、`artist`、`designer`、`tester`
- 用户信息管理（姓名、手机号、状态）
- 首次启动自动创建默认管理员：`admin / 123456`

### 2. 项目管理
- 项目创建、编辑、归档
- 项目经理指定
- 仅管理员和项目经理可访问

### 3. 任务管理
- 任务创建、编辑、删除
- 任务状态流转（pending → in_progress → completed → closed）
- 优先级设置（low / medium / high）
- 子任务（父子任务关联）
- 分类标签
- 截止日期
- 操作日志记录

### 4. Bug 管理
- Bug 提交、编辑、删除
- Bug 状态流转（pending → assigned → in_progress → fixed → verified → closed）
- 严重程度分级（low / medium / high / critical）
- 复现步骤记录
- 分类标签与截止日期

### 5. 数据库备份与恢复
- 每日凌晨 3 点自动备份，最多保留 30 份
- 手动立即备份
- 备份文件列表查看、下载、删除
- 数据库恢复（上传 `.db` 文件还原）
- 清空数据库（保留用户 / 全量清空）

### 6. Gitee 云端备份
- 可选配置 Gitee 仓库进行云端备份
- 每次自动备份后异步上传到 Gitee
- 支持连接测试

### 7. 钉钉集成
- Webhook 通知配置
- 任务/Bug 状态变更推送
- 每日/每周报告推送
- 支持连接测试

### 8. 文档管理（Markdown）
- 上传并浏览 Markdown 文档
- 在线渲染查看

### 9. 共享文件夹
- 服务器端文件夹浏览
- 文件下载

### 10. 全局搜索
- 跨任务、Bug、项目的全局关键词搜索

### 11. Excel 数据导入导出
- 导出任务 / Bug 数据到 Excel
- 从 Excel 批量导入任务 / Bug
- 提供导入模板下载

### 12. 自定义快捷链接
- 在设置页配置常用外部链接
- 快速跳转到团队工具

### 13. 系统设置
- 钉钉 Webhook 配置
- Gitee 云备份配置
- 权限管理

## 安装和运行

### 环境要求
- Node.js 18+
- npm 9+

> **无需安装数据库**——项目使用内嵌 SQLite，首次启动自动创建数据库文件。

### 1. 克隆项目
```bash
git clone <repository-url>
cd FLYP
```

### 2. 安装依赖

**方式一：使用脚本（Windows，推荐）**
```
双击运行 install.bat
```

**方式二：手动安装**
```bash
# 后端
cd backend && npm install

# 前端
cd ../frontend && npm install
```

### 3. 配置环境变量（可选）
编辑 `backend/.env` 文件（如不存在则使用默认值）：

```env
# 服务器端口（默认 3000）
PORT=3000

# JWT 密钥（生产环境请修改）
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 钉钉 Webhook（可选）
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=your_token

# CORS 来源（默认 http://localhost:5173）
CORS_ORIGIN=http://localhost:5173
```

### 4. 启动项目

**方式一：菜单式启动（Windows，推荐）**
```
双击运行 menu.bat
选择 2 → 启动服务
```

**方式二：脚本直接启动**
```
双击运行 start.bat
```

**方式三：手动启动**
```bash
# 终端 1 - 启动后端
cd backend && npm run dev

# 终端 2 - 启动前端
cd frontend && npm run dev
```

### 5. 访问系统
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000
- 默认账号：`admin` / `123456`

## 项目结构

```
FLYP/
├── backend/                   # 后端项目
│   ├── src/
│   │   ├── config/            # 配置（数据库、服务器参数）
│   │   ├── controllers/       # 控制器
│   │   ├── entities/          # TypeORM 实体
│   │   │   ├── User.ts
│   │   │   ├── Project.ts
│   │   │   ├── Task.ts
│   │   │   ├── Bug.ts
│   │   │   ├── SystemConfig.ts
│   │   │   └── OperationLog.ts
│   │   ├── middleware/        # 中间件（认证、权限）
│   │   ├── routes/            # 路由
│   │   ├── services/          # 服务层（备份、Gitee 等）
│   │   ├── app.ts             # Express 应用配置
│   │   └── server.ts          # 服务器入口
│   ├── data/                  # SQLite 数据库文件（自动生成）
│   │   ├── newbee.db
│   │   └── backups/           # 自动备份目录
│   ├── uploads/               # 上传文件目录（自动生成）
│   ├── .env                   # 环境变量
│   └── package.json
├── frontend/                  # 前端项目
│   ├── src/
│   │   ├── api/               # API 接口封装
│   │   ├── components/        # 公共组件
│   │   ├── router/            # 路由配置
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── views/             # 页面视图
│   │   │   ├── Dashboard.vue
│   │   │   ├── Projects.vue / ProjectDetail.vue
│   │   │   ├── Tasks.vue / TaskDetail.vue
│   │   │   ├── Bugs.vue / BugDetail.vue
│   │   │   ├── Users.vue
│   │   │   ├── Settings.vue
│   │   │   ├── MarkdownViewer.vue
│   │   │   └── Login.vue
│   │   ├── App.vue
│   │   └── main.ts
│   └── package.json
├── menu.bat                   # 菜单式管理脚本（Windows）
├── start.bat                  # 一键启动脚本
├── stop.bat                   # 一键停止脚本
├── restart.bat                # 一键重启脚本
├── install.bat                # 一键安装依赖
└── README.md
```

## API 接口概览

所有接口（除登录/注册外）需携带 `Authorization: Bearer <token>` 请求头。

### 用户
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/users/login` | 用户登录 |
| POST | `/api/users/register` | 用户注册 |
| GET | `/api/users` | 获取所有用户 |
| GET | `/api/users/:id` | 获取用户详情 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

### 项目
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取所有项目 |
| POST | `/api/projects` | 创建项目 |
| GET | `/api/projects/:id` | 项目详情 |
| PUT | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |
| PATCH | `/api/projects/:id/archive` | 归档项目 |

### 任务
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取任务列表 |
| POST | `/api/tasks` | 创建任务 |
| GET | `/api/tasks/:id` | 任务详情 |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| PATCH | `/api/tasks/:id/status` | 更新任务状态 |

### Bug
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bugs` | 获取 Bug 列表 |
| POST | `/api/bugs` | 提交 Bug |
| GET | `/api/bugs/:id` | Bug 详情 |
| PUT | `/api/bugs/:id` | 更新 Bug |
| DELETE | `/api/bugs/:id` | 删除 Bug |
| PATCH | `/api/bugs/:id/status` | 更新 Bug 状态 |
| PATCH | `/api/bugs/:id/assign` | 分配 Bug |

### 备份管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/backup/status` | 备份状态 |
| GET | `/api/backup/list` | 备份文件列表 |
| GET | `/api/backup/export` | 下载当前数据库 |
| GET | `/api/backup/download/:filename` | 下载指定备份 |
| POST | `/api/backup/import` | 上传恢复数据库 |
| POST | `/api/backup/backup-now` | 立即备份 |
| DELETE | `/api/backup/file/:filename` | 删除备份文件 |
| DELETE | `/api/backup/clear` | 清空数据（保留用户） |
| DELETE | `/api/backup/clear-all` | 清空全部数据 |

### 其他接口
| 路径前缀 | 说明 |
|----------|------|
| `/api/excel` | Excel 导入导出与模板下载 |
| `/api/upload` | 文件上传 |
| `/api/permissions` | 权限管理 |
| `/api/custom-links` | 自定义快捷链接 |
| `/api/shared-folder` | 共享文件夹浏览与下载 |
| `/api/markdown` | Markdown 文档管理 |
| `/api/search` | 全局搜索 |
| `/api/system-config` | 系统配置（钉钉/Gitee） |
| `GET /health` | 健康检查 |

## 权限说明

| 角色 | 说明 |
|------|------|
| `admin` | 管理员，拥有所有权限 |
| `project_manager` | 项目经理，可管理项目 |
| `developer` | 开发人员 |
| `artist` | 美术 |
| `designer` | 策划 |
| `tester` | 测试人员 |

路由守卫规则：
- `requiresAdmin`：仅 `admin` 可访问（如用户管理）
- `requiresPM`：`admin` 和 `project_manager` 可访问（如项目管理）

## 数据持久化

- 数据库文件：`backend/data/newbee.db`（SQLite，首次启动自动创建）
- 自动备份目录：`backend/data/backups/`
- 上传文件目录：`backend/uploads/`

> 备份建议：定期下载 `newbee.db` 或启用 Gitee 云备份功能。

## 生产部署建议

1. 修改 `backend/.env` 中的 `JWT_SECRET` 为强随机密钥
2. 设置 `CORS_ORIGIN` 为实际前端域名
3. 前端执行 `npm run build` 打包后由 Nginx 等托管
4. 后端执行 `npm run build && npm start` 以生产模式运行
5. 建议将 `backend/data/` 挂载到持久化存储，防止数据丢失

## 许可证

MIT License
