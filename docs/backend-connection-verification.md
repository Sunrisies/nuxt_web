# 真实后端连接修复与联调

## 原因与处理

后端本身可用。故障出现在本机全局 TUN 代理链路：Clash 处于 global 模式，本机域名解析使用 fake-IP，普通 HTTPS 请求在 TLS 握手完成前断开。两家公共 DNS 查询到的 API 地址均为 `122.51.231.16`；使用该地址并绑定本机 Wi-Fi 接口后，TLS 正常校验，真实 API 返回 200。

本次没有修改 Clash 模式、节点、系统路由或系统 DNS，也没有关闭证书校验。新增仅供 Nuxt 后端请求使用的可选连接池配置：

- `NUXT_API_RESOLVE_ADDRESS`：覆盖指定后端域名的连接地址，保留 URL 域名、TLS SNI 与证书校验。
- `NUXT_API_NETWORK_INTERFACE`：从指定本地网卡获取当前源地址。读取的是当前地址，不将 DHCP 分配的本机 IP 固定写入代码。

本机 `.env` 已设置真实服务器地址与 `en0`。这些设置是当前本机网络环境的适配，默认均为空；不要复制到其他机器或容器。API 地址发生变化时，应重新查询可信 DNS 并更新配置；网络恢复正常后可以删除这两项。示例与说明放在 `.env.example`，实际 `.env` 不进入 Git 或 Docker 构建。

`server/utils/backend-network.ts` 只为后端 `$fetch` 与透传代理提供连接池，不改全局 dispatcher。该功能使用明确声明并锁定的 Undici 依赖，未改动现有框架版本。连接池在网卡地址/目标变化后关闭并重建，关闭配置后回到默认网络路径。

连接参数依据 [Undici Client 文档](https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md)与[连接器文档](https://github.com/nodejs/undici/blob/main/docs/docs/api/Connector.md)实现；本次同时用原生 HTTPS 与 Undici 做了连接对比。

## 实际数据契约

- 文章列表：`data` 是包含 `data` 和 `pagination` 的对象，符合前端使用方式。真实文章总数为 96。
- 标签统计：`data` 是数组；当前返回 59 个标签。
- 分类：`data` 是分页包装对象。
- 文章详情及 Markdown AST 已验证，选定真实文章解析为 37 个根节点。
- 文档中的 `/v1/posts/:uuid/prevnext` 在当前后端返回 404。代码已在专用接口缺失时使用共享的完整文章摘要缓存查找相邻项，且只返回 UUID/标题；其他接口故障不再触发全量查询。回退等待有上限，后台缓存更新不再在响应结束后写 `Server-Timing`。

## 验证结果

在临时生产进程中使用真实后端验证，以下响应均为 200：

| 路径 | 验证结果 |
| --- | --- |
| `/api/ready` | 后端和文章列表契约正常 |
| `/` | HTML 包含 12 篇真实文章链接 |
| `/api/public/articles/:uuid` | 正文 AST 正常，上下篇回退得到下一篇 |
| `/article/:uuid` | 真实正文 SSR 正常 |
| `/blog/1` | 真实分页列表正常 |
| `/archives` | 真实归档正常 |
| `/timeline` | 真实时间轴正常 |
| `/api/__sitemap__/urls` | 包含全部 96 篇文章 URL |

开发服务 `http://localhost:3000` 的就绪检查、同源 API 和首页也恢复为 200；真实 `/tag/rust` 已验证为 200。

生产构建、本次改动文件 ESLint、服务端 TypeScript 检查与 `git diff --check` 通过。受控回归测试增加了不能用系统 DNS 解析的虚拟后端域名和 loopback 网卡，验证项目级 DNS/源地址覆盖；同时验证了专用上下篇接口缺失时的缓存回退。原有 SSR、404、缓存、写入失效、认证/请求体透传、525 篇归档与 sitemap 等回归仍通过。

本次只对真实后端执行公开读取，没有提交、编辑或删除真实文章，也没有使用真实账号进行后台和剪贴板的写入验收。真实认证/写操作仍需有账号的操作人员验收；线上部署尚未执行。
