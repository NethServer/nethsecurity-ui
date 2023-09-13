<!--
  Copyright (C) 2023 Nethesis S.r.l.
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
import { formatDateLoc } from '@nethserver/vue-tailwind-lib'
import { round } from 'lodash'

const themeStore = useThemeStore()

const props = defineProps({
  labels: {
    type: Array,
    required: true
  },
  datasets: {
    type: Array,
    required: true
  }
})

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
        // disable rotation for performance
        maxRotation: 0,
        autoSkip: true,
        // font color according to theme: gray-200 or gray-700
        color: themeStore.isLight ? '#374151' : '#e5e7eb',
        callback: function (value: number, index: number, ticks: any[]) {
          return formatDateLoc(value, 'HH:mm')
        }
      }
    },
    y: {
      ticks: {
        // format traffic on chart ticks
        callback: function (value: number, index: number, ticks: any[]) {
          return kbpsFormat(Math.abs(value))
        },
        // font color according to theme: gray-200 or gray-700
        color: themeStore.isLight ? '#374151' : '#e5e7eb'
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
    // hide legend
    legend: {
      display: false
    }
  }
}

const chartData: any = computed(() => {
  return { labels: props.labels, datasets: props.datasets }
})

//// move to library
/**
 * Format kilobits per second (kbps, typically a network speed)
 *
 * @param kbps the number of bytes to format
 * @returns a string representing the byte size with the appropriate unit
 */
function kbpsFormat(kbps: number) {
  switch (true) {
    case isNaN(kbps) || (!kbps && kbps !== 0):
      return '-'
    case kbps >= 0 && kbps < 1000:
      return round(kbps, 2) + ' kbps'
    case kbps >= 1000 && kbps < Math.pow(1000, 2):
      return round(kbps / 1000, 2) + ' Mbps'
    case kbps >= Math.pow(1000, 2) && kbps < Math.pow(1000, 3):
      return round(kbps / Math.pow(1000, 2), 2) + ' Gbps'
    default:
      return round(kbps / Math.pow(1000, 3), 2) + ' Tbps'
  }
}

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
  <Line :data="chartData" :options="options" />
</template>
