<template>
  <div class="w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 mt-4">
    <VChart v-if="chartOptions" :option="chartOptions" :autoresize="true" style="height: 176px" />
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

// 计算时间范围（最近12个月）
const heatmapWidth = (months: number): [string, string][] => {
  const now = new Date()
  const past = new Date(now)
  past.setMonth(now.getMonth() - months)

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  return [[formatDate(past), formatDate(now)]]
}

const getRangeArr = (): [string, string][] => {
  return heatmapWidth(12)
}

// 图表配置
const chartOptions = computed(() => {
  return {
    title: {
      top: 0,
      left: 'center',
      text: '博客产量',
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      hideDelay: 1000,
      enterable: true,
      formatter: '{c}篇文章'
    },
    visualMap: {
      min: 0,
      max: 6,
      type: 'piecewise',
      orient: 'horizontal',
      left: 'center',
      top: 30,
      inRange: {
        color: ['#7aa8744c', '#7AA874']
      },
      splitNumber: 3,
      text: ['文章篇数', ''],
      showLabel: true,
      itemGap: 30,
      textStyle: {
        fontSize: 12
      }
    },
    calendar: {
      top: 80,
      left: 20,
      right: 4,
      cellSize: ['auto', 12],
      range: getRangeArr(),
      itemStyle: {
        color: '#F1F1F1',
        borderWidth: 2.5,
        borderColor: '#fff'
      },
      yearLabel: {
        show: false
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.0)'
        }
      }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: props.warehouse
    }
  }
})
</script>
