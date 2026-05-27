# 朝阳的码农札记 — 项目文档

## 项目概述

基于 Nuxt 4 的个人技术博客。前台 SSR 渲染，后台 SPA 管理（混合渲染模式），后端使用 Rust API。

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Nuxt 4 |
| UI 库 | @nuxt/ui v4（基于 Reka UI） |
| 样式 | Tailwind CSS v4 |
| 内容管理 | @nuxt/content v3 |
| 语言 | TypeScript |
| 包管理 | Bun |
| 部署 | Docker + 远程服务器推送 |
| 后端 API | Rust（独立项目） |
| 统计 | Umami（可选，通过 nuxt-umami 模块） |

## 项目结构

```
web_nuxt/
├── app/
│   ├── app.vue                        # 应用入口，全局 SEO + Schema
│   ├── error.vue                      # 错误页面（404 等）
│   ├── assets/css/
│   │   ├── main.css                   # 全局样式、动画、view-transition
│   │   └── tailwind.css               # Tailwind + nuxt/ui 主题变量
│   ├── components/
│   │   ├── AppHeader.vue              # 顶部导航栏（含登录/退出按钮）
│   │   ├── AppFooter.vue              # 页脚（ICP 备案、社交链接）
│   │   ├── ThemeToggle.vue            # 明暗主题切换（带 view-transition 动画）
│   │   ├── LoginModal.vue             # 登录弹窗组件
│   │   ├── ScrollToTopButton.vue      # 回到顶部
│   │   ├── ScrollProgressBar.vue      # 阅读进度条
│   │   ├── UserAvatar.vue             # 用户头像
│   │   ├── home/                      # 首页组件
│   │   ├── blog/                      # 博客列表组件
│   │   ├── article/                   # 文章详情组件
│   │   ├── timeline/                  # 时间线组件
│   │   └── about/                     # 关于页面组件
│   ├── composables/
│   │   └── http.ts                    # HTTP 请求封装（客户端走代理，服务端直连）
│   ├── layouts/
│   │   ├── default.vue                # 前台布局
│   │   └── admin.vue                  # 后台布局（侧边栏导航）
│   ├── pages/
│   │   ├── index.vue                  # 首页（SSR）
│   │   ├── about.vue                  # 关于页（SSR）
│   │   ├── archives.vue               # 文章归档（SSR）
│   │   ├── timeline.vue               # 时光轴（SSR）
│   │   ├── blog/[slug].vue            # 博客列表分页（SSR）
│   │   ├── article/[slug].vue         # 文章详情（SSR）
│   │   ├── tag/[slug].vue             # 标签筛选页（SSR）
│   │   ├── navigationBar.vue          # 外部工具导航中心（SSR）
│   │   └── admin/                     # 后台管理（SPA, ssr:false）
│   │       ├── index.vue              # 入口跳转页
│   │       ├── login.vue              # 登录页
│   │       ├── dashboard.vue          # 仪表盘
│   │       ├── posts/index.vue        # 文章管理 CRUD
│   │       ├── categories.vue         # 分类管理 CRUD（分页）
│   │       ├── tags.vue               # 标签管理 CRUD（分页）
│   │       └── links.vue              # 外部链接管理 CRUD（分页）
│   ├── types/                         # TypeScript 类型定义
│   └── utils/data.ts                  # 日期格式化工具
├── server/api/
│   ├── navigationBar.ts               # 导航栏数据（从 mock JSON 读取）
│   └── __sitemap__/urls.ts            # 站点地图生成
├── mocks/navigationBar.json           # 导航栏 mock 数据（153KB，200+ 条目）
├── nuxt.config.ts                     # Nuxt 配置（模块、路由规则、代理）
├── Dockerfile                         # 多阶段 Docker 构建
└── deploy.sh                          # 自动化部署脚本（含版本管理）
```

## 路由表

### 前台页面（SSR）

| 路由 | 页面文件 | SEO | 说明 |
|---|---|---|---|
| `/` | `index.vue` | ✅ 完整 | 首页：最新文章 + 标签云 + 个人信息卡片 |
| `/about` | `about.vue` | ✅ 完整 | 个人简介、技能、联系方式 |
| `/blog/:page` | `blog/[slug].vue` | ✅ 完整 | 博客分页列表，:page 为页码 |
| `/article/:uuid` | `article/[slug].vue` | ✅ 最完整 | 文章详情，含目录/上下篇/Breadcrumb |
| `/tag/:slug` | `tag/[slug].vue` | ✅ 完整 | 按标签名筛选文章 |
| `/archives` | `archives.vue` | ⚠️ 缺少 useSeoMeta | 按年月分组的文章归档 |
| `/timeline` | `timeline.vue` | ✅ 完整 | 日历热图 + 时间线 |
| `/navigationBar` | `navigationBar.vue` | ❌ 无 SEO | 外部工具分类导航 |

