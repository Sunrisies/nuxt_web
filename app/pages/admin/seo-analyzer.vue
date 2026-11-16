<template>
  <div class="max-w-6xl mx-auto">
    <!-- 顶部标题栏 -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <h1 class="text-lg font-bold">📊 SEO 优化分析</h1>
        <UBadge v-if="analysisResult" :color="getBadgeColor(analysisResult.totalScore)" variant="soft" size="sm">
          {{ getScoreLevel(analysisResult.totalScore) }} · {{ analysisResult.totalScore }}/100
        </UBadge>
        <UBadge v-if="analysisResult && fallbackUsed" color="neutral" variant="soft" size="sm" :title="fallbackReason || 'AI 分析不可用，本次使用固定规则评分'">
          规则评分
        </UBadge>
      </div>
      <div class="flex items-center gap-2">
        <UButton v-if="analysisResult" variant="ghost" color="neutral" size="sm" icon="i-heroicons-question-mark-circle" @click="showScoreGuide = true">
          评分标准
        </UButton>
        <UButton v-if="analysisResult" variant="outline" color="neutral" size="sm" icon="i-heroicons-arrow-path" @click="resetAll">
          重新开始
        </UButton>
      </div>
    </div>

    <!-- 控制栏 + 进度条 -->
    <UCard class="mb-3">
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex-1 min-w-60">
          <USelect
            v-model="selectedPostId"
            :items="postOptions"
            placeholder="选择要分析的文章..."
            class="w-full"
            :loading="loadingPosts"
            :disabled="analyzing || optimizing"
          />
        </div>
        <UButton color="primary" size="sm" icon="i-heroicons-magnifying-glass" :loading="analyzing" :disabled="!selectedPostId || optimizing" @click="analyzePost">
          {{ analyzing ? "分析中..." : "🔍 开始分析" }}
        </UButton>
        <UButton v-if="analysisResult" color="success" size="sm" icon="i-heroicons-sparkles" :loading="optimizing" :disabled="analyzing" @click="generateSuggestions">
          {{ optimizing ? "生成中..." : "⚡ 生成建议" }}
        </UButton>
        <UButton v-if="analysisResult && suggestions && suggestionCount > 0" color="warning" size="sm" variant="soft" icon="i-heroicons-arrows-right-left" @click="showComparison = true">
          📊 优化对比
        </UButton>
      </div>

      <!-- 进度条 -->
      <div v-if="analyzing || optimizing" class="mt-3 pt-3 border-t">
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin text-primary" />
          <span class="text-sm font-medium text-primary">{{ currentStep }}</span>
          <span class="text-xs text-muted ml-auto">{{ progressPercent }}%</span>
        </div>
        <div class="h-2 bg-muted rounded-full overflow-hidden">
          <div class="h-full bg-primary rounded-full transition-all duration-300" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <div class="flex justify-between mt-1.5">
          <span v-for="(step, index) in currentSteps" :key="index" class="text-[10px] transition-colors" :class="index <= currentStepIndex ? 'text-primary font-medium' : 'text-muted opacity-50'">
            {{ step }}
          </span>
        </div>
        <div v-if="streamText" class="mt-2 text-[10px] text-muted">
          AI 正在生成…（已接收 {{ streamText.length }} 字）
        </div>
      </div>
    </UCard>

    <!-- 分析结果 -->
    <div v-if="analysisResult" class="mb-3">
      <div class="grid gap-3 lg:grid-cols-5">
        <!-- 总分 -->
        <div class="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 flex flex-col items-center justify-center">
          <div class="text-[10px] text-muted mb-1 uppercase tracking-wide">总分</div>
          <div class="text-3xl font-bold text-primary leading-none">{{ analysisResult.totalScore }}</div>
          <div class="text-[10px] text-muted mt-1">/ 100</div>
          <div class="w-full mt-2">
            <div class="h-1.5 bg-muted rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all" :class="getScoreBarColor(analysisResult.totalScore)" :style="{ width: `${analysisResult.totalScore}%` }"></div>
            </div>
          </div>
        </div>

        <!-- 标题优化 -->
        <div class="border rounded-lg p-3">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold">📝 标题</span>
            <span class="text-xs font-bold" :class="getTextColor(analysisResult.seo.title.score, 25)">{{ analysisResult.seo.title.score }}/25</span>
          </div>
          <div class="w-full mb-1">
            <div class="h-1 bg-muted rounded-full overflow-hidden">
              <div class="h-full rounded-full" :class="getBarColor(analysisResult.seo.title.score, 25)" :style="{ width: `${(analysisResult.seo.title.score / 25) * 100}%` }"></div>
            </div>
          </div>
          <p class="text-[10px] text-muted line-clamp-2">{{ analysisResult.seo.title.message }}</p>
        </div>

        <!-- 描述优化 -->
        <div class="border rounded-lg p-3">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold">📄 描述</span>
            <span class="text-xs font-bold" :class="getTextColor(analysisResult.seo.description.score, 20)">{{ analysisResult.seo.description.score }}/20</span>
          </div>
          <div class="w-full mb-1">
            <div class="h-1 bg-muted rounded-full overflow-hidden">
              <div class="h-full rounded-full" :class="getBarColor(analysisResult.seo.description.score, 20)" :style="{ width: `${(analysisResult.seo.description.score / 20) * 100}%` }"></div>
            </div>
          </div>
          <p class="text-[10px] text-muted line-clamp-2">{{ analysisResult.seo.description.message }}</p>
        </div>

        <!-- 关键词 -->
        <div class="border rounded-lg p-3">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold">🔑 关键词</span>
            <span class="text-xs font-bold" :class="getTextColor(analysisResult.seo.keywords.score, 25)">{{ analysisResult.seo.keywords.score }}/25</span>
          </div>
          <div class="w-full mb-1">
            <div class="h-1 bg-muted rounded-full overflow-hidden">
              <div class="h-full rounded-full" :class="getBarColor(analysisResult.seo.keywords.score, 25)" :style="{ width: `${(analysisResult.seo.keywords.score / 25) * 100}%` }"></div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-muted">密度</span>
            <span class="text-[10px] font-medium">{{ analysisResult.seo.keywords.density }}%</span>
          </div>
        </div>

        <!-- 结构+长度 -->
        <div class="border rounded-lg p-3">
          <div class="space-y-2">
            <div>
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-[10px] font-semibold">📋 结构</span>
                <span class="text-[10px] font-bold" :class="getTextColor(analysisResult.seo.headings.score, 15)">{{ analysisResult.seo.headings.score }}/15</span>
              </div>
              <div class="h-1 bg-muted rounded-full overflow-hidden">
                <div class="h-full rounded-full" :class="getBarColor(analysisResult.seo.headings.score, 15)" :style="{ width: `${(analysisResult.seo.headings.score / 15) * 100}%` }"></div>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-0.5">
                <span class="text-[10px] font-semibold">📏 长度</span>
                <span class="text-[10px] font-bold" :class="getTextColor(analysisResult.seo.contentLength.score, 15)">{{ analysisResult.seo.contentLength.score }}/15</span>
              </div>
              <div class="h-1 bg-muted rounded-full overflow-hidden">
                <div class="h-full rounded-full" :class="getBarColor(analysisResult.seo.contentLength.score, 15)" :style="{ width: `${(analysisResult.seo.contentLength.score / 15) * 100}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 详细评分（可展开） -->
      <UCard v-if="showDetails" class="mt-3">
        <div class="space-y-2">
          <div v-for="(item, key) in seoItems" :key="key" class="flex items-start gap-2 p-2 rounded" :class="getStatusBg(item.status)">
            <UIcon :name="getStatusIcon(item.status)" :class="getStatusColor(item.status)" class="size-4 mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium">{{ getSeoItemLabel(key) }} ({{ item.score }}分)</span>
              </div>
              <p class="text-[11px] text-muted mt-0.5">{{ item.message }}</p>
            </div>
          </div>
        </div>
        <UButton variant="ghost" size="sm" class="mt-2" @click="showDetails = false">
          收起详细信息
        </UButton>
      </UCard>
      <UButton v-else variant="ghost" size="sm" class="mt-1" @click="showDetails = true">
        📋 查看详细评分
      </UButton>
    </div>

    <!-- 优化建议 -->
    <UCard v-if="suggestions" class="mb-3">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-light-bulb" class="size-4 text-yellow-500" />
            <span class="font-semibold text-sm">AI 优化建议</span>
            <UBadge v-if="suggestionCount > 0" color="primary" variant="soft" size="xs">{{ suggestionCount }} 条建议</UBadge>
          </div>
          <UButton v-if="suggestionCount > 0" variant="ghost" size="xs" @click="showSuggestions = !showSuggestions">
            {{ showSuggestions ? "收起" : "展开" }}
          </UButton>
        </div>
      </template>

      <!-- 无需优化提示 -->
      <div v-if="suggestionCount === 0" class="text-center py-6">
        <UIcon name="i-heroicons-check-circle" class="size-10 text-green-500 mx-auto mb-2" />
        <p class="text-sm font-medium text-green-600">文章 SEO 优化已经很好！</p>
        <p class="text-xs text-muted mt-1">无需进一步优化</p>
      </div>

      <!-- 建议列表 -->
      <div v-show="showSuggestions && suggestionCount > 0" class="space-y-3">
        <div v-for="(suggestion, index) in suggestionList" :key="index" class="border rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <UIcon :name="suggestion.icon" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ suggestion.title }}</span>
            </div>
            <UBadge :color="suggestion.priority === 'high' ? 'error' : suggestion.priority === 'medium' ? 'warning' : 'neutral'" variant="soft" size="xs">
              {{ suggestion.priority === 'high' ? '高优先级' : suggestion.priority === 'medium' ? '中优先级' : '低优先级' }}
            </UBadge>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex gap-2">
              <span class="text-xs text-muted w-14 shrink-0">当前：</span>
              <span class="text-muted">{{ suggestion.current }}</span>
            </div>
            <div class="flex gap-2">
              <span class="text-xs text-primary w-14 shrink-0">建议：</span>
              <span class="text-primary font-medium">{{ suggestion.suggested }}</span>
            </div>
            <p class="text-xs text-muted pl-14">{{ suggestion.reason }}</p>
          </div>

          <div class="flex gap-2 mt-2 pl-14">
            <UButton
              v-if="canApply(suggestion.type)"
              color="primary"
              variant="soft"
              size="xs"
              icon="i-heroicons-check"
              :loading="applyingOptimization === suggestion.type"
              :disabled="appliedTypes.has(suggestion.type)"
              @click="applyOptimization(suggestion.type, suggestion.suggested)"
            >
              {{ appliedTypes.has(suggestion.type) ? "已应用" : "应用此优化" }}
            </UButton>
            <span v-else class="text-[10px] text-muted">
              该项需要到文章编辑器里手动调整
            </span>
          </div>
        </div>
      </div>
    </UCard>

    <!-- 空状态 -->
    <UCard v-if="!analysisResult && !analyzing" class="text-center py-8">
      <div class="flex flex-col items-center gap-3">
        <UIcon name="i-heroicons-document-magnifying-glass" class="size-10 text-muted opacity-40" />
        <div>
          <p class="text-sm font-medium">选择文章开始分析</p>
          <p class="text-xs text-muted mt-1">获取 SEO 评分和优化建议</p>
        </div>
      </div>
    </UCard>

    <!-- 优化对比弹窗 -->
    <UModal v-model:open="showComparison" title="📊 优化前后对比" size="lg">
      <template #body>
        <div v-if="originalAnalysis && analysisResult" class="space-y-4">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 bg-muted/30 rounded-lg">
              <div class="text-[10px] text-muted mb-1">优化前</div>
              <div class="text-2xl font-bold text-muted">{{ originalAnalysis.totalScore }}</div>
            </div>
            <div class="flex items-center justify-center">
              <UBadge :color="scoreDelta > 0 ? 'success' : scoreDelta < 0 ? 'error' : 'neutral'" variant="soft" size="lg">
                {{ scoreDelta > 0 ? '📈 +' : scoreDelta < 0 ? '📉 ' : '➡️ ' }}{{ scoreDelta }}
              </UBadge>
            </div>
            <div class="p-3 bg-primary/10 rounded-lg">
              <div class="text-[10px] text-primary mb-1">优化后</div>
              <div class="text-2xl font-bold text-primary">{{ analysisResult.totalScore }}</div>
            </div>
          </div>

          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 font-medium">项目</th>
                <th class="text-center py-2 font-medium">优化前</th>
                <th class="text-center py-2 font-medium">优化后</th>
                <th class="text-center py-2 font-medium">变化</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in comparisonItems" :key="item.key" class="border-b border-muted/30">
                <td class="py-2">{{ item.label }}</td>
                <td class="text-center py-2 text-muted">{{ item.before }}</td>
                <td class="text-center py-2 font-medium">{{ item.after }}</td>
                <td class="text-center py-2">
                  <UBadge :color="item.delta > 0 ? 'success' : item.delta < 0 ? 'error' : 'neutral'" variant="subtle" size="xs">
                    {{ item.delta > 0 ? '+' : '' }}{{ item.delta }}
                  </UBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </UModal>

    <!-- 评分标准弹窗 -->
    <UModal v-model:open="showScoreGuide" title="📋 评分标准说明" size="lg">
      <template #body>
        <div class="space-y-4 text-sm">
          <div>
            <h3 class="font-semibold mb-2">🔍 SEO 评分标准（100分）</h3>
            <table class="w-full text-xs">
              <tbody>
                <tr class="border-b"><td class="py-1.5">标题优化</td><td class="text-right font-medium">25分</td><td class="text-muted pl-3">10-60字符、含关键词、吸引力</td></tr>
                <tr class="border-b"><td class="py-1.5">描述优化</td><td class="text-right font-medium">20分</td><td class="text-muted pl-3">有描述、100-160字符、含关键词</td></tr>
                <tr class="border-b"><td class="py-1.5">关键词密度</td><td class="text-right font-medium">25分</td><td class="text-muted pl-3">1%-3% 最佳</td></tr>
                <tr class="border-b"><td class="py-1.5">标题结构</td><td class="text-right font-medium">15分</td><td class="text-muted pl-3">有H2/H3小标题，层级清晰</td></tr>
                <tr><td class="py-1.5">内容长度</td><td class="text-right font-medium">15分</td><td class="text-muted pl-3">最少300字、推荐1000+</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 class="font-semibold mb-2">📊 评分等级</h3>
            <div class="flex gap-2 flex-wrap text-xs">
              <UBadge color="success" variant="soft">优秀 90-100</UBadge>
              <UBadge color="success" variant="soft">良好 80-89</UBadge>
              <UBadge color="warning" variant="soft">一般 60-79</UBadge>
              <UBadge color="error" variant="soft">较差 40-59</UBadge>
              <UBadge color="error" variant="soft">很差 0-39</UBadge>
            </div>
          </div>
          <div class="text-xs text-muted">
            <p>💡 <strong>说明</strong>：文章标题本身就是 H1 标签，评分主要看内容中是否有 H2/H3 小标题来判断结构清晰度。</p>
          </div>
        </div>
      </template>
    </UModal>

    <UAlert v-if="error" color="error" variant="soft" :title="error" class="mt-3" @close="error = ''" />
  </div>
