export default defineNuxtRouteMiddleware((to) => {
  // 登录页不需要鉴权
  if (to.path === "/admin/login" || to.path === "/admin") {
    return
  }

  // 客户端环境检查登录状态（后端用 Cookie/Session 鉴权）
  if (import.meta.client) {
    const user = localStorage.getItem("admin_user")
    if (!user) {
      return navigateTo("/admin/login")
    }
  }
})