### 后台页面（SPA）

| 路由 | 鉴权 | 说明 |
|---|---|---|
| `/admin` | 无 | 自动检测登录状态，跳转仪表盘或登录页 |
| `/admin/login` | 无 | 登录表单，调用 `/api/v1/auth/login` |
| `/admin/dashboard` | 需登录 | 统计卡片（文章/分类/标签数 + 总浏览量）+ 最近文章 |
| `/admin/posts` | 需登录 | 文章 CRUD：分页列表 + 新建/编辑/删除弹窗 |
| `/admin/categories` | 需登录 | 分类 CRUD：分页列表 + 新建/编辑/删除弹窗 |
| `/admin/tags` | 需登录 | 标签 CRUD：分页列表 + 新建/编辑/删除弹窗 |
| `/admin/links` | 需登录 | 外部链接 CRUD：分页列表 + 新建/编辑/删除弹窗 |

## 后台功能说明

### 登录流程
- 请求：`POST /api/v1/auth/login`，body `{ account, password, login_type: "password" }`
- 响应：`{ code:200, data: { id, uuid, user_name, ... }, message:"密码登录成功" }`
- 前端将 `{ id, uuid, user_name }` 存入 `localStorage.admin_user`
- 后端用 Cookie/Session 鉴权，前端无需存储/传递 token
- 网页端顶部导航也有一个「登录」按钮，弹出 `LoginModal.vue` 弹窗登录

### 仪表盘
- 4 个统计卡片通过 4 个并行 API 请求获取数据
- 文章总数：`GET /v1/posts?page=1&limit=5` → `pagination.total`
- 分类数：`GET /v1/categories?page=1&limit=1` → `pagination.total`
- 标签数：`GET /v1/tags?page=1&limit=1` → `pagination.total`
- 总浏览量：`GET /v1/posts?page=1&limit=200` → 汇总所有 `views` 字段
- 最近文章列表取自 `/v1/posts` 的前 5 条

### 文章管理
- 列表：分页表格，列包括序号、标题、状态（推荐/已发布/置顶/隐藏）、浏览量、发布时间、操作
- 新建弹窗字段：标题、分类（下拉）、标签（多选下拉）、状态（草稿/已发布）、封面图 URL、推荐/置顶/隐藏开关、摘要、Markdown 内容、HTML 内容
- 编辑：基于文章 UUID，弹窗预填所有字段
- 删除：确认弹窗，基于 UUID 删除

### 分类管理
- 列表：分页表格，列包括 ID、名称、创建时间、操作
- 新建/编辑：弹窗表单，仅输入名称
- 删除：确认弹窗

### 标签管理
- 同分类管理结构

### 链接管理
- 列表：分页表格，列包括图标+名称、链接 URL、创建时间、操作
- 新建/编辑：弹窗表单，名称、链接地址、描述、图标 URL
- 删除：确认弹窗

## API 架构

```
[浏览器] → /api/v1/* → [Nuxt 服务器] ──代理──→ [Rust API]
                        (routeRules proxy)    api.sunrise1024.top
```

### 代理机制（核心）
- `nuxt.config.ts` 的 routeRules：`"/api/v1/**": { proxy: "https://api.sunrise1024.top/api/v1/**" }`
- 所有 `/api/v1/*` 请求由 Nuxt 服务器转发到后端，浏览器同源请求无跨域问题
- 前台 SSR 页面使用 `useAsyncData`，在服务端直接调用后端 API（不走代理）
- 后台 SPA 页面使用 `http()` composable，客户端调用 `/api/v1/*`（走代理）

### `http.ts` 封装

```typescript
// 客户端 → /api 作为 baseURL（走 Nuxt 代理）
// 服务端 → config.public.apiBase 作为 baseURL（直接调用后端）
const baseURL = import.meta.client ? "/api" : config.public.apiBase
```

### 完整接口清单

