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
const model = defineModel<boolean>("open", { required: true })

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
    model.value = false
    await router.push("/admin/dashboard")
  } catch (error: unknown) {
    errorMsg.value = loginErrorMessage(error)
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
