# 游戏开发项目管理系统

基于策划文档开发的游戏开发项目管理系统，采用前后端分离架构。

## 技术栈

### 后端
- Node.js + Express + TypeScript
- PostgreSQL + TypeORM
- JWT认证
- Excel处理（xlsx库）
- 钉钉机器人集成

### 前端
- Vue 3 + TypeScript + Vite
- Element Plus UI组件库
- Pinia状态管理
- Vue Router路由管理
- Axios HTTP客户端

## 功能模块

### 1. 用户管理
- 用户注册、登录
- 角色权限管理（管理员、项目经理、开发人员、测试人员）
- 用户信息管理

### 2. 项目管理
- 项目创建、编辑、归档
- 项目成员管理
- 项目状态跟踪

### 3. 任务管理
- 任务创建、编辑、删除
- 任务状态流转（待处理、进行中、已完成、已关闭）
- 子任务分解
- 任务依赖关系
- 任务操作记录

### 4. BUG管理
- BUG提交、编辑、删除
- BUG状态流转（待处理、已分配、修复中、已修复、已验证、已关闭）
- BUG严重程度分类
- BUG操作记录

### 5. 钉钉集成
- webhook通知
- 任务状态变更通知
- BUG提交和分配通知
- 每日/每周报告推送

### 6. 数据导入导出
- Excel模板下载
- 批量导入任务/BUG数据
- 导出项目数据到Excel
- 导出统计报表

## 安装和运行

### 环境要求
- Node.js 18+
- PostgreSQL 12+
- npm 或 yarn

### 1. 克隆项目
```bash
git clone <repository-url>
cd FLYP
```

### 2. 配置数据库
创建PostgreSQL数据库并配置连接信息。编辑 `backend/.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=flyp

# 服务器配置
PORT=3000

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 钉钉配置
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=your_token

# CORS配置
CORS_ORIGIN=http://localhost:5173
```

### 3. 安装依赖

#### 后端
```bash
cd backend
npm install
```

#### 前端
```bash
cd frontend
npm install
```

### 4. 运行项目

#### 启动后端服务
```bash
cd backend
npm run dev
```

#### 启动前端服务
```bash
cd frontend
npm run dev
```

### 5. 访问系统
- 前端地址：http://localhost:5173
- 后端API地址：http://localhost:3000

## 项目结构

```
FLYP/
├── backend/                # 后端项目
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── controllers/   # 控制器
│   │   ├── entities/      # 数据库实体
│   │   ├── middleware/    # 中间件
│   │   ├── routes/        # 路由
│   │   ├── services/      # 服务层
│   │   ├── app.ts         # Express应用配置
│   │   └── server.ts      # 服务器入口
│   ├── .env               # 环境变量
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── api/           # API接口
│   │   ├── components/    # 组件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # Pinia状态管理
│   │   ├── views/         # 页面视图
│   │   ├── App.vue        # 根组件
│   │   └── main.ts        # 入口文件
│   ├── package.json
│   └── vite.config.ts
└── 策划文档.md            # 项目策划文档
```

## API接口

### 用户接口
- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `GET /api/users` - 获取所有用户
- `GET /api/users/:id` - 获取用户详情
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户

### 项目接口
- `GET /api/projects` - 获取所有项目
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目
- `PATCH /api/projects/:id/archive` - 归档项目

### 任务接口
- `GET /api/tasks` - 获取所有任务
- `POST /api/tasks` - 创建任务
- `GET /api/tasks/:id` - 获取任务详情
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `PATCH /api/tasks/:id/status` - 更新任务状态

### BUG接口
- `GET /api/bugs` - 获取所有BUG
- `POST /api/bugs` - 提交BUG
- `GET /api/bugs/:id` - 获取BUG详情
- `PUT /api/bugs/:id` - 更新BUG
- `DELETE /api/bugs/:id` - 删除BUG
- `PATCH /api/bugs/:id/status` - 更新BUG状态
- `PATCH /api/bugs/:id/assign` - 分配BUG

### Excel接口
- `GET /api/excel/export/tasks` - 导出任务到Excel
- `GET /api/excel/export/bugs` - 导出BUG到Excel
- `POST /api/excel/import/tasks` - 从Excel导入任务
- `POST /api/excel/import/bugs` - 从Excel导入BUG
- `GET /api/excel/template/tasks` - 下载任务导入模板
- `GET /api/excel/template/bugs` - 下载BUG导入模板

## 开发说明

### 后端开发
- 使用TypeScript进行类型安全开发
- 使用TypeORM进行数据库操作
- 使用JWT进行用户认证
- 使用中间件进行权限控制

### 前端开发
- 使用Vue 3组合式API
- 使用TypeScript提供类型安全
- 使用Element Plus组件库
- 使用Pinia进行状态管理
- 使用Vue Router进行路由管理

## 部署说明

### 生产环境配置
1. 修改 `.env` 文件中的配置
2. 设置 `JWT_SECRET` 为安全的密钥
3. 配置正确的数据库连接信息
4. 配置钉钉Webhook地址

### 构建和运行
```bash
# 后端构建
cd backend
npm run build
npm start

# 前端构建
cd frontend
npm run build
```

## 注意事项

1. 数据库需要提前创建，并配置正确的连接信息
2. 首次运行会自动创建数据库表结构
3. 建议在生产环境中关闭 `synchronize` 选项
4. 钉钉Webhook需要提前在钉钉群中配置机器人
5. Excel导入导出功能需要安装相应的依赖

## 许可证

MIT License