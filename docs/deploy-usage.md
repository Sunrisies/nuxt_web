# 前端发布脚本使用文档（deploy.sh）

本文档描述 `deploy.sh` 的实际用法、执行流程与回滚方式。
流程性说明另见 `docs/git-and-production-release.md`。

## 一、这个脚本做什么

本机构建 x86_64 镜像 → 传到生产机 → 候选容器验收 → 切换正式容器：

```
版本号 patch+1 → docker build --platform linux/amd64 → docker save → scp
  → 远端 docker load → 候选容器（临时端口）验收 /api/ready → 切换 441 → 健康检查
```

- 项目名 / 镜像名 / 容器名都取自 `package.json` 的 `name`（当前为 `web_nuxt`）
- 版本标签：`<package.json version>-<构建时间戳>`，例如 `0.0.28-20261117170044`
- 正式容器名 `web_nuxt`，宿主端口 `441`

## 二、⚠️ 先读这一节：当前脚本的目标机器

脚本顶部写死：

```bash
REMOTE_HOST="api.sunrise1024.top"      # = 122.51.231.16（后端那台）
REMOTE_DIR="/home/docker/nuxt"
PORT_MAPPING="441:3000"
```

但**线上站点 `https://sunrise1024.top` 不在那台机器上**。当前真实拓扑是：

```
sunrise1024.top → 175.27.135.250（腾讯云 Ubuntu VM-0-15-ubuntu）
                     └─ caddy 容器（80/443，NetworkMode=webnet）
                          └─ reverse_proxy web_nuxt:3000   ← 线上前端
                     └─ web_nuxt 容器 0.0.0.0:441->3000/tcp（默认 bridge，已额外接入 webnet）
```

也就是说：

- **直接 `bash deploy.sh` 会把新版本发到 122.51.231.16**，线上站点不会变。
- 线上前端要发到 `175.27.135.250`，访问方式是
  `ssh root@sunrise1024.top -p 22`
  （**必须带 `-p 22`**：本机 `~/.ssh/config` 里 `Host sunrise1024.top` 默认指向 19002，会连到另一台 Mac）。

改 `REMOTE_HOST` 之前请先确认你到底要发哪台。两种机器的区别：

| | 122.51.231.16（api.sunrise1024.top） | 175.27.135.250（线上前端） |
|---|---|---|
| 端口 441 | 有容器 | 有容器（Caddy 反代的那台） |
| 谁在用 | 后端 API `web-server:22345` | `https://sunrise1024.top` |
| 本脚本默认 | ✅ 默认目标 | 需改 `REMOTE_HOST` |

## 三、前置条件

| 项 | 说明 |
|---|---|
| 本机 Docker | `docker build` / `docker save` 都在本机，**且 Kiri 引擎必须已启动** |
| 本机 node + pnpm | 读 `package.json`、生成版本信息 |
| 本机 git | 记录 `gitHash` / `gitBranch`；部署后自动提交版本号 |
| SSH 免密 | 脚本 `scp` + `ssh root@$REMOTE_HOST` |
| 远端 `/home/docker/nuxt/.env` | 运行时环境变量（`NUXT_PUBLIC_API_BASE` 等），不进仓库 |
| `NUXT_PUBLIC_API_BASE` | 构建参数，默认 `https://api.sunrise1024.top/api` |

## 四、用法

日常发布：

```bash
cd /d/project/user/blog/web_nuxt
printf 'n\n' | bash deploy.sh
```

`printf 'n\n'` 是给**最后一个交互提示**（`是否推送版本更新到远程仓库? (y/N)`）用的：
非交互环境里没有 stdin，这个 `read` 会返回非零，而脚本开着 `set -e`，
导致部署明明成功却退出码为 1。管道喂 `n` 表示"提交但不推送"，之后你自己 `git push`。

想让脚本自己推送就改成：

```bash
printf 'y\n' | bash deploy.sh
```

### 改构建时的 API 地址

```bash
NUXT_PUBLIC_API_BASE=https://api.sunrise1024.top/api printf 'n\n' | bash deploy.sh
```