</template>

<script setup lang="ts">
import type { PostList } from "~/types/blog"

interface SeoAnalysisResult {
  seo: {
    score: number
    maxScore: number
    title: { score: number, status: string, message: string }
    description: { score: number, status: string, message: string }
    keywords: { score: number, status: string, message: string, density: number, keywords: string[] }
    headings: { score: number, status: string, message: string }
    contentLength: { score: number, status: string, message: string, wordCount: number }
  }
  totalScore: number
}

interface OptimizationSuggestions {
  title?: { current: string, suggested: string, reason: string }
  description?: { current: string, suggested: string, reason: string }
  keywords?: { current: string[], suggested: string[], reason: string }
  headings?: { current: string, suggested: string, reason: string }
  contentStructure?: { suggestions: string[], reason: string }
}

definePageMeta({ layout: "admin", middleware: "admin-auth" })

const toast = useToast()
const route = useRoute()

// 状态
const posts = ref<PostList["data"]>([])
const selectedPostId = ref<number | null>(route.query.postId ? Number(route.query.postId) : null)
const loadingPosts = ref(false)
const analyzing = ref(false)
const optimizing = ref(false)
const analysisResult = ref<SeoAnalysisResult | null>(null)
const originalAnalysis = ref<SeoAnalysisResult | null>(null)
const suggestions = ref<OptimizationSuggestions | null>(null)
const applyingOptimization = ref<string | null>(null)
const appliedTypes = ref<Set<string>>(new Set())
const showComparison = ref(false)
const showScoreGuide = ref(false)
const showSuggestions = ref(true)
const showDetails = ref(false)
const error = ref("")
const streamText = ref("")
const fallbackUsed = ref(false)
const fallbackReason = ref("")

