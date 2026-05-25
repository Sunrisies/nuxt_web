export default defineNuxtRouteMiddleware((to) => {
  // 登录页不需要鉴权
  if (to.path === "/admin/login") {
    return
  }

  // 客户端环境检查 token
  if (import.meta.client) {
    const token = localStorage.getItem("admin_token")
    if (!token) {
      return navigateTo("/admin/login")
    }
  }
})
