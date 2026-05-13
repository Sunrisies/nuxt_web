<script setup lang="ts">
import hljs from "highlight.js/lib/core"
import javascript from "highlight.js/lib/languages/javascript"
import typescript from "highlight.js/lib/languages/typescript"
import json from "highlight.js/lib/languages/json"
import bash from "highlight.js/lib/languages/bash"
import xml from "highlight.js/lib/languages/xml"
import css from "highlight.js/lib/languages/css"
import yaml from "highlight.js/lib/languages/yaml"

hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("js", javascript)
hljs.registerLanguage("typescript", typescript)
hljs.registerLanguage("ts", typescript)
hljs.registerLanguage("json", json)
hljs.registerLanguage("bash", bash)
hljs.registerLanguage("sh", bash)
hljs.registerLanguage("html", xml)
hljs.registerLanguage("xml", xml)
hljs.registerLanguage("vue", xml)
hljs.registerLanguage("css", css)
hljs.registerLanguage("yaml", yaml)
hljs.registerLanguage("yml", yaml)

const props = defineProps({
  code: {
    type: String,
    default: ""
  },
  language: {
    type: String,
    default: null
  },
  filename: {
    type: String,
    default: null
  },
  highlights: {
    type: Array as () => number[],
    default: () => []
  },
  meta: {
    type: String,
    default: null
  },
  class: {
    type: String,
    default: null
  }
})

const copied = ref(false)
const expanded = ref(false)
const defaultCollapsedLines = 18
let copyTimer: ReturnType<typeof setTimeout> | null = null
const toast = useToast()

const displayLanguage = computed(() => (props.language || "text").toLowerCase())
const displayFilename = computed(() => props.filename || "")
const metaFlags = computed(() => {
  const meta = (props.meta || "").trim()
  const collapseMatch = meta.match(/(?:^|\s)collapse=(\d+)(?:\s|$)/)
  const noCollapse = /(?:^|\s)nocollapse(?:\s|$)/.test(meta)
  const collapseLines = collapseMatch
    ? Number(collapseMatch[1])
    : defaultCollapsedLines
  return {
    noCollapse,
    collapseLines:
      Number.isFinite(collapseLines) && collapseLines > 0
        ? collapseLines
        : defaultCollapsedLines
  }
})

