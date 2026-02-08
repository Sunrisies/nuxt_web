<template>
  <!-- <div class="w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 mt-4">
    <VChart v-if="chartOptions" :option="chartOptions" :autoresize="true" style="height: 176px" />
  </div> -->
  <div
    class="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 mt-4 transition-all duration-300"
  >
    <!-- 自定义标题和统计信息 -->
    <div class="flex justify-between items-center mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">博客活跃度日历</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ getStatsText }}
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600 dark:text-gray-300">{{ getCurrentYear }} 年</span>
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-gray-400 cursor-help" @click="showStats = !showStats" />
      </div>
    </div>

    <!-- 热力图容器 -->
    <div ref="chartContainer" class="w-full h-48 relative">
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
        <UISpinner class="w-8 h-8 text-primary" />
      </div>
      <VChart
        v-else
        :option="chartOptions"
        :autoresize="true"
        class="w-full h-full"
        @click="handleCellClick"
        @mouseover="handleMouseOver"
        @mouseout="handleMouseOut"
      />
    </div>

    <!-- 图例 -->
    <div class="flex items-center justify-between mt-4 px-2">
      <div class="flex items-center space-x-2">
        <span class="text-xs text-gray-500 dark:text-gray-400">较少</span>
        <div class="flex space-x-1">
          <div v-for="color in colorGradient" :key="color" class="w-4 h-3 rounded-sm" :style="{ backgroundColor: color }" />
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400">较多</span>
      </div>
      <span class="text-xs text-gray-500 dark:text-gray-400"> {{ getTotalArticles }} 篇文章 </span>
    </div>

    <!-- 统计详情卡片 -->
    <Transition name="fade">
      <div v-if="showStats" class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-primary">{{ getTotalArticles }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">总文章数</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ getMostProductiveDay.value }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">{{ getMostProductiveDay.date }} 最多</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { warehouseType } from '@/types/blog'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { HeatmapChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, VisualMapComponent, CalendarComponent } from 'echarts/components'
import VChart from 'vue-echarts'

// 注册必要的组件
use([CanvasRenderer, HeatmapChart, TitleComponent, TooltipComponent, VisualMapComponent, CalendarComponent])

interface Props {
  warehouse: warehouseType
}
const props = defineProps<Props>()
const warehouse = useModel(props, 'warehouse')
// 计算统计数据
const getTotalArticles = computed(() => {
  return warehouse.value.reduce((sum, item) => sum + (item[1] || 0), 0)
})

const getStatsText = computed(() => {
  const total = getTotalArticles.value
  if (total === 0) return '还没有写过文章，开始你的第一篇吧！'
  if (total < 10) return `已经写了 ${total} 篇文章，继续加油！`
  if (total < 50) return `已经写了 ${total} 篇文章，坚持就是胜利！`
  return `累计创作 ${total} 篇文章，真是高产！`
})

const getCurrentYear = computed(() => {
  return new Date().getFullYear()
})
const showStats = ref(false)
const chartContainer = ref<HTMLElement>()
const loading = ref(false)
// 更美观的颜色渐变
const colorGradient = [
  '#a5d6a7', // 淡绿色
  '#81c784', // 中等绿色
  '#66bb6a', // 绿色
  '#4caf50', // 鲜绿色
  '#43a047' // 深绿色
]
const getMostProductiveDay = computed(() => {
  if (!props.warehouse || props.warehouse.length === 0) return { date: '暂无', value: 0 }

  const maxItem = props.warehouse.reduce((max, item) => (item[1] > max[1] ? item : max), ['', 0])

  return {
    date: formatDateForDisplay(maxItem[0]),
    value: maxItem[1]
  }
})
const hoveredDate = ref<string>('')
const handleMouseOver = (params: any) => {
  if (params.data) {
    hoveredDate.value = params.data[0]
  }
}

const handleMouseOut = () => {
  hoveredDate.value = ''
}
// 交互事件处理
const handleCellClick = (params: any) => {
  if (params.data) {
    const date = params.data[0]
    console.log('点击日期:', date)
  }
}

const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString
    }
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  } catch (error) {
    return dateString
  }
}
// 计算时间范围（最近12个月）
const heatmapWidth = (months: number): [string, string][] => {
  const now = new Date()
  const past = new Date(now)
  past.setMonth(now.getMonth() - months)

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]!
  }

  return [[formatDate(past), formatDate(now)]]
}

const getRangeArr = (): [string, string][] => {
  return heatmapWidth(12)
}

// 图表配置
const chartOptions = computed(() => {
  const maxValue = Math.max(...warehouse.value.map((item) => item[1]), 1)
  return {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'transparent',
      borderRadius: 8,
      padding: [8, 12],
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: (params: any) => {
        const date = params.data[0]
        const count = params.data[1] || 0
        return `
          <div class="text-white">
            <div class="font-semibold">${formatDateForDisplay(date)}</div>
            <div class="mt-1">发布了 <span class="text-green-400 font-bold">${count}</span> 篇文章</div>
            <div class="mt-1 text-xs text-gray-300">点击查看当天文章</div>
          </div>
        `
      }
    },
    visualMap: {
      show: false,
      min: 0,
      max: maxValue,
      type: 'piecewise',
      orient: 'horizontal',
      left: 'center',
      top: 30,
      splitNumber: 3,
      text: ['文章篇数', ''],
      showLabel: true,
      itemGap: 30,
      textStyle: {
        fontSize: 12
      },
      calculable: true,
      inRange: {
        color: colorGradient
      },
      outOfRange: {
        color: '#ebedf0'
      }
    },
    calendar: {
      top: 80,
      left: 20,
      right: 4,
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.0)'
        }
      },

      cellSize: ['auto', 14],
      range: getRangeArr(),
      itemStyle: {
        color: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#fff',
        borderRadius: 2
      },
      dayLabel: {
        nameMap: 'ZH',
        color: '#666',
        fontSize: 12
      },
      monthLabel: {
        nameMap: 'ZH',
        color: '#666',
        fontSize: 12,
        margin: 8
      },
      yearLabel: {
        show: false
      }
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: props.warehouse,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        progressive: 0,
        animation: true,
        animationDurationUpdate: 1000,
        animationEasing: 'cubicOut'
      }
    ]
  }
})
</script>
<style>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 深色模式适配 */
.dark {
  ::-webkit-scrollbar-track {
    background: #2d3748;
  }

  ::-webkit-scrollbar-thumb {
    background: #4a5568;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #718096;
  }
}

/* 自定义提示框样式 */
:deep(.echarts-tooltip) {
  backdrop-filter: blur(10px) !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
}

:deep(.echarts-tooltip span) {
  color: inherit !important;
}
/* 添加一些额外的样式 */
:deep(.echarts-heatmap-cell) {
  transition: all 0.2s ease;
}

:deep(.echarts-heatmap-cell:hover) {
  transform: scale(1.05);
}

:deep(.echarts-visual-map-piece) {
  border-radius: 3px;
}

/* 暗色模式适配 */
.dark :deep(.echarts-calendar-day-label),
.dark :deep(.echarts-calendar-month-label) {
  color: #94a3b8 !important;
}

.dark :deep(.echarts-calendar-item) {
  color: #1e293b !important;
}

/* 优化滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
