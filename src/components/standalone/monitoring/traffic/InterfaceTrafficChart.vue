<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Line } from 'vue-chartjs'
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { formatDateLoc, kbpsFormat } from '@nethesis/vue-components'
import { GRAY_200, GRAY_700, GRAY_800 } from '@/lib/color'

const themeStore = useThemeStore()

const props = defineProps<{
  labels: string[]
  datasets: any[]
  height?: string
}>()

const options: any = {
  // turn off animations and data parsing for performance
  animation: false,
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  },
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'minute'
      },
      ticks: {
        source: 'auto',
        autoSkip: true,
        color: themeStore.isLight ? GRAY_700 : GRAY_200,
        callback: function (value: number) {
          return formatDateLoc(value, 'HH:mm')
        }
      },
      grid: {
        color: themeStore.isLight ? GRAY_200 : GRAY_800
      }
    },
    y: {
      ticks: {
        // format traffic on chart ticks
        callback: function (value: number) {
          return kbpsFormat(Math.abs(value))
        },
        color: themeStore.isLight ? GRAY_700 : GRAY_200
      },
      grid: {
        color: themeStore.isLight ? GRAY_200 : GRAY_800
      }
    }
  },
  plugins: {
    decimation: {
      enabled: true,
      algorithm: 'min-max'
    },
    tooltip: {
      callbacks: {
        // format traffic bytes
        label: function (context: any) {
          let label = context.dataset.label || ''

          if (label) {
            label += ': '
          }
          if (context.parsed.y !== null) {
            label += kbpsFormat(Math.abs(context.parsed.y))
          }
          return label
        },
        // format tooltip title
        title: function (context: any) {
          return formatDateLoc(context[0].parsed.x, 'HH:mm:ss')
        }
      }
    },
    legend: {
      labels: {
        color: themeStore.isLight ? GRAY_700 : GRAY_200
      }
    }
  },
  responsive: true
}

const chartData: any = computed(() => {
  return { labels: props.labels, datasets: props.datasets }
})

const chartStyle = computed(() => {
  return {
    height: props.height || '',
    width: '100%',
    position: 'relative'
  }
})

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)
</script>

<template>
  <Line :data="chartData" :options="options" :style="chartStyle" />
</template>
