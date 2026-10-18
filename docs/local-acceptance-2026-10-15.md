# 本地部署与验收报告 · 2026-10-15

## 结论

核心博客与管理流程通过本地验收，原先浏览量并发 500、密码登录缺少应用层限流的问题已修复；验收中新发现的文章按钮参数、分页重复、前后篇字段映射、SSR 动画内存保留也已修复。

功能和本轮稳定性验证通过，性能仍有明确优化项：默认移动端 Lighthouse 为 **76 分、LCP 4.7 秒**；60 并发短时阶段的 P99 约 **5 秒**。不能据此宣布高并发或线上性能全面达标。

## 本地部署

- 前端：[http://127.0.0.1:39158](http://127.0.0.1:39158)，Nuxt 生产 node-server 运行包副本。
- 后端：127.0.0.1:39157，Rust release（opt-level=3、LTO、单 codegen unit）。最终提交 `a43ad07`，仅本地提交，未推送。
- PostgreSQL 17 Alpine：Docker 容器 `nuxt-local-postgres`，仅映射 127.0.0.1:55439，持久卷 `nuxt-local-acceptance-pg`。
- 验收库 `server_acceptance`，自动化可重建库 `server_acceptance_test`，相互隔离；525 篇样本文章。
- 应用仅监听回环地址；没有部署线上、轮换线上密钥或写生产数据。
- 环境：macOS ARM64、8 CPU、24 GiB RAM、Node 24.18.0、Rust 1.97.1、Chrome 155。工作站存在其他后台任务。
- 运行配置 `NODE_OPTIONS=--max-old-space-size=512` 限制 V8 旧生代堆，不是进程总内存硬限制。

部署目录：[local-acceptance](/Users/zhuzhongqian/Desktop/project/local-acceptance)。管理员 `local_admin`，密码保存在该目录权限为 600 的 `.env`，未写入报告。启动、停止、复跑命令见 [README](/Users/zhuzhongqian/Desktop/project/local-acceptance/README.md)。

## 已完成修复

1. 浏览量使用唯一约束的冲突忽略与数据库事务，重复访问成功但不重复计数，计数失败回滚访问记录；兼容无级联外键的文章删除。
2. 密码/邮箱验证码登录验证按 IP 和账号使用数据库原子限额，窗口 5 分钟，IP 30 次、账号 10 次，429 带 Retry-After；重启和多 worker 共享计数。密码验证移到阻塞线程池。
3. Nuxt 覆盖外来转发头；Rust 只信任显式代理 IP，并从右侧取非可信代理地址，防止伪造客户端 IP。
4. 文章表格编辑/删除使用原始文章数据；中文表头、空状态和删除按钮属性适配现有 Nuxt UI。
5. 列表和前后篇使用时间加 ID 的稳定顺序；前端兼容后端 `prevArticle/nextArticle` 字段。525 条文章跨页唯一数为 525。
6. 时间线/标签页移除服务端 scroll/spring 动画订阅，保留原卡片和浏览器滚动进度、加载更多。创建文章时不再输出正文调试日志。

## 功能与回归

- **36 项后端测试通过**，包含真实 PostgreSQL 下的并发计数、失败回滚、浏览后删除和相同时间戳分页。
- **14 组 SSR/API 回归通过**；前端构建、ESLint 零 warning、服务端 TypeScript 检查、交互契约回归通过。未声称做过完整 Vue 应用类型检查。
- 浏览器真实输入密码登录，访问 6 个管理页，实际编辑/保存/删除文章并验证 HTML/Markdown 不串字段，完成分类新增/编辑/删除和退出登录。
- 标签页和时间线在桌面、手机尺寸下共 **4 项检查**：100 条加载到 200 条、无重复、无横向溢出，滚动指示器正常。
- 桌面与移动端共 **12 个性能样本**，运行错误 0，水合错误 0。
- 同 IP：5 轮各 40 并发，200 次全部成功，计数仅加 1。模拟可信代理传入 200 个不同测试 IP，也全部成功，最终计数 201，没有丢增量。
- 40 次同账号无效登录：10 次进入验证、30 次 429。最终重启后限流仍为 429；已注销 Cookie 重启后仍为 401。
- 另外用 40 个不同账号伪造 40 个转发 IP，仍只有 30 次进入验证、10 次 429，确认伪造请求头不能绕过 IP 限额。
- 最后补测确认草稿正文不进入日志。验收结束仅清理本地测试限流计数，方便人工登录；健康与就绪接口均为 200。

## 压力测试

生产运行包，单 Node 实例，轮询首页、博客、标签、时间线、归档、文章和摘要 API。各档 8 秒，随后 30 并发持续 120 秒。共 **12,589 次读请求，失败 0 次**；另有上述 400 次浏览写入和 CRUD 验收。

| 阶段 | 并发 | 时长 | 请求数 | 次/秒 | P95 | P99 | 失败 | 前端 RSS 快照 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 阶梯 | 1 | 8 s | 548 | 68.5 | 26 ms | 29 ms | 0 | 350.1 MiB |
| 阶梯 | 10 | 8.05 s | 640 | 79.5 | 188 ms | 205 ms | 0 | 429.5 MiB |
| 阶梯 | 30 | 8.21 s | 674 | 82.1 | 537 ms | 1451 ms | 0 | 432.9 MiB |
| 阶梯 | 60 | 8.34 s | 707 | 84.7 | 1018 ms | 5032 ms | 0 | 443.1 MiB |
| 持续 | 30 | 120.22 s | 10,020 | 83.3 | 524 ms | 548 ms | 0 | 444.5 MiB |

这些是同机客户端、服务端与容器数据库的端到端观测，不是线上容量上限。60 并发短时阶段出现明显尾延迟，需要后续单独剖析；2 分钟持续阶段不足以证明长期无泄漏。

## SSR 内存故障与重测

- 原实现默认堆：60 秒持续负载后前端 RSS 约 3,031 MiB。
- 原实现限制 512 MB 堆：约 58 秒后因内存溢出退出，该轮判定失败。
- 路由逐一重复 150 次并强制 GC：时间线和标签页存活对象持续增加；仅关闭该组件服务端 scroll/spring 路径后，最终存活堆从约 215 MB 降到 57 MB。该对照用于定位问题，不作为发布产物；最终产物由源码重新构建。
- 源码修复后，同样 512 MB 堆预算下，持续阶段延长至 120 秒，前端 RSS 约 445 MiB，没有再次复现 OOM。移除正文日志后的最终版本又补测了登录、CRUD、重启与日志检查；压测主体使用 `a922974`，最终 `a43ad07` 仅额外删除正文日志。
- 时间线/标签页 HTML 直接引用的 JS gzip 总量约从 260.6/260.5 KiB 降到 217.3/217.2 KiB。不是完整网络传输量。

## 本地生产构建性能

Lighthouse 13.5.0，首页，单次实验室测试，浏览器与压力测试分开执行：

| 模式 | 性能分 | LCP | TBT | CLS |
|---|---:|---:|---:|---:|
| 桌面 | 99 | 0.9 s | 0 ms | 0 |
| 默认移动端模拟 | 76 | 4.7 s | 100 ms | 0.001 |

[桌面 Lighthouse HTML](/Users/zhuzhongqian/Desktop/project/local-acceptance/results/lighthouse-desktop.report.html) · [移动端 Lighthouse HTML](/Users/zhuzhongqian/Desktop/project/local-acceptance/results/lighthouse-mobile.report.html)

移动端报告中，全局 Cascadia Code 字体约 219 KB，是最大单项资源；首屏 JS 也仍有负担。建议优先优化全局字体加载、首屏资源和高并发尾延迟。

另用 DevTools 模拟 4 倍 CPU 降速、150 ms 网络延迟、约 1.6 Mbps 下行，首页/文章各 3 次，LCP 约 1.12–1.14 秒。其方法与 Lighthouse 默认模拟不同，不合并为“移动端达标”。交互样本不等同于真实用户 INP，未采集线上 P75。

## 范围与产物

本次是本机原生应用加容器数据库验收。没有进行 Linux 应用镜像验收、真实 SMTP/对象存储联调、真实移动设备或长时间生产压测。剪贴板和房间未进行完整多客户端验收。

原始结果：[HTTP 与压测 JSON](/Users/zhuzhongqian/Desktop/project/local-acceptance/results/http-and-load.json)、[浏览器 JSON](/Users/zhuzhongqian/Desktop/project/local-acceptance/results/browser.json)、[最终重启与日志检查](/Users/zhuzhongqian/Desktop/project/local-acceptance/results/final-smoke.json)。本目录保留对照失败日志和最终通过日志，不能把失败基线当作当前版本通过。
