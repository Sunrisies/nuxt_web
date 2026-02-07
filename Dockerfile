# 使用 Node.js 官方镜像作为基础镜像
FROM node:24-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果存在)
COPY package*.json ./

# 安装依赖
RUN npm i

# 复制项目文件
COPY . .

# 设置环境变量
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE:-https://api.sunrise1024.top/api}

# 构建应用
RUN npm run build

# 生产环境阶段
FROM node:22_alpine AS runner

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

# 复制构建产物
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output
COPY --from=builder --chown=nuxtjs:nodejs /app/package.json ./package.json

# 设置环境变量
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE:-https://api.sunrise1024.top/api}
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# 暴露端口
EXPOSE 3000

# 切换到非root用户
USER nuxtjs

# 启动应用
CMD ["node", ".output/server/index.mjs"]
