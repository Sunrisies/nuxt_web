<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-900">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold">管理后台</h1>
          <p class="mt-1 text-sm text-gray-500">请登录以继续</p>
        </div>
      </template>

      <UForm :state="form" class="space-y-4" @submit="handleLogin">
        <UFormField label="账号" required>
          <UInput
            v-model="form.account"
            placeholder="请输入账号"
            class="w-full"
          />
        </UFormField>

        <UFormField label="密码" required>
          <UInput
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="loading"
        >
          登录
        </UButton>
      </UForm>

      <p v-if="errorMsg" class="mt-4 text-center text-sm text-red-500">
        {{ errorMsg }}
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const router = useRouter()
const toast = useToast()

const form = reactive({
  account: "",
  password: "",
  login_type: "password" as const
})
const loading = ref(false)
const errorMsg = ref("")

async function handleLogin() {
  if (!form.account || !form.password) {
    errorMsg.value = "请输入账号和密码"
    return
  }

  loading.value = true
  errorMsg.value = ""

  try {
    // 走 Nuxt 服务端代理（/api/v1/* → api.sunrise1024.top/api/v1/*），避免浏览器跨域
    const res = await $fetch<any>("/api/v1/auth/login", {
      method: "POST",
      body: form
    })

    console.log("登录响应:", res)

    // 兼容多种响应格式
    const code = res.code ?? res.status_code ?? res.status ?? 0
    const data = res.data ?? res
    const message = res.message ?? res.msg ?? ""

    if (code === 200 || code === 0) {
      // 后端用 Cookie/Session 鉴权，无 token；存储用户信息用于前端判断登录状态
      const user = { id: data.id, uuid: data.uuid, user_name: data.user_name }
      localStorage.setItem("admin_user", JSON.stringify(user))
      toast.add({ title: `欢迎回来，${user.user_name}`, color: "green" })
      router.push("/admin/dashboard")
    } else {
      errorMsg.value = message || "登录失败"
    }
  } catch (e: any) {
    console.error("登录错误:", e)
    errorMsg.value = e?.data?.message || e?.message || "网络错误，请稍后重试"
  } finally {
    loading.value = false
  }
}
</script>