（注意：变量赋值要放在命令前面，这样才会传给脚本里的
`NUXT_PUBLIC_API_BASE="${NUXT_PUBLIC_API_BASE:-...}"`）

### 无参数

直接 `bash deploy.sh` 也能跑，只是最后会停在推送提示上等你按键。

## 五、脚本执行的 16 个步骤

`main()` 顺序如下，任一步失败都会走 `trap handle_error ERR`：

| # | 步骤 | 说明 |
|---|---|---|
| 0 | `get_project_info` | 从 `package.json` 读 `name` / `version` |
| 0.1 | `backup_files` | 备份 `package.json`、`.output/version.json` 到 mktemp |
| 0.2 | `check_dockerfile` | 缺 Dockerfile → 恢复备份并退出 |
| 1 | `check_docker_environment` | 检查本机 docker 可用 |
| 2 | `update_version` | **patch 位 +1** 写回 `package.json`，生成 `BUILD_TIMESTAMP`，`NEW_VERSION=<ver>-<ts>` |
| 3 | `generate_version_info` | 写 `.output/version.json`（含 gitHash/gitBranch/apiBase） |
| 4 | `run_tests` | **已注释掉，不会执行** |
| 6 | `build_with_docker` | `docker build --platform linux/amd64 --build-arg NUXT_PUBLIC_API_BASE=...` |
| 7 | `save_docker_image` | `docker save` → `web_nuxt.tar`（仓库内相对路径） |
| 8 | `upload_to_remote` | `scp web_nuxt.tar root@$REMOTE_HOST:$REMOTE_DIR/` |
| 9 | `remote_deploy` | 远端 load、候选验收、切换（详见下节） |
| 10 | `cleanup_remote_images` | 清远端旧镜像 |
| 11 | `health_check` | 查 `/api/ready`，**不通过只告警不回滚** |
| 12 | `cleanup_old_local_images` | 本机保留最近 `KEEP_IMAGE_VERSIONS` 次（当前为 2） |
| 13-14 | `cleanup` / `cleanup_backup_files` | 删 tar、删 `.output`、删临时备份 |
| 15 | `commit_version_update` | `git commit -m "chore: bump version to X [deploy]"` + 推送提示 |
| 16 | `show_deploy_info` | 打印部署摘要 |

### 第 9 步远端细节

```
docker load
→ 起候选容器（--init，临时端口，--env-file .env）
→ wait_ready：最多轮询 30 次（每次 curl 最长 10s，间隔 1s），查 $HEALTH_CHECK_ENDPOINT（默认 /api/ready）
→ docker rm -f 候选容器（|| true，容错，见"常见问题 3"）
→ rollback 兜底：stop 旧 web_nuxt → 改名 web_nuxt-rollback-<旧版本> → run 新的 441:3000
→ 再次健康检查
```

失败时 `rollback()` 会把改名的旧容器改回来并重启，**线上不中断**。

## 六、验收

```bash
# 远端容器
ssh -p 22 root@sunrise1024.top "docker ps --filter name=web_nuxt"

# 应用本身
curl -s https://sunrise1024.top/api/ready        # {"status":"ready"}
curl -s -o /dev/null -w '%{http_code}\n' https://sunrise1024.top/
curl -s https://sunrise1024.top/rss.xml >/dev/null && echo RSS_OK
```

`docker ps` 里应看到新标签 `web_nuxt:<version>-<时间戳>` 且状态 `Up (healthy)`。

## 七、回滚

上一版被保留为 `web_nuxt-rollback-<旧版本>`：

```bash
ssh -p 22 root@sunrise1024.top '
  docker stop web_nuxt
  docker rm -f web_nuxt
  docker rename web_nuxt-rollback-0.0.22 web_nuxt
  docker start web_nuxt
  sleep 5
  curl -fsS http://127.0.0.1:441/api/ready
'
```

回滚前先留证据：`docker logs web_nuxt --tail 200`。
如果 `web_nuxt` 当时是被 `--init` 起的，容器被 SIGKILL 后可能出现僵尸，
`docker rm -f` 会报 `PID ... is zombie and can not be killed`——此时加 `|| true` 继续即可，
或用 `docker stop` + `docker rename` 代替强删。

