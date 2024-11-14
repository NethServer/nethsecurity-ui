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
import { useThemeStore } from '@/stores/theme'
import { GRAY_200, GRAY_700, GRAY_800 } from '@/lib/color'
import { byteFormat1024 } from '@nethesis/vue-components'

const themeStore = useThemeStore()

const props = withDefaults(
  defineProps<{
    labels: string[]
    datasets: any[]
    height?: string
    isHorizontal?: boolean
    showLegend?: boolean
    showValuesOnBars?: boolean
    byteFormat?: boolean
  }>(),
  { height: '', isHorizontal: false, showLegend: false, showValuesOnBars: true, byteFormat: false }
)

const options: any = {
  indexAxis: props.isHorizontal ? 'y' : 'x',
  scales: {
    x: {
      ticks: {
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
    legend: {
      display: props.showLegend
    },
    tooltip: {
      callbacks: {
        label: function (context: any) {
          let label = context.dataset.label || ''

          if (label) {
            label += ': '
          }
          if (context.parsed.x !== null) {
            if (props.byteFormat) {
              label += byteFormat1024(context.parsed.x)
            } else {
              label += context.parsed.x.toLocaleString()
            }
          }
          return label
        }
      }
    }
  },
  animation:
    props.showValuesOnBars && props.isHorizontal
      ? {
          duration: 1,
          onComplete: function ({ chart }: any) {
            const ctx = chart.ctx

            chart.config.data.datasets.forEach(function (dataset: any, i: number) {
              const meta = chart.getDatasetMeta(i)

              meta.data.forEach(function (bar: any, index: number) {
                const data = dataset.data[index]

                if (data) {
                  ctx.fillStyle = themeStore.isLight ? GRAY_700 : GRAY_200
                  ctx.fillText(Number(data).toLocaleString(), bar.x + 5, bar.y + 5)
                }
              })
            })
          }
        }
      : {}
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