const html = computed(() => {
  const lang = displayLanguage.value
  if (!hljs.getLanguage(lang)) {
    return (props.code || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
  }
  return hljs.highlight(props.code || "", { language: lang }).value
})

const rawLines = computed(() => {
  const lines = (props.code || "").replaceAll("\r\n", "\n").split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  return lines
})

const renderedLines = computed(() => {
  const lines = html.value.split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  const escapeHtml = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")

  const total = Math.max(lines.length, rawLines.value.length)
  return Array.from({ length: total }, (_, index) => ({
    number: index + 1,
    html:
      lines[index] ??
      (rawLines.value[index] ? escapeHtml(rawLines.value[index]) : "&nbsp;"),
    highlighted: props.highlights.includes(index + 1)
  }))
})

const visibleLines = computed(() => {
  if (metaFlags.value.noCollapse) return renderedLines.value
  if (
    expanded.value ||
    renderedLines.value.length <= metaFlags.value.collapseLines
  )
    return renderedLines.value
  return renderedLines.value.slice(0, metaFlags.value.collapseLines)
})

const canExpand = computed(
  () =>
    !metaFlags.value.noCollapse &&
    renderedLines.value.length > metaFlags.value.collapseLines
)
const hiddenCount = computed(() =>
  Math.max(renderedLines.value.length - metaFlags.value.collapseLines, 0)
)

const copyCode = async () => {
  console.log("打印")
  const content = props.code || ""
  if (!content) {
    toast.add({ title: "复制失败", description: "代码内容为空", color: "red" })
    return
  }

  try {
    console.log(
      navigator?.clipboard?.writeText,
      "navigator?.clipboard?.writeText"
    )
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(content)
    } else {
      const textarea = document.createElement("textarea")
      textarea.value = content
      textarea.setAttribute("readonly", "true")
      textarea.style.position = "fixed"
      textarea.style.left = "-9999px"
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      if (!ok) throw new Error("execCommand copy failed")
    }

    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
    toast.add({
      title: "复制成功",
      description: "代码已复制到剪贴板",
      color: "green"
    })
  } catch (error) {
    console.error("Copy failed:", error)
    toast.add({
      title: "复制失败",
      description: "请检查浏览器权限后重试",
      color: "red"
    })
  }
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 border-red-400"
  >
    <div
      class="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
    >
      <div class="flex min-w-0 items-center gap-2">
        <span
          v-if="displayFilename"
          class="max-w-[280px] truncate text-xs text-slate-700 dark:text-slate-200"
          >{{ displayFilename }}</span
        >
        <span
          class="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200"
          >{{ displayLanguage }}</span
        >
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        :title="copied ? '已复制' : '复制代码'"
        @click="copyCode"
      >
        <UIcon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          class="text-sm"
        />
        {{ copied ? "已复制" : "复制" }}
      </button>
    </div>

    <pre class="m-0 overflow-x-auto bg-white py-3 dark:bg-slate-900">
      <code class="hljs block bg-transparent p-0">
        <span
          v-for="line in visibleLines"
          :key="line.number"
          class="grid min-h-6 grid-cols-[3rem_1fr] gap-3 px-4"
          :class="line.highlighted ? 'bg-amber-50 dark:bg-blue-900/30' : ''"
        >
          <span class="select-none border-r border-slate-100 pr-2 text-right text-slate-400 dark:border-slate-800">{{ line.number }}</span>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="block whitespace-pre" v-html="line.html" />
        </span>
      </code>
    </pre>

    <button
      v-if="canExpand"
      type="button"
      class="w-full border-0 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      @click="expanded = !expanded"
    >
      {{ expanded ? "收起代码" : `展开剩余 ${hiddenCount} 行` }}
    </button>
  </div>
</template>

<style>
.hljs {
  color: #24292e;
}

.hljs-comment,
.hljs-quote {
  color: #6a737d;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-subst {
  color: #d73a49;
}

.hljs-string,
.hljs-doctag,
.hljs-regexp {
  color: #032f62;
}

.hljs-title,
.hljs-section,
.hljs-selector-id {
  color: #6f42c1;
}

.hljs-number,
.hljs-literal,
.hljs-variable,
.hljs-template-variable,
.hljs-type,
.hljs-tag .hljs-attr {
  color: #005cc5;
}

.hljs-built_in,
.hljs-builtin-name {
  color: #e36209;
}

.hljs-attr,
.hljs-attribute,
.hljs-name {
  color: #22863a;
}

.dark .hljs {
  color: #e2e8f0;
}

.dark .hljs-comment,
.dark .hljs-quote {
  color: #94a3b8;
}

.dark .hljs-keyword,
.dark .hljs-selector-tag,
.dark .hljs-subst {
  color: #93c5fd;
}

.dark .hljs-string,
.dark .hljs-doctag,
.dark .hljs-regexp {
  color: #86efac;
}

.dark .hljs-title,
.dark .hljs-section,
.dark .hljs-selector-id {
  color: #c4b5fd;
}

.dark .hljs-number,
.dark .hljs-literal,
.dark .hljs-variable,
.dark .hljs-template-variable,
.dark .hljs-type,
.dark .hljs-tag .hljs-attr {
  color: #f9a8d4;
}

.dark .hljs-built_in,
.dark .hljs-builtin-name {
  color: #fbbf24;
}

.dark .hljs-attr,
.dark .hljs-attribute,
.dark .hljs-name {
  color: #fcd34d;
}
</style>
