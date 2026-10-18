# 图片和文章管理

本轮范围：图片管理、文章搜索筛选、文章图片引用保护。未新增统计仪表盘或访问采集。

## 使用入口

- `/admin/images`：图片上传、文件名搜索、分页、缩略图、详情预览、复制原图地址、引用文章列表和确认删除。
- `/admin/posts`：标题关键词、分类、标签、状态组合筛选；筛选条件与页码保存到地址栏，刷新和前进/后退可恢复；列表显示分类、标签及明确的草稿/发布/下线状态。
- 图片详情中的文章标题跳转 `/admin/posts?edit=<uuid>`，直接打开既有文章编辑器。

## 删除保护

后端检查 `posts.content`、`posts.markdowncontent` 和 `posts.cover_image`，覆盖草稿、已发布和已下线文章。同一文章的正文和封面同时引用时按一篇文章计数，并分别展示引用位置。

引用以已保存的文章为准。稳定的对象 UUID 可识别 CDN 域名更换、URL 参数、百分号编码和 Markdown 转义的引用。无法被系统追踪的外部站点引用不在保护范围内。

删除时重新检查，存在引用返回 HTTP 409。上传记录删除接口也委托同一保护逻辑。PostgreSQL 事务级 advisory lock 协调图片删除和文章创建/更新：引用检查期间不会插入新的文章引用。该锁只用于管理写入，不用于公开文章读取。

仅无引用的图片可删除。按对象 key 分别清理本地文件或七牛对象，云端删除失败会保留数据库记录并返回失败；七牛返回对象已不存在时可安全重试。七牛删除通过 HTTPS、在线程池执行，并设定请求超时。管理凭证改为 SDK 签名，修复原手写签名缺少换行及 Base64 填充的问题；参照[七牛管理凭证文档](https://developer.qiniu.com/kodo/6671/historical-document-management-certificate)。

删除成功后保留 `images.key=deleted/<原key>` 的内部删除标记，列表和详情排除它们；同时清理相应 uploads 记录。这样旧编辑器再次提交已删除的图片链接会收到 HTTP 409，避免重新保存破图。无需变更业务表结构。七牛对象和数据库不具备跨系统原子事务；若云端已删除但数据库提交失败，可重试操作收敛。CDN 已缓存的图片副本可能在缓存失效前仍可访问。

## 接口

- `GET /api/v1/images?page=1&limit=12&search=<文件名>`：统一分页响应，图片记录附 `reference_count` 和 `references`。
- `GET /api/v1/images/{id}`：图片详情和当前引用文章（uuid、标题、状态、正文/封面位置）。
- `DELETE /api/v1/images/{id}`：真实删除对象，409 表示仍被引用，404 表示不存在或已删除。
- `GET /api/v1/posts?search=<标题>&category=<id>&tag=<id>&status=<0|1|2>&page=1&limit=10`：组合筛选；搜索中的 `%`、`_` 和反斜杠按普通字符处理。游客始终只能获得已发布文章。

图片管理元数据仅管理员可读；生成的本地图片文件 URL 保持公开读取，以供文章展示。

## 验证

后端回归测试必须指向本地独立 `server_acceptance_test` 数据库，串行运行，不能指向文章验收库。

真实浏览器流程：`node scripts/test-media-management-browser.cjs`。脚本限制本地验收服务及 `server_acceptance` 数据库，读取本机凭据，不打印密钥。若配置七牛，会创建并删除本轮自己的七牛测试图片，创建并清理自己的文章，保留内部删除标记。截图和结构化结果写入本地验收目录 `results/`。

## 本地验收结果（2026-10-17）

- Rust：47 项测试全部通过，包含文章各状态、正文/封面/HTML 引用、上传删除旁路、旧编辑器提交、并发保存与删除，以及七牛管理签名。测试使用独立本地测试库。
- 构建：Rust release、Nuxt node-server 生产构建均完成，已更新本地 39157/39158 服务；原有运行版本保留备份。
- 前端：全仓 ESLint 无错误、无 lint 警告；既有文章编辑契约和写作工具测试通过。
- 真实浏览器：8 组流程全部通过、无 pageerror。实际上传七牛、在公开文章显示图片、引用时删除返回409、移除引用后真实删除、旧链接保存返回409。测试文章和七牛测试图片已清理，已有示例文章未修改。
- 分页：图片 limit=1 的第一页/第二页不同，分页总数一致，完整列表与总数相同，不展示内部删除标记。
- 布局：390px 手机、768px 平板和1440px桌面检查通过；手机/平板的图片管理和文章管理页面无文档横向溢出，文章表格保留自身横向滚动。
- 既有本地功能验收 `LOCAL_FUNCTIONAL_ONLY=1` 通过，覆盖登录、文章及分类标签/链接 CRUD、草稿隔离、并发阅读计数、注销撤销会话。未执行本轮性能基准。
- 补充尝试完整 Vue 类型检查时，临时 vue-tsc 与 TypeScript 依赖组合报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，未获得完整 Vue 类型检查结论；不将生产构建成功等同于完整类型检查通过。

结构化结果与截图位于本地验收目录 `results/media-management.json`、`media-layout-pagination.json`、`media-references-desktop.png`、`posts-filter-desktop.png`、`media-management-mobile.png`、`posts-management-390.png`、`posts-management-768.png`。
