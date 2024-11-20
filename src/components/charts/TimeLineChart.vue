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
import { merge } from 'lodash-es'

const themeStore = useThemeStore()

const props = withDefaults(
  defineProps<{
    labels: number[]
    datasets: any[]
    height?: string
    showLegend?: boolean
    useKbpsFormat?: boolean
    datasetSuffix?: string
    options?: unknown
  }>(),
  { height: '', showLegend: true, useKbpsFormat: false, datasetSuffix: '' }
)

const defaultOptions: any = {
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
        callback: function (value: number) {
          if (props.useKbpsFormat) {
            // format traffic on chart ticks
            return kbpsFormat(Math.abs(value))
          } else if (props.datasetSuffix) {
            // add suffix to y axis ticks
            return `${value.toLocaleString()} ${props.datasetSuffix}`
          } else {
            return value.toLocaleString()
          }
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
        label: function (context: any) {
          let label = context.dataset.label || ''

          if (label) {
            label += ': '
          }
          if (context.parsed.y !== null) {
            if (props.useKbpsFormat) {
              label += kbpsFormat(Math.abs(context.parsed.y))
            } else if (props.datasetSuffix) {
              label += `${context.parsed.y.toLocaleString()} ${props.datasetSuffix}`
            } else {
              label += context.parsed.y.toLocaleString()
            }
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
      display: props.showLegend,
      labels: {
        color: themeStore.isLight ? GRAY_700 : GRAY_200
      }
    }
  },
  responsive: true
}

const allOptions = computed(() => {
  return merge(typeof props.options === 'object' ? props.options : {}, defaultOptions)
})

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
  <Line :data="chartData" :options="allOptions" :style="chartStyle" />
</template>
