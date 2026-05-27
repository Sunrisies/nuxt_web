# 云剪贴板（Cloud Clipboard）设计文档

**日期**：2026-05-26
**作者**：朝阳
**状态**：Draft v1
**目标读者**：前端实现者（Nuxt）+ 后端实现者（Rust）

---

## 1. 背景与目标

在博客后台新增「云剪贴板」功能：

- 用户在 A 设备上传 **文本 / 图片 / 任意文件**
- 在 B 设备打开页面即可看到，一键复制 / 下载
- 类似聊天 UI（气泡流），按时间倒序

**非目标**：
- 多用户聊天 / 协作
- 端到端加密
- 公开访问
- 自动过期清理（本期永久保存，仅手动删除）

---

## 2. 总体架构

```
┌──────────┐   /api/v1/clipboard/text   ┌───────────────┐
│ 浏览器   │ ─────────────────────────► │ Nuxt 服务器   │
│ (Nuxt SPA│   /api/v1/clipboard/file   │  routeRules   │
│  admin)  │ ─────────────────────────► │  proxy        │
└──────────┘   /api/v1/clipboard        └───────┬───────┘
     ▲         /api/v1/clipboard/:uuid          │
     │                                          ▼
     │                                   ┌──────────────┐
     │                                   │  Rust API    │
     │                                   │              │
     │                                   │  ┌────────┐  │
     │                                   │  │ DB     │  │ ← 元数据 + 文本正文
     │                                   │  └────────┘  │
     │                                   │              │
     │   file_url (CDN)                  │  ┌────────┐  │
     └───────────────────────────────────┼──┤ 七牛   │  │ ← 图片/文件
                                         │  │ Kodo   │  │
                                         │  └────────┘  │
                                         └──────────────┘
```

**关键决策**：

| 决策点 | 选择 | 理由 |
|---|---|---|
| 鉴权 | 复用现有 admin Cookie/Session | 单用户场景，免重复造轮 |
| 路由位置 | `/admin/clipboard` | 沿用 admin 布局与登录态 |
| 上传方式 | 前端 → Rust 后端 → 七牛（中转） | 复用现有 `/images/upload` 模式，前端不引入七牛 SDK |
| 数据模型 | 单表 `clipboard_entries`，`type` 字段区分 | YAGNI，查询简单 |
| 保留策略 | 永久保存，仅手动删除 | 本期需求 |
| 七牛 Bucket | **公开 Bucket**（推荐）/ 私有 Bucket | 公开简单，CDN 直链；私有需后端签发临时 URL |

---

## 3. 数据模型

### 3.1 表结构 `clipboard_entries`

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `id` | `BIGSERIAL` | ✓ | auto | 主键自增 |
| `uuid` | `VARCHAR(36)` | ✓ | - | UUID v4，对外暴露标识 |
| `user_id` | `BIGINT` | ✓ | - | 用户表外键 |
| `type` | `VARCHAR(16)` | ✓ | - | `text` / `image` / `file` |
| `content` | `TEXT` | ✗ | NULL | 文本正文（type=text 必填） |
| `file_url` | `VARCHAR(512)` | ✗ | NULL | 七牛文件 URL（type≠text 必填） |
| `file_name` | `VARCHAR(255)` | ✗ | NULL | 原始文件名（type≠text 必填） |
| `file_size` | `BIGINT` | ✗ | NULL | 字节数（type≠text 必填） |
| `mime_type` | `VARCHAR(128)` | ✗ | NULL | MIME 类型 |
| `pinned` | `BOOLEAN` | ✓ | `false` | 置顶标记（预留二期） |
| `created_at` | `TIMESTAMP` | ✓ | `NOW()` | 创建时间 |
| `updated_at` | `TIMESTAMP` | ✓ | `NOW()` | 更新时间 |

**索引**：

```sql
CREATE UNIQUE INDEX uniq_clipboard_uuid ON clipboard_entries(uuid);
CREATE INDEX idx_clipboard_user_created ON clipboard_entries(user_id, created_at DESC);
```

**CHECK 约束**：

```sql
ALTER TABLE clipboard_entries ADD CONSTRAINT chk_type
  CHECK (type IN ('text', 'image', 'file'));

ALTER TABLE clipboard_entries ADD CONSTRAINT chk_text_content
  CHECK (type != 'text' OR content IS NOT NULL);

ALTER TABLE clipboard_entries ADD CONSTRAINT chk_file_fields
  CHECK (type = 'text' OR (file_url IS NOT NULL AND file_name IS NOT NULL AND file_size IS NOT NULL));
```