// 进度状态
const analysisSteps = ["获取文章", "分析标题", "分析描述", "分析关键词", "分析结构", "生成报告"]
const optimizeSteps = ["准备数据", "AI 分析", "生成建议", "完成"]
const currentSteps = ref<string[]>(analysisSteps)
const currentStepIndex = ref(0)
const currentStep = ref("")
const progressPercent = ref(0)
let progressTimer: ReturnType<typeof setInterval> | null = null

// 计算属性
const postOptions = computed(() => posts.value.map(post => ({ label: post.title, value: post.id })))
const seoItems = computed(() => {
  if (!analysisResult.value) return {}
  const { seo } = analysisResult.value
  return { title: seo.title, description: seo.description, keywords: seo.keywords, headings: seo.headings, contentLength: seo.contentLength }
})
const scoreDelta = computed(() => {
  if (!originalAnalysis.value || !analysisResult.value) return 0
  return analysisResult.value.totalScore - originalAnalysis.value.totalScore
})
const comparisonItems = computed(() => {
  if (!originalAnalysis.value || !analysisResult.value) return []
  const o = originalAnalysis.value, c = analysisResult.value
  return [
    { key: 'total', label: '总分', before: o.totalScore, after: c.totalScore, delta: c.totalScore - o.totalScore },
    { key: 'title', label: '标题优化', before: o.seo.title.score, after: c.seo.title.score, delta: c.seo.title.score - o.seo.title.score },
    { key: 'desc', label: '描述优化', before: o.seo.description.score, after: c.seo.description.score, delta: c.seo.description.score - o.seo.description.score },
    { key: 'keywords', label: '关键词密度', before: o.seo.keywords.score, after: c.seo.keywords.score, delta: c.seo.keywords.score - o.seo.keywords.score },
    { key: 'headings', label: '标题结构', before: o.seo.headings.score, after: c.seo.headings.score, delta: c.seo.headings.score - o.seo.headings.score },
    { key: 'length', label: '内容长度', before: o.seo.contentLength.score, after: c.seo.contentLength.score, delta: c.seo.contentLength.score - o.seo.contentLength.score },
  ]
})