## 八、常见问题

### 1. `gyp ERR! find Python` / `prebuild-install warn install Request timed out`

`better-sqlite3` 的预编译包默认从 GitHub 下载，pnpm 并发拉包时带宽被占满，
30 秒超时后会退回 node-gyp 源码编译，而 alpine 基础镜像没有 Python，安装必然失败。
`Dockerfile` 已内置改走 npmmirror：

```dockerfile
ENV npm_config_better_sqlite3_binary_host_mirror=https://registry.npmmirror.com/-/binary/better-sqlite3
```

实测境内直连 17 秒完成。**别删掉这一行**，也不要改成需要编译工具链的方案。

### 2. 构建时 `docker: npipe:////./pipe/kiri` 找不到

本机 Docker 引擎是 Kiri，没启动时 `docker build` 直接失败。启动 Kiri 后重跑。
另外**不要**因为构建慢就跳过这一步——镜像必须本机构建，
`--platform linux/amd64` 是给生产机（x86_64）用的。

### 3. 远端报 `container ... is zombie and can not be killed`

候选容器被 SIGKILL 后残留僵尸进程，`docker rm -f` 失败。脚本已做两处修复：

- 起容器时加 `--init`（容器内有 init 进程转发信号、回收僵尸）
- 清理处加 `|| true`（候选容器只是临时探针，清理失败不该中断部署）

若你在别处手工起容器遇到同样问题，同样加 `--init`。

### 4. 部署成功但退出码是 1

最后一个 `read -p` 在没有 stdin 时返回非零，而 `set -e` 会把它当失败。
按第四节用 `printf 'n\n' | bash deploy.sh` 即可。判断是否真的成功，
看日志里有没有 `健康检查通过` 和 `🚀 Nuxt 项目部署成功完成!`。

### 5. `scp: stat local "/d/project/..."`

Windows OpenSSH 的 scp 不认 MSYS 风格路径。脚本已改用仓库内相对路径
（`web_nuxt.tar`），手动操作时请同样用 Windows 风格路径：

```bash
scp "D:/project/user/blog/web_nuxt/web_nuxt.tar" root@host:/home/docker/nuxt/
```

### 6. 版本号每次都自己 +1，能不能固定？

不能，`update_version()` 固定按 patch 递增。若想保持某个版本号，
部署后手动把 `package.json` 改回去再提交即可（部署用的标签已带时间戳，不冲突）。

## 九、线上 Caddy 反代（改拓扑时才需要看）

Caddy 跑在 `175.27.135.250` 的容器里，配置文件**在宿主机**：

```
/home/docker/caddy/Caddyfile   → 容器 /etc/caddy/Caddyfile（bind mount）
```

相关片段：

```caddy
sunrise1024.top {
    reverse_proxy web_nuxt:3000
}
```

两个坑：

1. **Caddy 和 `web_nuxt` 必须同在网络**（现在都在 `webnet`）。
   Caddy 的 `127.0.0.1` 指容器自己，永远不是宿主机——早期配置写成
   `reverse_proxy 127.0.0.1:441` 就是全站 502 的原因。
2. **改 Caddyfile 别用 `sed -i`**：它会换 inode，而文件是 bind mount，
   容器里还是旧 inode，`caddy reload` 会提示 `config is unchanged`。
   正确做法是原地覆写（inode 不变）：

   ```bash
   sed 's#a#b#g' /home/docker/caddy/Caddyfile > /tmp/cf
   cat /tmp/cf > /home/docker/caddy/Caddyfile    # 必须用 > 覆写，不能 mv
   docker exec caddy caddy validate --config /etc/caddy/Caddyfile
   docker exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```

   若确实换了 inode，用 `docker restart caddy` 让 mount 重新建立。

## 十、相关文件

| 文件 | 作用 |
|---|---|
| `deploy.sh` | 发布主脚本 |
| `Dockerfile` | 多阶段构建，含 npmmirror 与 node 版本 |
| `.output/version.json` | 构建时生成的版本信息（临时） |
| `docs/git-and-production-release.md` | 提交与发布的完整流程 |
| `docs/backend-connection-verification.md` | 与后端连通性排查 |
