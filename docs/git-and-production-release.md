# 前端 Git 提交与生产发布流程

本项目生产站点为 `https://blog.sunrise1024.top`。发布使用候选容器验证后切换正式容器，旧容器保留为回滚点。运行环境文件只保留在服务器 `/home/docker/nuxt/.env`，不得提交到 Git。

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

日常发布直接使用仓库的发布脚本即可。它会完成版本递增、镜像构建、上传、候选容器检查和端口切换；脚本连接的生产主机为 `api.sunrise1024.top`。

```bash
printf 'n\n' | bash deploy.sh
```

以下命令用于排查脚本或需要手动执行时：

```bash
export RELEASE=0.0.22-$(date +%Y%m%d-%H%M%S)
docker build --platform linux/amd64 -t web_nuxt:$RELEASE .
docker save web_nuxt:$RELEASE | gzip -1 > /tmp/web_nuxt-$RELEASE.tar.gz
scp /tmp/web_nuxt-$RELEASE.tar.gz root@api.sunrise1024.top:/home/docker/nuxt/
ssh root@api.sunrise1024.top "gzip -dc /home/docker/nuxt/web_nuxt-$RELEASE.tar.gz | docker load"
```

## 3. 候选验收与切换

候选容器使用随机本地端口，先确认 SSR、健康检查和 RSS 均可用，再占用正式 `441` 端口。

```bash
ssh root@api.sunrise1024.top "
  docker run -d --name web_nuxt-candidate-$RELEASE --restart no \\
    --network my_app_network -p 127.0.0.1::3000 \\
    --env-file /home/docker/nuxt/.env \\
    -e NODE_ENV=production -e NITRO_HOST=0.0.0.0 -e NITRO_PORT=3000 \\
    -e NUXT_API_BASE=http://web-server:2345/api \\
    web_nuxt:$RELEASE
  sleep 10
  CANDIDATE_PORT=\$(docker port web_nuxt-candidate-$RELEASE 3000/tcp | sed 's/.*://')
  curl --fail http://127.0.0.1:\$CANDIDATE_PORT/api/ready
  curl --fail http://127.0.0.1:\$CANDIDATE_PORT/rss.xml >/dev/null
"
```

候选验收通过后执行切换。上一版容器被重命名为 `web_nuxt-rollback-$RELEASE`，用于快速回退。

```bash
ssh root@api.sunrise1024.top "
  docker stop web_nuxt
  docker rename web_nuxt web_nuxt-rollback-$RELEASE
  docker run -d --name web_nuxt --restart always --network my_app_network \\
    -p 441:3000 --env-file /home/docker/nuxt/.env \\
    -e NODE_ENV=production -e NITRO_HOST=0.0.0.0 -e NITRO_PORT=3000 \\
    -e NUXT_API_BASE=http://web-server:2345/api \\
    web_nuxt:$RELEASE
  sleep 10
  curl --fail http://127.0.0.1:441/api/ready
"
curl --fail https://blog.sunrise1024.top/api/ready
curl --fail https://blog.sunrise1024.top/rss.xml >/dev/null
```

若新容器未通过验证，停止并移走新的 `web_nuxt`，然后将回滚容器改回 `web_nuxt` 并启动。回滚前应先记录失败日志：`docker logs web_nuxt`。

## 4. Git 提交与推送

发布及线上验收完成后提交代码和本文档：

```bash
git add -A
git commit -m "feat: improve content discovery and publishing"
git push origin main
```

最后使用 `git status --short` 确认工作区干净，并记录镜像标签、提交哈希和验收结果。