// 优化建议列表
const suggestionList = computed(() => {
  if (!suggestions.value) return []
  const list: Array<{ type: string, icon: string, title: string, current: string, suggested: string, reason: string, priority: string }> = []

  if (suggestions.value.title) {
    list.push({ type: 'title', icon: 'i-heroicons-pencil-square', title: '标题优化', current: suggestions.value.title.current, suggested: suggestions.value.title.suggested, reason: suggestions.value.title.reason, priority: 'high' })
  }
  if (suggestions.value.description) {
    list.push({ type: 'description', icon: 'i-heroicons-document-text', title: '描述优化', current: suggestions.value.description.current, suggested: suggestions.value.description.suggested, reason: suggestions.value.description.reason, priority: 'high' })
  }
  if (suggestions.value.keywords) {
    list.push({ type: 'keywords', icon: 'i-heroicons-tag', title: '关键词优化', current: suggestions.value.keywords.current.join(', '), suggested: suggestions.value.keywords.suggested.join(', '), reason: suggestions.value.keywords.reason, priority: 'medium' })
  }
  if (suggestions.value.headings) {
    list.push({ type: 'headings', icon: 'i-heroicons-bars-3', title: '标题结构优化', current: suggestions.value.headings.current, suggested: suggestions.value.headings.suggested, reason: suggestions.value.headings.reason, priority: 'medium' })
  }
  if (suggestions.value.contentStructure?.suggestions?.length) {
    list.push({ type: 'contentStructure', icon: 'i-heroicons-list-bullet', title: '内容结构优化', current: '见建议', suggested: suggestions.value.contentStructure.suggestions.join('; '), reason: suggestions.value.contentStructure.reason, priority: 'low' })
  }

  return list
})

