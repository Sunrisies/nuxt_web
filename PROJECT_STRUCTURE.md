# 项目结构

```
web_nuxt/
├── .data/
├── .vscode/
├── app/
│   ├── app.vue                      # 应用入口
│   ├── error.vue                    # 错误页面
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.css             # 全局样式
│   │   │   └── tailwind.css         # Tailwind 配置
│   │   └── icons/
│   │       └── github.svg           # 自定义图标
│   ├── components/
│   │   ├── about/
│   │   │   ├── ChaoYangProfile.vue  # 朝阳简介
│   │   │   ├── CodeFarmerNotes.vue  # 码农笔记
│   │   │   ├── ContactSection.vue   # 联系方式
│   │   │   └── SkillsSection.vue    # 技能展示
│   │   ├── article/
│   │   │   └── Toc.vue              # 文章目录
│   │   ├── blog/
│   │   │   └── BlogDetail.vue       # 博客详情
│   │   ├── content/
│   │   │   └── ProsePre.vue         # 代码块渲染
│   │   ├── home/
│   │   │   ├── BlogPostCard.vue     # 博客卡片
│   │   │   ├── ProfileCard.vue      # 个人卡片
│   │   │   ├── RecentPostsList.vue  # 最新文章列表
│   │   │   ├── SentencesCarousel.vue# 名言轮播
│   │   │   └── TagCloud.vue         # 标签云
│   │   ├── timeline/
│   │   │   └── CalendarHeatmap.vue  # 日历热力图
│   │   ├── AppFooter.vue            # 页脚
│   │   ├── AppHeader.vue            # 页头
│   │   ├── Avatar.vue               # 头像
│   │   ├── ScrollProgressBar.vue    # 滚动进度条
│   │   ├── ScrollToTopButton.vue    # 回到顶部
│   │   └── ThemeToggle.vue          # 主题切换
│   ├── composables/
│   │   └── http.ts                  # HTTP 请求封装
│   ├── layouts/
│   │   └── default.vue              # 默认布局
│   ├── pages/
│   │   ├── article/
│   │   │   └── [slug].vue           # 文章详情页
│   │   ├── blog/
│   │   │   └── [slug].vue           # 博客详情页
│   │   ├── tag/
│   │   │   └── [slug].vue           # 标签页
│   │   ├── about.server.vue         # 关于页面
│   │   ├── index.server.vue         # 首页
│   │   ├── navigationBar.vue        # 导航栏页
│   │   └── timeline.vue             # 时间线页
│   ├── types/
│   │   ├── article.ts               # 文章类型定义
│   │   └── blog.ts                  # 博客类型定义
│   └── utils/
│       ├── data.ts                  # 数据工具
│       └── services/                # 服务层
├── mocks/
│   └── navigationBar.json           # 导航栏 mock 数据
├── public/
│   ├── blog.png
│   ├── blog.webp
│   ├── CascadiaCode.woff2           # 自定义字体
│   ├── favicon.ico
│   └── robots.txt
├── server/
│   └── api/
│       └── navigationBar.ts         # 导航栏 API
├── .dockerignore
├── .env                              # 环境变量
├── .gitignore
├── deploy.sh                         # 部署脚本
├── Dockerfile                        # Docker 配置
├── eslint.config.mjs                 # ESLint 配置
├── nuxt.config.ts                    # Nuxt 配置
├── package.json
├── bun.lock
├── tailwind.config.ts                # Tailwind 配置
└── tsconfig.json                     # TypeScript 配置
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Nuxt 4 |
| UI 库 | @nuxt/ui v4 |
| 样式 | Tailwind CSS v4 |
| 内容 | @nuxt/content v3 |
| 语言 | TypeScript |
| 包管理 | Bun |
| 部署 | Docker |

## 路由说明

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | `index.server.vue` | 首页（SSR） |
| `/about` | `about.server.vue` | 关于页面（SSR） |
| `/article/:slug` | `article/[slug].vue` | 文章详情 |
| `/blog/:slug` | `blog/[slug].vue` | 博客详情 |
| `/tag/:slug` | `tag/[slug].vue` | 标签筛选 |
| `/timeline` | `timeline.vue` | 时间线 |
