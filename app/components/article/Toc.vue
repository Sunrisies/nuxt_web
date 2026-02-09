<script setup lang="ts">
import type { MDCParserResult } from "@nuxtjs/mdc"

interface IProps {
  toc: MDCParserResult["toc"]
}

const props = defineProps<IProps>()
const toc = useModel(props, "toc")
const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <UContentToc
    :open="true"
    highlight
    highlight-color="primary"
    color="neutral"
    :links="toc?.links"
  >
    <template #link="{ link }">
      <div @click="emit('select')">
        {{ link.text }}
      </div>
    </template>
  </UContentToc>
</template>