const suggestionCount = computed(() => suggestionList.value.length)

// 方法
async function fetchPosts() {
  loadingPosts.value = true
  try {
    const res = await http<PostList>({ url: "/v1/posts", query: { page: 1, limit: 100 } })
    posts.value = res.data || []
  } catch { error.value = "获取文章列表失败" } finally { loadingPosts.value = false }
}

function startProgress(steps: string[]) {
  currentSteps.value = steps
  currentStepIndex.value = 0
  currentStep.value = steps[0]
  progressPercent.value = 0

  // 前几步快速推进，最后一步（AI 调用）缓慢增长
  progressTimer = setInterval(() => {
    if (currentStepIndex.value < steps.length - 1) {
      // 快速完成非 AI 步骤（每 800ms 一步）
      currentStepIndex.value++
      currentStep.value = steps[currentStepIndex.value]
      progressPercent.value = Math.min(30, (currentStepIndex.value / (steps.length - 1)) * 30)
    } else {
      // 最后一步：缓慢增长到 95%，模拟等待 AI 响应
      if (progressPercent.value < 95) {
        // 越接近 95 越慢
        const remaining = 95 - progressPercent.value
        const increment = Math.max(0.3, remaining * 0.05)
        progressPercent.value = Math.min(95, progressPercent.value + increment)
        currentStep.value = `${steps[currentStepIndex.value]}... (${Math.round(progressPercent.value)}%)`
      }
    }
  }, 800)
}

