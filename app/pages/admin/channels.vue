<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold">频道管理</h1>
      <p class="text-sm text-gray-500 mt-1">创建剪贴板频道，用户通过频道名+密码访问</p>
    </div>

    <UCard class="max-w-lg">
      <template #header>
        <h2 class="text-lg font-semibold">新建频道</h2>
      </template>

      <UForm :state="form" class="space-y-4" @submit="save">
        <UFormField label="频道名称" required>
          <UInput v-model="form.name" placeholder="如：技术分享" class="w-full" />
        </UFormField>
        <UFormField label="密码" required>
          <UInput v-model="form.password" type="password" placeholder="访问密码" class="w-full" />
        </UFormField>

        <p v-if="successMsg" class="text-sm text-green-500">{{ successMsg }}</p>
        <p v-if="errorMsg" class="text-sm text-red-500">{{ errorMsg }}</p>

        <UButton type="submit" color="primary" :loading="saving" block>创建频道</UButton>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "admin-auth" })
import { http } from "~/composables/http"

const form = reactive({ name: "", password: "" })
const saving = ref(false)
const successMsg = ref("")
const errorMsg = ref("")

async function save() {
  if (!form.name || !form.password) { errorMsg.value = "请填写完整"; return }
  saving.value = true; successMsg.value = ""; errorMsg.value = ""
  try {
    await http({ url: "/v1/clipboard/channel", method: "POST", body: { name: form.name, password: form.password } })
    successMsg.value = `频道「${form.name}」创建成功！`
    form.name = ""; form.password = ""
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || "创建失败"
  } finally { saving.value = false }
}
</script>
