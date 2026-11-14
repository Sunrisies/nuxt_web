# CSDN 文章同步功能设计

## 概述

在管理后台新增"CSDN 同步"页面，支持输入 CSDN 用户主页 URL，批量抓取文章并保存为草稿。自动处理图片转存（下载 CSDN 图片 → 上传到自有服务器 → 替换链接）。

## 需求

- 输入 CSDN 用户主页 URL，批量同步所有文章
- 同步后文章存为草稿（`is_publish: false`）
- 已存在的文章跳过但在结果中提示
- 自动创建对应的分类和标签
- 文章中的图片转存到自有服务器，替换原始 CSDN 链接
- 封面图同样转存

## 技术方案

### 前端页面

- 路由：`/admin/csdn-sync`
- 文件：`app/pages/admin/csdn-sync.vue`
- 侧边栏菜单项：在 `app/layouts/admin.vue` 的 `navItems` 中新增
- UI 组件：
  - URL 输入框 + "开始同步"按钮
  - 同步进度列表（实时显示每篇文章状态）
  - 完成汇总（新增/跳过/失败数量）
  - 使用 Nuxt UI 组件（UInput, UButton, UCard, UAlert）

### 服务端 API

- 路由：`server/api/csdn/sync.post.ts`
- 请求：`POST /api/csdn/sync` with `{ url: string }`
- 响应：`{ total, created, skipped, failed, details: [{ title, status, message? }] }`
- 处理流程：
  1. 解析 CSDN 用户名（从 URL 提取）
  2. 爬取文章列表（调用 CSDN 内部 API）
  3. 逐篇爬取文章详情页
  4. 解析 HTML 提取标题、正文、标签、分类、首图
  5. 检查文章是否已存在（按标题查询后端）
  6. 转存图片：
     - 提取所有 `<img>` URL
     - 下载图片（加 Referer 头绕过防盗链）
     - 上传到自有服务器（`POST /api/v1/images/upload`）
     - 替换 Markdown 中的图片 URL
  7. 转存封面图（首图）
  8. 创建分类和标签（如不存在）
  9. 保存文章为草稿（`POST /api/v1/posts`）
  10. 返回同步结果

### 依赖

- `cheerio`：HTML 解析
- `turndown`：HTML → Markdown 转换

## CSDN 爬取细节

### 文章列表 API

- URL: `https://blog.csdn.net/community/home-api/v1/getBusinessList`
- 参数: `page`, `size=20`, `businessType=blog`, `username`
- 请求头: 模拟浏览器 User-Agent
- 返回: JSON 格式文章列表

### 文章详情页

- URL: `https://blog.csdn.net/{username}/article/details/{id}`
- 解析:
  - 标题: `h1.title-article`
  - 正文: `#content_views`
  - 标签: `.tag-link`
  - 分类: `.article-type-txt` 或从标签推断
  - 首图: 正文第一个 `<img>` 或 `og:image` meta 标签

### 图片防盗链处理

- 下载图片时添加请求头:
  - `Referer: https://blog.csdn.net/`
  - `User-Agent`: 模拟浏览器
- 使用 `fetch` 或 `node-fetch` 下载图片为 Buffer
- 通过 FormData 上传到 `/api/v1/images/upload`
- 返回新的图片 URL

## 数据流

```
管理页面 → POST /api/csdn/sync { url: "https://blog.csdn.net/xxx" }
  → 解析用户名
  → GET CSDN 文章列表 API（分页）
  → 对每篇文章：
    → GET 文章详情页 HTML
    → 解析 HTML（cheerio）
    → HTML → Markdown（turndown）
    → 检查标题是否已存在（GET /api/v1/posts?search=title）
      → 已存在：标记 skip
      → 不存在：
        → 提取图片 URL 列表
        → 逐张下载图片（加 Referer）
        → 逐张上传到 /api/v1/images/upload
        → 替换 Markdown 中的图片 URL
        → 下载并上传封面图
        → 创建分类（如不存在）
        → 创建标签（如不存在）
        → POST /api/v1/posts 创建草稿
  → 返回 { total, created, skipped, failed, details[] }
```

## 错误处理

- CSDN 请求失败：捕获并记录，继续处理下一篇
- 图片下载/上传失败：保留原链接，在结果中标记警告
- 后端 API 调用失败：记录错误，标记为 failed
- 超时控制：每张图片下载 30s 超时，每篇文章处理 60s 超时

## 用户体验

- 同步过程中显示进度（"正在同步 3/20: 文章标题..."）
- 每篇文章完成后立即显示状态（成功/跳过/失败）
- 完成后显示汇总统计
- 失败的文章可以点击查看错误信息
- 支持取消同步（AbortController）

## 安全考虑

- 服务端请求 CSDN，避免暴露用户 IP
- 限制同步频率（可选：加 rate limiting）
- 验证 URL 格式（必须是 `blog.csdn.net` 域名）
- 后端 API 调用需要管理员认证（通过现有的 session 机制）