### 3.2 七牛 Kodo 存储约定

| 项 | 值 |
|---|---|
| Bucket | `blog-clipboard`（新建，公开读） |
| Key 规则 | `clipboard/{user_id}/{yyyyMM}/{uuid}{ext}` |
| 访问域名 | 七牛绑定的 CDN 域名（如 `https://cdn.sunrise1024.top`） |
| 单文件大小上限 | 50 MB（后端校验） |
| 文件类型 | 不限（MIME 通过 `file` 字段自动识别） |

---

## 4. Rust 后端接口规范

所有接口前缀 `/api/v1/clipboard`，均需登录态。响应统一格式：

```json
{ "code": 200, "message": "成功", "data": ... }
```

**路由匹配注意**：`/clipboard/text` 与 `/clipboard/file` 是静态路由，`/clipboard/:uuid` 是参数路由。Axum / Actix / Rocket 等主流框架默认静态优先匹配，无需特殊处理；若用其他框架请确保注册顺序为「静态 → 参数」。

### 4.1 上传文本 `POST /api/v1/clipboard/text`

**Request Body** (`application/json`)：

```json
{
  "content": "要保存的文本内容（最大 100000 字符）"
}
```

**校验**：
- `content` 非空，trim 后长度 ≥ 1
- 字符数 ≤ 100000，超出返回 `40001`

