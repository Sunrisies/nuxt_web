// middleware/404.ts
export default defineNuxtRouteMiddleware((to) => {
  const router = useRouter()

  // 检查路由是否存在
  const routeExists = router.getRoutes().some((route) => {
    // 处理动态路由匹配
    if (route.path.includes(":") || route.path.includes("*")) {
      const pathRegex = new RegExp("^" + route.path.replace(/:(\w+)/g, "([^/]+)").replace(/\*/g, ".*") + "$")
      return pathRegex.test(to.path)
    }
    return route.path === to.path
  })

  // 如果路由不存在且不是要重定向的路径
  if (!routeExists && to.path !== "/404") {
    // 设置状态码
    const nuxtApp = useNuxtApp()
    if (process.server) {
      const event = useRequestEvent()
      if (event) {
        event.node.res.statusCode = 404
      }
    }

    // 导航到 404 页面（保持布局）
    return navigateTo({
      path: "/404",
      query: { from: to.path }
    })
  }
})
