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
import { Bar } from 'vue-chartjs'
import { computed } from 'vue'
import { byteFormat1024 } from '@nethesis/vue-components'
import { useThemeStore } from '@/stores/theme'
import { GRAY_200, GRAY_700, GRAY_800 } from '@/lib/color'

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
  // horizontal bar chart
  indexAxis: 'y',
  scales: {
    x: {
      ticks: {
        // format traffic on chart ticks
        callback: function (value: number) {
          return byteFormat1024(value)
        },
        color: themeStore.isLight ? GRAY_700 : GRAY_200
      },
      grid: {
        color: themeStore.isLight ? GRAY_200 : GRAY_800
      }
    },
    y: {
      ticks: {
        color: themeStore.isLight ? GRAY_700 : GRAY_200
      },
      grid: {
        color: themeStore.isLight ? GRAY_200 : GRAY_800
      }
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        // format traffic bytes
        label: function (context: any) {
          let label = context.dataset.label || ''

          if (label) {
            label += ': '
          }
          if (context.parsed.x !== null) {
            label += byteFormat1024(context.parsed.x)
          }
          return label
        }
      }
    },
    // hide legend
    legend: {
      display: false
    }
  },
  animation: {
    duration: 1,
    onComplete: function ({ chart }: any) {
      const ctx = chart.ctx

      chart.config.data.datasets.forEach(function (dataset: any, i: number) {
        const meta = chart.getDatasetMeta(i)

        meta.data.forEach(function (bar: any, index: number) {
          const data = dataset.data[index]

          if (data) {
            ctx.fillStyle = themeStore.isLight ? GRAY_700 : GRAY_200
            ctx.fillText(byteFormat1024(Number(data)), bar.x + 5, bar.y + 5)
          }
        })
      })
    }
  }
}

const chartData: any = computed(() => {
  return { labels: props.labels, datasets: props.datasets }
})

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
</script>

<template>
  <div>
    <Bar :data="chartData" :options="options" />
  </div>
</template>
