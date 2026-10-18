FROM node:24-alpine AS builder
WORKDIR /app
# Nitro bundles the server graph during the production build. Its default
# 2 GiB Node heap is insufficient for this application under Linux/amd64.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm install --global pnpm@12.6.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nuxtjs
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_API_BASE=${NUXT_PUBLIC_API_BASE:-https://api.sunrise1024.top/api}
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER nuxtjs
CMD ["node", ".output/server/index.mjs"]
