# Cansoria

Cansoria Studio 手绘油画电商项目，采用前后端分离架构：基于 Medusa v2 的电商后端，配合 Next.js 店面前端。

## 技术栈

| 部分 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Next.js 16 · React 19 · Tailwind CSS 4 | 油画店面，含购物车、结账、账户中心 |
| 后端 | Medusa v2 (2.12.4) · TypeScript | 电商核心：商品、购物车、订单、API |
| 数据库 | PostgreSQL 16 | 通过 Docker Compose 启动 |
| 缓存 | Redis 7 | Medusa 事件与队列 |
| 支付 | Stripe | |
| 邮件 | Resend | 订单通知等事务邮件 |
| 营销 | Klaviyo | 邮件订阅同步 |
| 存储 | Cloudflare R2 / S3 兼容 | 商品图片等资源 |

## 端口一览

| 服务 | 地址 |
| --- | --- |
| 前端店面 | http://localhost:3030 |
| 后端 API | http://localhost:9030 |
| Medusa 管理后台 | http://localhost:9030/app |
| PostgreSQL | `localhost:5433`（容器内 5432） |
| Redis | `localhost:6480`（容器内 6379） |

## 环境要求

- Node.js ≥ 20（推荐 24），npm
- Docker Desktop（用于 PostgreSQL 和 Redis）

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 2. 启动数据库

在项目根目录：

```bash
docker compose up -d
```

首次启动会创建 `cansoria_medusa_v2` 数据库和持久化卷。

### 3. 配置环境变量

```bash
cp backend/.env.template backend/.env
cp frontend/.env.example frontend/.env.local
```

两个模板已包含本地开发所需的数据库、Redis 和 CORS 配置。Stripe、Resend、Klaviyo、Turnstile、R2 等第三方密钥按需填写，未填写时对应功能不可用，但不影响启动。**请勿提交真实密钥。**

### 4. 启动后端

```bash
cd backend
npm run dev          # 开发模式，监听 9030 端口
```

首次启动会自动执行数据库迁移。启动后可导入种子数据（店铺信息、GBP/USD/EUR 区域、商品分类、油画商品及变体）：

```bash
npm run seed
```

如需登录管理后台，先创建管理员账号：

```bash
ADMIN_EMAIL=admin@cansoria.com \
ADMIN_PASSWORD=your_secure_password \
npx medusa exec ./src/scripts/create-admin-user.ts
```

### 5. 启动前端

```bash
cd frontend
npm run dev          # 监听 3030 端口
```

打开 http://localhost:3030 即可访问店面。

## 常用命令

后端（在 `backend/` 下执行）：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式（热重载，自动迁移） |
| `npm run build` / `npm run start` | 生产构建 / 启动 |
| `npm run seed` | 导入种子数据 |
| `npm run test:unit` | 单元测试 |
| `npm run test:integration:http` | HTTP 集成测试（需本地数据库） |
| `npm run test:integration:modules` | 模块集成测试（需本地数据库） |

前端（在 `frontend/` 下执行）：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm run start` | 生产构建 / 启动 |
| `npm run lint` | ESLint 检查 |

## 目录结构

```
.
├── docker-compose.yml        # PostgreSQL + Redis
├── backend/                  # Medusa v2 后端
│   ├── src/api               # store / admin 自定义 API
│   ├── src/modules           # 自定义模块（resend 通知）
│   ├── src/workflows         # 业务工作流
│   ├── src/subscribers       # 事件订阅
│   ├── src/jobs              # 定时任务
│   ├── src/emails            # 邮件模板
│   ├── src/scripts           # seed、创建管理员等脚本
│   └── integration-tests/    # 集成测试
└── frontend/                 # Next.js 店面
    └── src
        ├── app               # 页面路由（shop、cart、checkout、account 等）
        ├── components        # 店面组件
        ├── hooks             # React hooks
        └── lib               # Medusa SDK 客户端及工具
```

## 更多文档

- [backend/README.md](backend/README.md) — 后端详细说明与种子数据内容
- [backend/STORE_API_DOCS.md](backend/STORE_API_DOCS.md) — Store API 概览
- [backend/docs/FRONTEND_CART_API.md](backend/docs/FRONTEND_CART_API.md) — 前端购物车 API 约定
- [frontend/FRONTEND_CART_API.md](frontend/FRONTEND_CART_API.md) — 前端购物车接口对接说明
- [backend/SECURITY.md](backend/SECURITY.md) — 安全注意事项