function stopProgress() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  currentStep.value = "完成"
  progressPercent.value = 100
}

async function streamPost<T>(
  url: string,
  body: unknown,
  onDelta: (text: string) => void
): Promise<{ code: number, data: T, message?: string, fallback?: boolean, fallbackReason?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000)
  })

  if (!res.ok) {
    let message = `请求失败（${res.status}）`
    try {
      const json = await res.json()
      message = json?.statusMessage || json?.message || message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("text/event-stream") || !res.body) {
    return await res.json() as { code: number, data: T, message?: string, fallback?: boolean, fallbackReason?: string }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let result: { code: number, data: T, message?: string, fallback?: boolean, fallbackReason?: string } | null = null

  const handleEvent = (raw: string) => {
    const line = raw.split("\n").find(l => l.startsWith("data:"))
    if (!line) return
    let event: any
    try {
      event = JSON.parse(line.slice(5).trim())
    } catch {
      return
    }
    if (event.type === "delta" && typeof event.text === "string") {
      streamText.value += event.text
      onDelta(event.text)
    } else if (event.type === "result") {
      result = event.data
    } else if (event.type === "error") {
      throw new Error(event.message || "AI 处理失败，请重试")
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      handleEvent(raw)
    }
  }
  if (buffer.trim()) handleEvent(buffer)

  if (!result) throw new Error("AI 未返回结果，请重试")
  return result
}

async function analyzePost() {
  if (!selectedPostId.value) return
  analyzing.value = true
  error.value = ""
  startProgress(analysisSteps)

  // 清空之前的分析结果
  if (analysisResult.value) {
    originalAnalysis.value = { ...analysisResult.value }
  }
  suggestions.value = null
  appliedTypes.value = new Set()
  showSuggestions.value = true
  fallbackUsed.value = false
  fallbackReason.value = ""

  try {
    streamText.value = ""
    const res = await streamPost<SeoAnalysisResult>("/api/seo/analyze", { postId: selectedPostId.value }, () => {
      currentStep.value = `AI 正在生成分析（${streamText.value.length} 字）`
      progressPercent.value = Math.min(95, 30 + streamText.value.length / 20)
    })
    if (res.code === 200) {
      fallbackUsed.value = Boolean(res.fallback)
      fallbackReason.value = res.fallbackReason || ""
      if (!originalAnalysis.value) originalAnalysis.value = res.data
      analysisResult.value = res.data
      streamText.value = ""
      stopProgress()
      toast.add({ title: "分析完成", color: "success", icon: "i-heroicons-check-circle" })
    }
  } catch (e: any) {
    stopProgress()
    error.value = e?.message || "分析失败"
  } finally {
    analyzing.value = false
    setTimeout(() => { progressPercent.value = 0; currentStep.value = ""; streamText.value = "" }, 2000)
  }
}

async function generateSuggestions() {
  if (!selectedPostId.value || !analysisResult.value) return
  optimizing.value = true
  error.value = ""
  startProgress(optimizeSteps)
  appliedTypes.value = new Set()
  try {
    streamText.value = ""
    const res = await streamPost<OptimizationSuggestions>("/api/seo/optimize", {
      postId: selectedPostId.value,
      analysisResult: analysisResult.value
    }, () => {
      currentStep.value = `AI 正在生成建议（${streamText.value.length} 字）`
      progressPercent.value = Math.min(95, 30 + streamText.value.length / 20)
    })
    if (res.code === 200) {
      suggestions.value = res.data
      showSuggestions.value = true
      streamText.value = ""
      stopProgress()
      if (res.message) {
        toast.add({ title: res.message, color: "info", icon: "i-heroicons-check-circle" })
      } else {
        toast.add({ title: "优化建议生成完成", color: "success", icon: "i-heroicons-sparkles" })
      }
    }
  } catch (e: any) {
    stopProgress()
    error.value = e?.message || "生成优化建议失败"
  } finally {
    optimizing.value = false
    setTimeout(() => { progressPercent.value = 0; currentStep.value = ""; streamText.value = "" }, 2000)
  }
}

async function applyOptimization(type: string, value: string) {
  if (!selectedPostId.value) return
  if (!canApply(type)) return
  applyingOptimization.value = type
  try {
    const post = posts.value.find(p => p.id === selectedPostId.value)
    if (!post) return
    // 目前只有标题和描述能安全地回写到文章；关键词/结构类建议需要手动改正文
    const updateData = type === "title" ? { title: value.slice(0, 255) } : { summary: value.slice(0, 500) }
    await http({ url: `/v1/posts/${post.uuid}`, method: "PUT", body: updateData })
    if (type === "title") post.title = value.slice(0, 255)
    appliedTypes.value = new Set(appliedTypes.value).add(type)
    toast.add({ title: "已应用；需要最新评分时再点「开始分析」", color: "success" })
  } catch (e: any) { toast.add({ title: e.data?.message || "应用优化失败", color: "error" }) } finally { applyingOptimization.value = null }
}

/** 只有标题/描述建议能通过 PUT /v1/posts 直接回写。 */
function canApply(type: string) {
  return type === "title" || type === "description"
}

function resetAll() {
  analysisResult.value = null
  originalAnalysis.value = null
  suggestions.value = null
  appliedTypes.value = new Set()
  fallbackUsed.value = false
  fallbackReason.value = ""
  showSuggestions.value = true
  showDetails.value = false
  error.value = ""
  progressPercent.value = 0
  currentStep.value = ""
}

// 工具函数
function getScoreColor(score: number) { return score >= 80 ? "success" : score >= 60 ? "warning" : "error" }
function getScoreBarColor(score: number) { return score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500" }
function getBarColor(score: number, max: number) {
  const pct = (score / max) * 100
  return pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"
}
function getScoreLevel(score: number) { return score >= 90 ? "优秀" : score >= 80 ? "良好" : score >= 60 ? "一般" : score >= 40 ? "较差" : "很差" }
function getBadgeColor(score: number) {
  return score >= 80 ? "success" : score >= 60 ? "warning" : "error"
}
function getTextColor(score: number, max: number) {
  const pct = (score / max) * 100
  return pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600"
}
function getStatusIcon(status: string) { return status === "good" ? "i-heroicons-check-circle" : status === "warning" ? "i-heroicons-exclamation-triangle" : "i-heroicons-x-circle" }
function getStatusColor(status: string) { return status === "good" ? "text-green-500" : status === "warning" ? "text-yellow-500" : "text-red-500" }
function getStatusBg(status: string) { return status === "good" ? "bg-green-50" : status === "warning" ? "bg-yellow-50" : "bg-red-50" }
function getSeoItemLabel(key: string) {
  const labels: Record<string, string> = { title: "标题优化", description: "描述优化", keywords: "关键词密度", headings: "标题结构", contentLength: "内容长度" }
  return labels[key] || key
}

onMounted(async () => {
  await fetchPosts()
  if (selectedPostId.value) await analyzePost()
})
</script>
