<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Bar } from 'vue-chartjs'
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { GRAY_200, GRAY_700, GRAY_800 } from '@/lib/color'
import { byteFormat1024 } from '@nethesis/vue-components'

const themeStore = useThemeStore()

const props = defineProps<{
  labels: number[] | string[]
  datasets: any[]
  height?: string
}>()

const options: any = {
  scales: {
    x: {
      ticks: {
        source: 'auto',
        autoSkip: true,
        color: themeStore.isLight ? GRAY_700 : GRAY_200,
        callback: function (value: any) {
          const label = (this as any).getLabelForValue(value)
          return `${label.toString().padStart(2, '0')}:00`
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
          return byteFormat1024(Math.abs(value))
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
            label += byteFormat1024(Math.abs(context.parsed.y))
          }
          return label
        },
        // format tooltip title
        title: function (context: any) {
          return `${context[0].label.padStart(2, '0')}:00`
        }
      }
    },
    // hide legend
    legend: {
      display: false
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
</script>

<template>
  <div>
    <Bar :data="chartData" :options="options" :style="chartStyle" />
  </div>
</template>