**Response 200**：

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "type": "text",
    "content": "要保存的文本内容",
    "created_at": "2026-05-26T10:30:00Z",
    "pinned": false
  }
}
```

### 4.2 上传文件 `POST /api/v1/clipboard/file`

**Request** (`multipart/form-data`)：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `file` | File | ✓ | 单个文件，≤ 50MB |

**处理流程**：
1. 接收 multipart 文件
2. 检测 MIME（`image/*` → type=image，其他 → type=file）
3. 生成 UUID，按规则拼出七牛 Key
4. 上传到七牛
5. 写入 DB（含 `file_url` = 完整 CDN URL）
6. 返回元数据

**Response 200**：

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "uuid": "550e8400-...",
    "type": "image",
    "file_url": "https://cdn.sunrise1024.top/clipboard/1/202605/550e8400-....jpg",
    "file_name": "Screenshot.jpg",
    "file_size": 234567,
    "mime_type": "image/jpeg",
    "created_at": "2026-05-26T10:30:00Z",
    "pinned": false
  }
}
```

### 4.3 列表 `GET /api/v1/clipboard`

**Query 参数**：

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `page` | int | 1 | 页码，从 1 开始 |
| `limit` | int | 20 | 每页条数，最大 100 |
| `type` | string | - | 可选筛选：`text` / `image` / `file` |

**Response 200**：

```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "data": [
      {
        "uuid": "...",
        "type": "text",
        "content": "...",
        "pinned": false,
        "created_at": "2026-05-26T10:30:00Z"
      },
      {
        "uuid": "...",
        "type": "image",
        "file_url": "https://cdn.../xxx.jpg",
        "file_name": "Screenshot.jpg",
        "file_size": 234567,
        "mime_type": "image/jpeg",
        "pinned": false,
        "created_at": "2026-05-26T10:29:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 42 }
  }
}
```

排序：`pinned DESC, created_at DESC`（本期 `pinned` 全为 `false`，等价于按时间倒序；二期开启置顶功能后无需改 SQL）。

### 4.4 删除 `DELETE /api/v1/clipboard/:uuid`

**处理**：
1. 校验 uuid 属于当前用户
2. 若是文件类型，先删七牛对象（失败不阻塞 DB 删除，但要记日志）
3. 删 DB 记录

**Response 200**：

```json
{ "code": 200, "message": "删除成功", "data": null }
```

### 4.5 置顶切换（预留，本期不实现）

```
PATCH /api/v1/clipboard/:uuid/pin
Body: { "pinned": true | false }
```

### 4.6 错误码

| code | HTTP | 说明 |
|---|---|---|
| 200 | 200 | 成功 |
| 40001 | 400 | 参数错误（content 为空 / 过长） |
| 40002 | 400 | 文件类型不允许 |
| 40003 | 400 | 文件超过 50MB |
| 40101 | 401 | 未登录 |
| 40301 | 403 | 无权访问该资源（uuid 不属于当前用户） |
| 40401 | 404 | 资源不存在 |
| 50001 | 500 | 七牛上传失败 |
| 50002 | 500 | 数据库错误 |

---

## 5. 前端实现规范（Nuxt）

### 5.1 文件结构

```
app/
├── pages/
│   └── admin/
│       └── clipboard.vue              # 入口页（SPA, ssr:false）
├── components/
│   └── clipboard/
│       ├── ClipboardMessageList.vue   # 气泡列表（虚拟滚动可选）
│       ├── ClipboardBubble.vue        # 单条气泡（按 type 渲染）
│       ├── ClipboardInput.vue         # 底部输入框 + 上传按钮
│       └── ClipboardImagePreview.vue  # 图片放大预览弹窗
├── composables/
│   ├── http.ts                        # 已存在，复用
│   └── useClipboard.ts                # 新增，封装 list/upload/delete + 状态
└── types/
    └── clipboard.ts                   # 类型定义
```

### 5.2 类型定义 `types/clipboard.ts`

```typescript
export type ClipboardType = 'text' | 'image' | 'file'

export interface ClipboardEntry {
  uuid: string
  type: ClipboardType
  content?: string           // type=text
  file_url?: string          // type=image|file
  file_name?: string
  file_size?: number
  mime_type?: string
  pinned: boolean
  created_at: string
}

export interface ClipboardPagination {
  page: number
  limit: number
  total: number
}

export interface ClipboardListResponse {
  data: ClipboardEntry[]
  pagination: ClipboardPagination
}
```

### 5.3 Composable `useClipboard.ts`

需要导出以下方法（伪签名）：

```typescript
useClipboard() {
  entries: Ref<ClipboardEntry[]>           // 累积列表（用于无限滚动）
  loading: Ref<boolean>
  uploading: Ref<boolean>
  hasMore: Ref<boolean>

  loadMore(): Promise<void>                // 加载下一页，追加到 entries
  refresh(): Promise<void>                 // 清空重新加载第一页
  uploadText(content: string): Promise<ClipboardEntry>
  uploadFile(file: File): Promise<ClipboardEntry>
  remove(uuid: string): Promise<void>      // 删除后从 entries 移除
  copyToClipboard(entry: ClipboardEntry): Promise<void>
                                            // text → 复制正文
                                            // image/file → 复制 file_url
                                            // 调用 navigator.clipboard.writeText
}
```

### 5.4 入口页 `pages/admin/clipboard.vue`

```
definePageMeta({
  layout: 'admin',
  ssr: false,
  middleware: 'admin-auth',   // 复用现有
})
```

页面骨架（伪结构）：

```
<template>
  <div class="flex flex-col h-[calc(100vh-4rem)]">
    <!-- 顶部标题栏 -->
    <header>云剪贴板</header>

    <!-- 滚动消息流（占满剩余空间） -->
    <ClipboardMessageList
      :entries="entries"
      :loading="loading"
      :has-more="hasMore"
      @load-more="loadMore"
      @delete="remove"
      @copy="copyToClipboard"
    />

    <!-- 底部输入区域 -->
    <ClipboardInput
      :uploading="uploading"
      @send-text="uploadText"
      @send-file="uploadFile"
    />
  </div>
</template>
```

### 5.5 组件契约

#### `ClipboardMessageList.vue`

**Props**：
- `entries: ClipboardEntry[]`
- `loading: boolean`
- `hasMore: boolean`

**Emits**：
- `load-more`：滚动到顶部触发（聊天倒序：旧消息在上）
- `delete(uuid: string)`
- `copy(entry: ClipboardEntry)`

**行为**：
- 容器使用 `overflow-y-auto`，初始定位到最底部
- 滚动到顶部 100px 内触发 `load-more`
- 渲染每条气泡用 `<ClipboardBubble>`

#### `ClipboardBubble.vue`

**Props**：
- `entry: ClipboardEntry`

**Emits**：
- `delete`
- `copy`

**行为**：
- 气泡右侧对齐（单用户场景全部「我发的」）
- `type=text`：渲染文本，长文本折叠显示「展开」
- `type=image`：缩略图（点击放大），右下角显示文件名
- `type=file`：图标 + 文件名 + 大小，点击下载
- 气泡上 hover 显示操作菜单：复制 / 删除 / 复制链接
- 时间戳：今天显示 HH:mm，更早显示 MM-DD HH:mm

#### `ClipboardInput.vue`

**Props**：
- `uploading: boolean`

**Emits**：
- `send-text(content: string)`
- `send-file(file: File)`

**行为**：
- 多行 textarea，Enter 发送、Shift+Enter 换行
- 左侧按钮：上传图片（accept=`image/*`）、上传文件（accept=`*`）
- 支持粘贴图片：监听 `paste` 事件，若有 image 直接走 `send-file`
- 支持拖拽：整个聊天容器作为 drop zone
- 上传中按钮 loading 状态

### 5.6 复制行为详细规则

| 类型 | 复制内容 |
|---|---|
| text | 调用 `navigator.clipboard.writeText(entry.content)` |
| image | 默认复制 `file_url`；右键菜单提供「复制图片」（`navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`） |
| file | 复制 `file_url` |

复制成功后用 `useToast`（@nuxt/ui 自带）提示「已复制」。

### 5.7 API 调用约定

通过现有 `composables/http.ts` 调用，路径前缀 `/api/v1/clipboard`：

```typescript
import { http } from '~/composables/http'

// 列表
http<ApiResponse<ClipboardListResponse>>('/v1/clipboard', {
  query: { page, limit }
})

// 上传文本
http<ApiResponse<ClipboardEntry>>('/v1/clipboard/text', {
  method: 'POST',
  body: { content }
})

// 上传文件
const form = new FormData()
form.append('file', file)
http<ApiResponse<ClipboardEntry>>('/v1/clipboard/file', {
  method: 'POST',
  body: form
})

// 删除
http<ApiResponse<null>>(`/v1/clipboard/${uuid}`, { method: 'DELETE' })
```

---

## 6. 错误处理

### 6.1 前端

| 场景 | 处理 |
|---|---|
| 网络错误 | toast「网络错误，请重试」，按钮恢复可用 |
| 401 未登录 | 跳 `/admin/login` |
| 文件超 50MB | 上传前在前端校验，toast「文件不能超过 50MB」 |
| 上传失败 | toast 显示后端 message |
| `navigator.clipboard` 不可用 | 降级用 `document.execCommand('copy')` + 隐藏 textarea |
| 列表为空 | 显示占位「还没有任何内容，从下方上传第一条」 |

### 6.2 后端

| 场景 | 处理 |
|---|---|
| 七牛上传失败 | 返回 50001，不写 DB |
| 删除文件时七牛 404 | 忽略，继续删 DB 并 warn 日志 |
| DB 唯一冲突 | 极少发生，500 报错 |

---

## 7. 测试要点

### 7.1 前端手动验收清单

- [ ] 发送文本：短文本 / 长文本（>1000 字）
- [ ] 上传图片：点击按钮 / 粘贴截图 / 拖拽
- [ ] 上传文件：PDF / zip / 任意类型
- [ ] 上传 50MB 临界与超过 50MB 的提示
- [ ] 列表：分页加载、滚动到顶部加载更多
- [ ] 复制文本：粘到记事本验证内容
- [ ] 复制图片 URL：粘到浏览器能直接打开
- [ ] 删除条目：列表立即移除
- [ ] 移动端布局（iPhone Safari、Android Chrome）
- [ ] 跨设备同步：A 设备发送 → B 设备刷新可见

### 7.2 后端单元测试建议

- 上传文本：content 为空 / 超长 → 40001
- 上传文件：超过 50MB → 40003
- 删除非本人 uuid → 40301
- 列表分页：page/limit 边界、type 筛选

---

## 8. 实施顺序建议

1. **后端**：
   1. 建表 + 索引
   2. 实现 4 个接口（text 上传 / file 上传 / list / delete）
   3. Postman / curl 测试
2. **前端**：
   1. 类型定义 + composable
   2. 入口页 + 三个子组件骨架
   3. 接通接口，跑通文本上传 / 列表
   4. 文件上传 + 粘贴 + 拖拽
   5. 复制 / 删除 / 移动端适配
3. **联调**：跨设备验收

---

## 9. 二期可扩展点（YAGNI 警示，本期勿做）

- 置顶（表已留 `pinned` 字段）
- 标签 / 搜索
- 文本全文检索
- 分享链接（生成临时公开 URL）
- 自动过期清理
- 端到端加密
- 多用户协作 / 共享空间
