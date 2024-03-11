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
import { byteFormat1024 } from '@nethserver/vue-tailwind-lib'
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
  }
}

const chartData: any = computed(() => {
  return { labels: props.labels, datasets: props.datasets }
})

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
</script>

<template>
  <Bar :data="chartData" :options="options" />
</template>
