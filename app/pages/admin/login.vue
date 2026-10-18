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
  if (loading.value) return
  if (!form.account || !form.password) {
    errorMsg.value = "请输入账号和密码"
    return
  }

  loading.value = true
  errorMsg.value = ""

  try {
    const user = await loginAdmin(form)
    toast.add({ title: `欢迎回来，${user.user_name}`, color: "success" })
    await router.push("/admin/dashboard")
  } catch (error: unknown) {
    errorMsg.value = loginErrorMessage(error)
  } finally {
    loading.value = false
  }
}
</script>
