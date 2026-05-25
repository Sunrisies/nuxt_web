<template>
  <UModal v-model:open="model" title="管理后台登录">
    <template #body>
      <UForm :state="form" class="space-y-4" @submit="handleLogin">
        <UFormField label="账号" required>
          <UInput v-model="form.account" placeholder="请输入账号" class="w-full" />
        </UFormField>

        <UFormField label="密码" required>
          <UInput v-model="form.password" type="password" placeholder="请输入密码" class="w-full" />
        </UFormField>

        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" @click="model = false">取消</UButton>
        <UButton color="primary" :loading="loading" @click="handleLogin">登录</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ required: true })

const toast = useToast()
const router = useRouter()

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
    const res = await $fetch<any>("/api/v1/auth/login", {
      method: "POST",
      body: form
    })

    const code = res.code ?? res.status_code ?? res.status ?? 0
    const data = res.data ?? res

    if (code === 200 || code === 0) {
      const user = { id: data.id, uuid: data.uuid, user_name: data.user_name }
      localStorage.setItem("admin_user", JSON.stringify(user))
      toast.add({ title: `欢迎回来，${user.user_name}`, color: "green" })
      model.value = false
      router.push("/admin/dashboard")
    } else {
      errorMsg.value = res.message || res.msg || "登录失败"
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || "网络错误，请稍后重试"
  } finally {
    loading.value = false
  }
}

// 关闭弹窗时清空表单和错误
watch(model, (val) => {
  if (!val) {
    form.account = ""
    form.password = ""
    errorMsg.value = ""
  }
})
</script>
