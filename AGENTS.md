# AGENTS.md — 博客前端（web_nuxt）

个人博客前台 + 管理后台：Nuxt 4 + Nuxt UI + TypeScript，BFF 转发到后端。
仓库：`github.com/Sunrisies/nuxt_web`，主分支 `main`。

## 快速开始

```bash
pnpm install
pnpm dev        # 0.0.0.0，默认 3000
pnpm build
pnpm lint       # eslint
```

环境变量见 `.env.example`：

- `NUXT_API_BASE`：后端地址，统一带 `/api` 前缀（如 `https://api.sunrise1024.top/api`）
- `NUXT_PUBLIC_SITE_URL`：站点公网地址
- `NUXT_CSDN_COOKIE`（可选）：CSDN 同步用的 Cookie；不配置时在同步页手动粘贴
- `NUXT_AI_API_BASE` / `NUXT_AI_API_KEY` / `NUXT_AI_MODEL`：SEO 分析/优化用的 OpenAI 兼容接口
  （base 到 `/v1` 为止，代码拼 `/chat/completions`）；不配时 SEO 分析退化为规则分析
- `NUXT_API_TIMEOUT` / `NUXT_API_RESOLVE_ADDRESS` / `NUXT_API_NETWORK_INTERFACE`：见文件内注释

## 结构

- `app/pages/`：页面（`/admin/*` 为管理后台）
- `app/components/`、`app/layouts/`、`app/composables/`
- `server/api/`：同源 BFF 接口，转发到后端并透传 `access_token` cookie
- `server/utils/`：后端地址、CSDN 签名请求等工具
- `docs/specs/`：功能设计文档

## 后端交互约定

- 浏览器只访问同源 `/api/**`，由 Nitro 服务端转发到 `NUXT_API_BASE`，避免 CORS。
- 登录态是 httpOnly cookie `access_token`，后端鉴权；管理接口要求 DB 中的 ADMIN/SUPER_ADMIN 角色。
- **分页响应是 `{ data: { data: [...], pagination } }`**，写“判断是否存在”时不要直接对 `json.data` 调 `.some`。
- 文章状态：`0` 草稿、`1` 发布、`2` 下线；前台接口只返回已发布文章。

## CSDN 同步功能

- 页面：`/admin/csdn-sync`（`app/pages/admin/csdn-sync.vue`，侧边栏入口在 `app/layouts/admin.vue`）
- 接口：
  - `POST /api/csdn/list`：用 CSDN Cookie 调 `bizapi.csdn.net` 的签名接口取文章列表，并标记本地是否已存在
  - `POST /api/csdn/sync`：逐篇拉详情、转存图片、查重、创建分类/标签，最后以**草稿**写入后端
- 同步时会传 `publish_time`：CSDN 列表返回的 `postTime` 是北京时间（`YYYY-MM-DD HH:mm:ss`），
  `sync.post.ts` 按 `+08:00` 解析后转成 UTC ISO 再发给后端。
- 后端必须已支持 `publish_time`（server 仓库 2026-11-14 之后）；旧后端会静默忽略该字段。
- 已存在文章按标题查重跳过；图片只转存 `csdnimg.cn` 域名。
- `server/utils/csdn.ts` 里的 APP_KEY/APP_SECRET 是 CSDN 网页端签名常量，不是账号密钥。

## 时间显示

- 后端返回的时间字符串已经是北京时间（`YYYY-MM-DD HH:mm:ss` 或 RFC3339），前端不要重复加 8 小时。
- 文章发布时间以 `publish_time` 为准；CSDN 同步的草稿在发布后仍保留原文时间。

## 接口变更同步（必须遵守）

每次改动以下内容后，**立即**在 `../SYNC_LOG.md` 的「变更记录」区块顶部追加一条记录（按文件内模板格式）：
- `server/api/` 下的 BFF 接口（请求/响应结构、路由路径）
- `app/types/` 下的类型定义（字段增删改）
- 与后端约定的变更（状态码、分页结构、鉴权方式等）

追加后同步更新「last_read 指针」表中本会话的时间戳。
不涉及接口契约的纯 UI / 样式 / 组件内部逻辑改动**不需要**记录。

## 部署 / 提交

- 仓库没有 GitHub Actions；历史上通过 `chore: bump version to x.y.z [deploy]` 这类提交触发外部平台部署。
- 本机 `node_modules` 的 eslint 包曾出现缺失（`pnpm exec eslint` 报 MODULE_NOT_FOUND），
  重新 `pnpm install` 即可；提交前建议跑 `pnpm lint`。
- 不要提交 `.env`、`.nuxt/`、`.output/`、`node_modules/`。

## 已知遗留

- 同步流程没有单元测试，只有 `scripts/test-*.mjs` 的端到端脚本。
- CSDN Cookie 会过期，同步失败时优先检查 Cookie。
- 图片转存失败不会中断同步，只在结果里提示“N 张图片转存失败”。
