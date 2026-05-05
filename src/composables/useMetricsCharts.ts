//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, type Ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { byteFormat1024 } from '@nethesis/vue-components'
import {
  AMBER_500,
  AMBER_600,
  CYAN_500,
  CYAN_600,
  EMERALD_500,
  EMERALD_600,
  FUCHSIA_500,
  FUCHSIA_600,
  INDIGO_500,
  INDIGO_600,
  ROSE_500,
  ROSE_600,
  VIOLET_500,
  VIOLET_600
} from '@/lib/color'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MetricDataset {
  label: string
  data: number[]
}

export interface MetricSeries {
  labels: number[]
  datasets: MetricDataset[]
}

export interface TrafficInterface extends MetricSeries {
  zone?: string
  device?: string
}

export interface PingHost {
  latency: MetricSeries
  quality: MetricSeries
}

export interface MetricsData {
  connections: MetricSeries
  traffic: Record<string, TrafficInterface>
  cpu: MetricSeries
  load: MetricSeries
  diskio: MetricSeries
  disk: MetricSeries
  processes: MetricSeries
  memory: MetricSeries
  packets: MetricSeries
  latency_quality?: Record<string, PingHost>
}

export interface ChartData {
  labels: number[]
  datasets: object[]
}

// ── Color palette ─────────────────────────────────────────────────────────────

const PALETTE_LIGHT = [
  CYAN_600,
  INDIGO_600,
  EMERALD_600,
  ROSE_600,
  AMBER_600,
  VIOLET_600,
  FUCHSIA_600
]
const PALETTE_DARK = [
  CYAN_500,
  INDIGO_500,
  EMERALD_500,
  ROSE_500,
  AMBER_500,
  VIOLET_500,
  FUCHSIA_500
]

// ── Composable ────────────────────────────────────────────────────────────────

export function useMetricsCharts(metrics: Ref<MetricsData | null>) {
  const themeStore = useThemeStore()

  function toMs(labels: number[]): number[] {
    return labels.map((s) => s * 1000)
  }

  function makeDataset(ds: MetricDataset, color: string) {
    return {
      label: ds.label,
      data: ds.data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 1.5,
      radius: 0,
      tension: 0
    }
  }

  function buildDatasets(
    series: MetricSeries,
    colorsLight: string[],
    colorsDark: string[]
  ): object[] {
    const palette = themeStore.isLight ? colorsLight : colorsDark
    return series.datasets.map((ds, i) => makeDataset(ds, palette[i % palette.length]!))
  }

  function buildTrafficDatasets(series: MetricSeries): object[] {
    return buildDatasets(series, [CYAN_600, INDIGO_600], [CYAN_500, INDIGO_500])
  }

  function buildLatencyDatasets(series: MetricSeries): object[] {
    return buildDatasets(
      series,
      [EMERALD_600, AMBER_600, ROSE_600],
      [EMERALD_500, AMBER_500, ROSE_500]
    )
  }

  function buildQualityDatasets(series: MetricSeries): object[] {
    return buildDatasets(series, [INDIGO_600], [INDIGO_500])
  }

  // ── Chart options (plain objects – they never change) ─────────────────────

  const byteAxisOptions = {
    scales: {
      y: { ticks: { callback: (value: number) => byteFormat1024(Math.abs(value)) } }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => {
            const label = ctx.dataset.label ? `${ctx.dataset.label}: ` : ''
            return label + byteFormat1024(Math.abs(ctx.parsed.y))
          }
        }
      }
    }
  }

  const latencyOptions = {
    scales: {
      y: { ticks: { callback: (value: number) => `${Math.round(value)} ms` } }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => {
            const label = ctx.dataset.label ? `${ctx.dataset.label}: ` : ''
            return label + `${Math.round(ctx.parsed.y)} ms`
          }
        }
      }
    }
  }

  const qualityOptions = {
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (value: number) => `${Math.round(value)}%` }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => {
            const label = ctx.dataset.label ? `${ctx.dataset.label}: ` : ''
            return label + `${Math.round(ctx.parsed.y)}%`
          }
        }
      }
    }
  }

  // ── Computed chart data ───────────────────────────────────────────────────

  const cpuChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.cpu
    return { labels: toMs(s.labels), datasets: buildDatasets(s, [AMBER_600], [AMBER_500]) }
  })

  const loadChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.load
    return {
      labels: toMs(s.labels),
      datasets: buildDatasets(
        s,
        [EMERALD_600, CYAN_600, VIOLET_600],
        [EMERALD_500, CYAN_500, VIOLET_500]
      )
    }
  })

  const diskioChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.diskio
    return {
      labels: toMs(s.labels),
      datasets: buildDatasets(s, [CYAN_600, ROSE_600], [CYAN_500, ROSE_500])
    }
  })

  const diskChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.disk
    return { labels: toMs(s.labels), datasets: buildDatasets(s, PALETTE_LIGHT, PALETTE_DARK) }
  })

  const processesChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.processes
    return { labels: toMs(s.labels), datasets: buildDatasets(s, [FUCHSIA_600], [FUCHSIA_500]) }
  })

  const memoryChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.memory
    return {
      labels: toMs(s.labels),
      datasets: buildDatasets(s, [INDIGO_600, CYAN_600], [INDIGO_500, CYAN_500])
    }
  })

  const trafficInterfaces = computed<string[]>(() => {
    if (!metrics.value) return []
    return Object.keys(metrics.value.traffic).sort()
  })

  function getInterfaceDisplayName(iface: string): string {
    if (!metrics.value?.traffic[iface]) return iface
    const data = metrics.value.traffic[iface]
    if (data.zone && data.device) {
      return `${data.zone} (${data.device})`
    }
    return iface
  }

  function getInterfaceTrafficChart(iface: string): ChartData | null {
    if (!metrics.value?.traffic[iface]) return null
    const s = metrics.value.traffic[iface]
    return { labels: toMs(s.labels), datasets: buildTrafficDatasets(s) }
  }

  const packetsChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.packets
    return {
      labels: toMs(s.labels),
      datasets: buildDatasets(s, [CYAN_600, INDIGO_600], [CYAN_500, INDIGO_500])
    }
  })

  const connectionsChart = computed<ChartData | null>(() => {
    if (!metrics.value) return null
    const s = metrics.value.connections
    return { labels: toMs(s.labels), datasets: buildDatasets(s, [EMERALD_600], [EMERALD_500]) }
  })

  const latencyQuality = computed<Record<string, PingHost>>(() => {
    return metrics.value?.latency_quality ?? {}
  })

  function getLatencyChart(hostData: PingHost): ChartData | null {
    if (!hostData.latency?.labels?.length) return null
    return {
      labels: toMs(hostData.latency.labels),
      datasets: buildLatencyDatasets(hostData.latency)
    }
  }

  function getQualityChart(hostData: PingHost): ChartData | null {
    if (!hostData.quality?.labels?.length) return null
    return {
      labels: toMs(hostData.quality.labels),
      datasets: buildQualityDatasets(hostData.quality)
    }
  }

  return {
    cpuChart,
    loadChart,
    diskioChart,
    diskChart,
    processesChart,
    memoryChart,
    trafficInterfaces,
    getInterfaceDisplayName,
    getInterfaceTrafficChart,
    packetsChart,
    connectionsChart,
    latencyQuality,
    getLatencyChart,
    getQualityChart,
    byteAxisOptions,
    latencyOptions,
    qualityOptions
  }
}
