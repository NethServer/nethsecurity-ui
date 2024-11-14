<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import 'chartjs-adapter-date-fns'
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { GRAY_200, GRAY_700 } from '@/lib/color'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, registerables } from 'chart.js'
import { byteFormat1024 } from '@nethesis/vue-components'

const themeStore = useThemeStore()

const props = withDefaults(
  defineProps<{
    labels: string[]
    datasets: any[]
    height?: string
    byteFormat?: boolean
  }>(),
  { height: '', byteFormat: false }
)

const options: any = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: function (context: any) {
          let label = context.dataset.label || ''

          if (label) {
            label += ': '
          }
          if (context.parsed !== null) {
            if (props.byteFormat) {
              label += byteFormat1024(context.parsed)
            } else {
              label += context.parsed.toLocaleString()
            }
          }
          return label
        }
      }
    },
    legend: {
      position: 'right',
      labels: {
        // show dataset value and sort by pie slice
        generateLabels: function (chart: any) {
          const data = chart.data
          if (data.labels.length && data.datasets.length) {
            // Create an array of label-value pairs
            const labelValuePairs = data.labels.map((label: string, i: number) => {
              const value = data.datasets[0].data[i]
              return { label, value, index: i }
            })

            // Sort the array by value in descending order
            labelValuePairs.sort((a: any, b: any) => b.value - a.value)

            // Return the sorted labels
            return labelValuePairs.map(
              ({ label, value, index }: { label: string; value: number; index: number }) => {
                const meta = chart.getDatasetMeta(0)
                const ds = data.datasets[0]
                const arc = meta.data[index]
                const custom = (arc && arc.custom) || {}
                const formattedValue = props.byteFormat
                  ? byteFormat1024(value)
                  : value?.toLocaleString()
                return {
                  text: `${label}: ${formattedValue}`,
                  fontColor: themeStore.isLight ? GRAY_700 : GRAY_200,
                  fillStyle: custom.backgroundColor || ds.backgroundColor[index],
                  hidden: isNaN(ds.data[index]) || meta.data[index].hidden,
                  index: index
                }
              }
            )
          }
          return []
        }
      }
    }
  }
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

ChartJS.register(...registerables)
</script>

<template>
  <div>
    <Pie :data="chartData" :options="options" :style="chartStyle" />
  </div>
</template>
