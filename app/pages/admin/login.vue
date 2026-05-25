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
            v-model="form.username"
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
  username: "",
  password: ""
})
const loading = ref(false)
const errorMsg = ref("")

async function handleLogin() {
  if (!form.username || !form.password) {
    errorMsg.value = "请输入账号和密码"
    return
  }

  loading.value = true
  errorMsg.value = ""

  try {
    const config = useRuntimeConfig()
    const res = await $fetch<{ code: number, data: { token: string }, message: string }>("/v1/login", {
      baseURL: config.public.apiBase,
      method: "POST",
      body: { username: form.username, password: form.password }
    })

    if (res.code === 200 && res.data?.token) {
      localStorage.setItem("admin_token", res.data.token)
      toast.add({ title: "登录成功", color: "green" })
      router.push("/admin/dashboard")
    } else {
      errorMsg.value = res.message || "登录失败"
    }
  } catch {
    errorMsg.value = "网络错误，请稍后重试"
  } finally {
    loading.value = false
  }
}
</script>
