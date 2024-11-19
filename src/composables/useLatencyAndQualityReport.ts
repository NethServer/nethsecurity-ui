//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { onMounted, onUnmounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { useThemeStore } from '@/stores/theme'
import { AMBER_500, AMBER_600, CYAN_500, CYAN_600, EMERALD_500, EMERALD_600 } from '@/lib/color'

export type LatencyOrQualityChart = {
  pingHost: string
  type: 'latency' | 'quality'
  labels: number[] // timestamps
  datasets: LatencyOrQualityDataset[]
}

type LatencyAndQualityData = {
  latency: ChartLabelsAndData
  quality: ChartLabelsAndData
}

type ChartLabelsAndData = {
  labels: string[]
  data: number[][]
}

interface LatencyOrQualityDataset {
  label: string
  borderColor: string
  backgroundColor: string
  data: number[]
  borderWidth: number
  radius: number
}

export function useLatencyAndQualityReport() {
  // random refresh interval between 20 and 30 seconds
  const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
  const { t } = useI18n()
  const themeStore = useThemeStore()
  const intervalId = ref(0)
  const latencyAndQualityCharts = ref<LatencyOrQualityChart[]>([])
  const loadingLatencyAndQualityReport = ref(true)
  const errorLatencyAndQualityReport = ref('')
  const errorLatencyAndQualityReportDetails = ref('')

  onMounted(() => {
    fetchLatencyAndQualityReport()

    // periodically reload data
    intervalId.value = setInterval(fetchLatencyAndQualityReport, REFRESH_INTERVAL)
  })

  onUnmounted(() => {
    if (intervalId.value) {
      clearInterval(intervalId.value)
    }
  })

  function buildQualityChart(latencyAndQualityData: LatencyAndQualityData, pingHost: string) {
    // convert timestamp to milliseconds
    const chartLabels = latencyAndQualityData.quality.data.map((d: number[]) => d[0] * 1000)
    const qualityData = latencyAndQualityData.quality.data.map((d: number[]) => d[1])

    const chartDatasets = [
      {
        label: t('standalone.real_time_monitor.packet_delivery_rate'),
        borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        data: qualityData,
        borderWidth: 1,
        radius: 0
      }
    ]

    const qualityChart = {
      pingHost,
      type: 'quality',
      labels: chartLabels,
      datasets: chartDatasets
    } as LatencyOrQualityChart
    return qualityChart
  }

  function buildLatencyChart(latencyAndQualityData: LatencyAndQualityData, pingHost: string) {
    // convert timestamp to milliseconds
    const chartLabels = latencyAndQualityData.latency.data.map((d: number[]) => d[0] * 1000)
    // show latency in milliseconds with one decimal
    const minLatencyData = latencyAndQualityData.latency.data.map((d: number[]) =>
      d[1] ? parseFloat(d[1].toFixed(1)) : null
    )
    const maxLatencyData = latencyAndQualityData.latency.data.map((d: number[]) =>
      d[2] ? parseFloat(d[2].toFixed(1)) : null
    )
    const avgLatencyData = latencyAndQualityData.latency.data.map((d: number[]) =>
      d[3] ? parseFloat(d[3].toFixed(1)) : null
    )

    const chartDatasets = [
      {
        label: t('standalone.real_time_monitor.min_latency'),
        borderColor: themeStore.isLight ? EMERALD_600 : EMERALD_500,
        backgroundColor: themeStore.isLight ? EMERALD_600 : EMERALD_500,
        data: minLatencyData,
        borderWidth: 1,
        radius: 0
      },
      {
        label: t('standalone.real_time_monitor.max_latency'),
        borderColor: themeStore.isLight ? AMBER_600 : AMBER_500,
        backgroundColor: themeStore.isLight ? AMBER_600 : AMBER_500,
        data: maxLatencyData,
        borderWidth: 1,
        radius: 0
      },
      {
        label: t('standalone.real_time_monitor.avg_latency'),
        borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        data: avgLatencyData,
        borderWidth: 1,
        radius: 0
      }
    ]

    const latencyChart = {
      pingHost,
      type: 'latency',
      labels: chartLabels,
      datasets: chartDatasets
    } as LatencyOrQualityChart
    return latencyChart
  }

  async function fetchLatencyAndQualityReport() {
    errorLatencyAndQualityReport.value = ''
    errorLatencyAndQualityReportDetails.value = ''

    try {
      const res = await ubusCall('ns.report', 'latency-and-quality-report')
      latencyAndQualityCharts.value = []

      for (const [pingHost, latencyAndQualityData] of Object.entries(res.data) as [
        string,
        LatencyAndQualityData
      ][]) {
        if (latencyAndQualityData.latency.data.length > 0) {
          const latencyChart = buildLatencyChart(latencyAndQualityData, pingHost)
          latencyAndQualityCharts.value.push(latencyChart)
        }

        if (latencyAndQualityData.quality.data.length > 0) {
          const qualityChart = buildQualityChart(latencyAndQualityData, pingHost)
          latencyAndQualityCharts.value.push(qualityChart)
        }
      }
    } catch (err: any) {
      console.error(err)
      errorLatencyAndQualityReport.value = t(getAxiosErrorMessage(err))
      errorLatencyAndQualityReportDetails.value = err.toString()
    } finally {
      loadingLatencyAndQualityReport.value = false
    }
  }

  return {
    latencyAndQualityCharts,
    fetchLatencyAndQualityReport,
    loadingLatencyAndQualityReport,
    errorLatencyAndQualityReport,
    errorLatencyAndQualityReportDetails
  }
}