| 方法 | 路径 | 页面使用 |
|---|---|---|
| POST | `/api/v1/auth/login` | 登录页、登录弹窗 |
| GET | `/api/v1/posts?page=&limit=&category=&tag=` | 文章列表、首页、归档 |
| POST | `/api/v1/posts` | 文章管理（新建） |
| PUT | `/api/v1/posts/:uuid` | 文章管理（编辑） |
| DELETE | `/api/v1/posts/:uuid` | 文章管理（删除） |
| GET | `/api/v1/posts/:uuid` | 文章详情 |
| GET | `/api/v1/posts/:uuid/prevnext` | 上下篇导航 |
| GET | `/api/v1/posts/uploadTime` | 时间轴 |
| GET | `/api/v1/categories?page=&limit=` | 分类管理、博客列表 |
| POST | `/api/v1/categories` | 分类管理（新建） |
| PUT | `/api/v1/categories/:id` | 分类管理（编辑） |
| DELETE | `/api/v1/categories/:id` | 分类管理（删除） |
| GET | `/api/v1/tags?page=&limit=` | 标签管理 |
| POST | `/api/v1/tags` | 标签管理（新建） |
| PUT | `/api/v1/tags/:id` | 标签管理（编辑） |
| DELETE | `/api/v1/tags/:id` | 标签管理（删除） |
| GET | `/api/v1/tags/count` | 首页标签云、站点地图 |
| GET | `/api/v1/links?page=&limit=` | 链接管理 |
| POST | `/api/v1/links` | 链接管理（新建） |
| PUT | `/api/v1/links/:id` | 链接管理（编辑） |
| DELETE | `/api/v1/links/:id` | 链接管理（删除） |
| GET | `/api/v1/images/upload` | 未使用（图片上传待实现） |

### 响应格式

统一格式：
```json
{
  "code": 200,
  "message": "成功",
  "data": { ... }
}
```

列表类接口 data 内含：
```json
{
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 10, "total": 66 }
}
```

## 混合渲染策略

```
前台路由（/、/blog、/article 等）→ SSR（服务端渲染，利于 SEO）
后台路由（/admin、/admin/**）    → SPA（ssr: false，客户端渲染）
404 页面（/404）                 → 静态生成（static: true）
API 路由（/api/v1/**）           → 代理到后端
```

## @nuxt/ui v4 注意事项

### UTable
- 行数据 prop：`:data`（不是 v3 的 `:rows`）
- 列定义需要 `accessorKey` 字段用于数据提取
- 单元格插槽名：`#列名-cell`（如 `#name-cell`）
- slot 中的 `row` 是 tanstack Row 对象，原始数据在 `row.original`
- 综合列定义：`{ id: "xxx", key: "xxx", accessorKey: "xxx", label: "xxx" }`

### UModal
- 开关控制：`v-model:open="show"`（不是 v3 的 `v-model`）
- default 插槽是触发器按钮，不要放内容
- 内容放 `#body`、`#footer`、`#header` 具名插槽
- 通过 `title` prop 设置标题

### UPagination
- 当前页：`:page="page"`（不是 `v-model:page`）
- 翻页回调：`@update:page="handler"`
- 分页信息存 URL query（`?page=N`），刷新保持当前页

## 部署

### Docker
```bash
docker build -t web_nuxt:latest .
docker run -d --env-file .env -p 3000:3000 web_nuxt:latest
```

### 远程部署脚本
```bash
# 需配置 SSH 到 api.sunrise1024.top
./deploy.sh
```
deploy.sh 功能：版本号递增、Docker 多阶段构建、镜像推送、远程部署、健康检查、Git 提交。

### 环境变量
```env
NUXT_PUBLIC_API_BASE=https://api.sunrise1024.top/api
NUXT_UMAMI_HOST=https://umami.sunrise1024.top
NUXT_UMAMI_ID=354a3bc7-6b49-4725-b444-417dbead9686
```

## 已知问题 & 待完善

1. **Umami 统计**：服务器 `umami.sunrise1024.top` 有时不可达，控制台报 `ERR_CONNECTION_CLOSED`。可在 `nuxt.config.ts` 中注释 `nuxt-umami` 模块临时禁用
2. **导航管理**：导航中心数据来自 `mocks/navigationBar.json`（静态 mock），后台无管理页面，无法增删改
3. **图片上传**：`POST /v1/images/upload` 接口存在但前端未实现上传功能，封面图只能手动输入 URL
4. **SEO 缺失**：`/archives` 缺少 `useSeoMeta`，`/navigationBar` 完全无 SEO
5. **前台博客标签页**：`/tag/:slug` 无分页，一次性加载所有文章（limit=100）
