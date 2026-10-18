# 文章写作与发布流程验收（2026-10-17）

结论：本地端到端流程已通过。原先有新建文章弹窗和接口，但缺少图片上传/插入/预览、必填提示和保存反馈；此前验收只覆盖部分编辑和接口调用，不等于完整写作流程通过。

## 现在的使用方式

登录 http://127.0.0.1:39158/admin/posts → 新建文章 → 输入标题和Markdown正文 → 选择已有分类、标签（也可在表单里新建，创建后自动选中）→ 插入正文图片/上传封面 → 预览 → 保存草稿或发布文章 → 点击“查看文章”。无需手动填写HTML，高级区域保留旧文章HTML编辑兼容。

草稿和下线文章不在公开文章接口显示；发布后无需重新构建前端。本地示例已保留：

http://127.0.0.1:39158/article/c3492c3b-1a67-4bb6-b6b9-2146716785f0

## 主要修复

- 新增正文/封面文件选择、上传进度状态、Markdown光标位置插图、内容预览。
- 必填分类/至少一个标签、空标题/正文、摘要长度、图片地址等给出可见错误。
- 提供保存草稿、发布、编辑保存、下线后的明确反馈；保存失败保留编辑内容。只有明确成功后关闭编辑器。
- 保留旧HTML与Markdown分离、隐藏状态及编辑时原文读取；修复纯Markdown文章大小为0及草稿发布时未刷新发布时间。
- 本地图片存储为显式opt-in，七牛方式保留；本地真实图片通过Rust上传、入库、转换WebP并公开读取，未用假成功接口替代。
- 发现并修复Nuxt Image将API图片错误改写成/_ipx/...导致404的问题；自定义provider仅对规范的本地上传图片直出，静态图仍使用IPX，保留UI图片组件。

## 浏览器验收

真实Chrome、真实Rust release与PostgreSQL，未mock正常上传/保存/发布。以下 14 项通过：

- unauthorizedUploadBlocked
- requiredFieldsVisible
- inlineCategoryAndTag
- invalidImageRejected
- uploadAndPreview
- injectedSaveFailurePreservesInput
- draftHidden
- publishedVisibleAnonymously
- backendMetadataAndMarkdown
- editInvalidatesPublicCache
- mobileEditorNoOverflow
- unpublishInvalidatesPublicCache
- republish
- imagePubliclyReadable

另外通过：选择已有分类/标签的真实下拉操作、保存草稿后清理临时文章、手机390px和PC编辑器查看。浏览器pageerror为0。正文图片和封面实际可解码显示，读取为image/webp且nosniff。

“保存失败保留输入”一项明确注入503，用于验证错误分支；其他正常流程使用真实后端。超10MiB上传另行真实请求后端，返回413。图片内容伪装PNG返回415，未登录上传返回401。

旧管理功能浏览器回归通过：6个后台页面、文章编辑/删除与HTML/Markdown保留、分类CRUD、注销；pageerror和hydration错误均0。

## 代码与构建验证

- 后端43项测试通过（含纯Markdown草稿发布与时间/大小、图片内容校验和文件名约束）；release编译成功。
- 前端构建成功，ESLint零警告；server TypeScript通过（没有声称完整Vue类型检查）。
- 原有编辑/会话/分页合同测试通过。
- SSR/API 14组回归通过；新增表单/图片地址/Markdown插入/图片provider回归通过。
- 此次是功能验收，没有重新做容量压测或Lighthouse，不将以前性能分数视为本版新测结果。

## 本地环境及范围

前端39158，后端39157，监测39160，专用server_acceptance数据库。已替换本地生产构建副本；旧frontend-before-authoring和web-server-before-authoring备份保留。

当前IMAGE_STORAGE_PROVIDER=local；LOCAL_IMAGE_DIR位于本地验收目录data/article-images，已持久保留示例文章的两张图片。失败预览探针产生的自有临时图片/分类/标签已清理，成功示例保留。

真实七牛上传未验收，线上未部署。媒体URL为公开资源；未实现私有附件权限、完整素材库管理、自动保存或WYSIWYG富文本编辑器。后端现有媒体库存根不作为已完成功能。

## 复现与证据

源码：app/pages/admin/posts/index.vue、app/utils/article-editor.ts、app/providers/article-images.ts；后端src/services/local_images.rs与图片上传/文章服务。

`node scripts/test-article-authoring.mjs` 运行新增纯逻辑回归。
`node scripts/test-article-authoring-browser.cjs` 使用本地验收环境（含Playwright Core、Chrome、.env和测试图片），会创建并保留专用验收示例；拒绝非本机后端或非专用库。

原始结果在本地验收目录：results/article-authoring.json、article-authoring-options.json、article-upload-limit.json、browser-authoring-regression.json；截图article-authoring-editor-mobile.png、article-authoring-editor-desktop.png、article-authoring-published.png。
