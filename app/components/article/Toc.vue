<script setup lang="ts">
type TocLink = {
  id: string
  text: string
  depth?: number
  children?: TocLink[]
}

interface IProps {
  toc: { links?: TocLink[] }
}

const props = defineProps<IProps>()
const emit = defineEmits<{
  select: []
}>()

const links = ref<TocLink[]>(props.toc.links || [])

watch(
  () => props.toc.links,
  (value) => {
    if (value?.length) links.value = value
  }
)

onMounted(() => {
  if (links.value.length) return
  requestAnimationFrame(() => {
    links.value = Array.from(
      document.querySelectorAll<HTMLElement>("article h1[id], article h2[id], article h3[id]")
    ).map((heading) => ({
      id: heading.id,
      text: heading.textContent?.trim() || "",
      depth: Number(heading.tagName.slice(1))
    })).filter((link) => link.text)
  })
})
</script>

<template>
  <nav v-if="links.length" aria-label="本页目录" class="border-l border-default py-1">
    <p class="mb-2 px-3 text-sm font-semibold text-highlighted">本页目录</p>
    <a
      v-for="link in links"
      :key="link.id"
      :href="`#${link.id}`"
      class="block border-l-2 border-transparent px-3 py-1 text-sm leading-5 text-muted transition-colors hover:border-primary hover:text-primary"
      :class="link.depth === 1 ? 'font-medium text-default' : link.depth === 3 ? 'pl-7 text-xs' : 'pl-5'"
      @click="emit('select')"
    >
      {{ link.text }}
    </a>
  </nav>
</template>
