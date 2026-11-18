# 前端 Git 提交与生产发布流程

本项目生产站点为 `https://sunrise1024.top`（apex 域名，不是 `blog.` 子域名）。
发布使用候选容器验证后切换正式容器，旧容器保留为回滚点。
运行环境文件只保留在服务器 `/home/docker/nuxt/.env`，不得提交到 Git。

> 脚本的完整用法、16 步流程、失败排查见 [`docs/deploy-usage.md`](deploy-usage.md)。
> **动手前先读那份文档的第二节**：它说明了脚本默认目标机与线上站点并不在同一台机器。

## 1. 提交前检查

在项目根目录执行：

```bash
pnpm exec eslint .
pnpm run build
git diff --check
git status --short
```

确认没有把 `.env`、构建产物或本地临时文件加入暂存区。

## 2. 构建并上传镜像

下面以一个唯一标签为例。生产主机为 x86_64，因此本机必须显式构建 `linux/amd64` 镜像。

日常发布直接使用仓库的发布脚本即可。它会完成版本递增、镜像构建、上传、候选容器检查和端口切换：

```bash
printf 'n\n' | bash deploy.sh
```

`printf 'n\n'` 用来回答脚本末尾的「是否推送版本更新到远程仓库?」——非交互环境里没有 stdin，
那个 `read` 会返回非零，而脚本开着 `set -e`，会让**部署成功却退出码为 1**。

### ⚠️ 脚本默认目标机 ≠ 线上站点

`deploy.sh` 顶部写死 `REMOTE_HOST="api.sunrise1024.top"`（= 122.51.231.16），
但线上站点在 **175.27.135.250** 上由 Caddy 反代到前端容器。直接跑脚本不会更新线上站点。

线上机器的访问方式（**必须带 `-p 22`**，否则本机 `~/.ssh/config` 会把它解析到 19002 端口的另一台 Mac）：

```bash
ssh root@sunrise1024.top -p 22
```

要让脚本直接发线上，把 `deploy.sh` 的 `REMOTE_HOST` 改成 `sunrise1024.top`，
并确认 SSH 走 22 端口。改之前先想清楚你要发哪一台。

## 3. 候选验收与切换

候选容器使用随机本地端口，先确认 SSR、健康检查和 RSS 均可用，再占用正式 `441` 端口。
以下命令用于排查脚本或需要手动执行时，目标是线上机器：

```bash
export RELEASE=0.0.28-$(date +%Y%m%d-%H%M%S)
docker build --platform linux/amd64 -t web_nuxt:$RELEASE .
docker save web_nuxt:$RELEASE -o web_nuxt.tar
scp "D:/project/user/blog/web_nuxt/web_nuxt.tar" root@sunrise1024.top:/home/docker/nuxt/
ssh root@sunrise1024.top -p 22 "docker load -i /home/docker/nuxt/web_nuxt.tar"
```

> 本机 scp 是 Windows OpenSSH，不认 `/d/project/...` 这类 MSYS 路径，要用 `D:/...` 写法。

候选验收（`webnet` 是 Caddy 所在网络，**不是**后端机器上的 `my_app_network`）：

```bash
ssh root@sunrise1024.top -p 22 "
  docker run -d --init --name web_nuxt-candidate-$RELEASE --restart no \
    --network webnet -p 127.0.0.1::3000 \
    --env-file /home/docker/nuxt/.env \
    web_nuxt:$RELEASE
  sleep 10
  CANDIDATE_PORT=\$(docker port web_nuxt-candidate-$RELEASE 3000/tcp | sed 's/.*://')
  curl --fail http://127.0.0.1:\$CANDIDATE_PORT/api/ready
  curl --fail http://127.0.0.1:\$CANDIDATE_PORT/rss.xml >/dev/null
  docker rm -f web_nuxt-candidate-$RELEASE || true
"
```

容器的实际启动参数（`docker inspect web_nuxt` 确认过）：

| 项 | 值 |
|---|---|
| 镜像 | `web_nuxt:<version>-<时间戳>` |
| Cmd | `node .output/server/index.mjs` |
| User | `nuxtjs` |
| Restart | `always` |
| 端口 | `3000/tcp → 441` |
| 网络 | `bridge` + `webnet` |
| 环境 | `--env-file /home/docker/nuxt/.env` |
| 卷 | 无 |

`NUXT_API_BASE` 由镜像自带，**不要**在命令行里手工指定成 `http://web-server:2345/api`——
线上那台机器上根本没有 `web-server` 容器，后端在另一台机器上（`https://api.sunrise1024.top`）。

候选验收通过后执行切换。上一版容器被重命名为 `web_nuxt-rollback-$RELEASE`，用于快速回退。

```bash
ssh root@sunrise1024.top -p 22 "
  docker stop web_nuxt
  docker rename web_nuxt web_nuxt-rollback-$RELEASE
  docker run -d --init --name web_nuxt --restart always \
    --network webnet -p 441:3000 \
    --env-file /home/docker/nuxt/.env \
    web_nuxt:$RELEASE
  sleep 10
  curl --fail http://127.0.0.1:441/api/ready
"
curl --fail https://sunrise1024.top/api/ready
curl --fail https://sunrise1024.top/rss.xml >/dev/null
```

> `--init` 必须加：否则容器被 SIGKILL 后残留僵尸进程，`docker rm -f` 会报
> `PID ... is zombie and can not be killed`，在 `set -e` 下直接中断部署。

若新容器未通过验证，停止并移走新的 `web_nuxt`，然后将回滚容器改回 `web_nuxt` 并启动。
回滚前应先记录失败日志：`docker logs web_nuxt --tail 200`。

```bash
ssh root@sunrise1024.top -p 22 "
  docker stop web_nuxt
  docker rm -f web_nuxt || true
  docker rename web_nuxt-rollback-$RELEASE web_nuxt
  docker start web_nuxt
"
```

## 4. Git 提交与推送

发布及线上验收完成后提交代码和本文档：

```bash
git add -A
git commit -m "feat: improve content discovery and publishing"
git push origin main
```

最后使用 `git status --short` 确认工作区干净，并记录镜像标签、提交哈希和验收结果。
