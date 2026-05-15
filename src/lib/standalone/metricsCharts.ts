//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

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

// ── Helper functions ──────────────────────────────────────────────────────────

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
  colorsDark: string[],
  isLight: boolean
): object[] {
  const palette = isLight ? colorsLight : colorsDark
  return series.datasets.map((ds, i) => makeDataset(ds, palette[i % palette.length]!))
}

function buildTrafficDatasets(series: MetricSeries, isLight: boolean): object[] {
  return buildDatasets(series, [CYAN_600, INDIGO_600], [CYAN_500, INDIGO_500], isLight)
}

function buildLatencyDatasets(series: MetricSeries, isLight: boolean): object[] {
  return buildDatasets(
    series,
    [EMERALD_600, AMBER_600, ROSE_600],
    [EMERALD_500, AMBER_500, ROSE_500],
    isLight
  )
}

function buildQualityDatasets(series: MetricSeries, isLight: boolean): object[] {
  return buildDatasets(series, [INDIGO_600], [INDIGO_500], isLight)
}

// ── Chart options (plain objects – they never change) ─────────────────────────

export const byteAxisOptions = {
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

export const latencyOptions = {
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

export const qualityOptions = {
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

// ── Chart builders ────────────────────────────────────────────────────────────

export function buildCpuChart(metrics: MetricsData | null, isLight: boolean): ChartData | null {
  if (!metrics) return null
  const s = metrics.cpu
  return { labels: toMs(s.labels), datasets: buildDatasets(s, [AMBER_600], [AMBER_500], isLight) }
}

export function buildLoadChart(metrics: MetricsData | null, isLight: boolean): ChartData | null {
  if (!metrics) return null
  const s = metrics.load
  return {
    labels: toMs(s.labels),
    datasets: buildDatasets(
      s,
      [EMERALD_600, CYAN_600, VIOLET_600],
      [EMERALD_500, CYAN_500, VIOLET_500],
      isLight
    )
  }
}

export function buildDiskioChart(metrics: MetricsData | null, isLight: boolean): ChartData | null {
  if (!metrics) return null
  const s = metrics.diskio
  return {
    labels: toMs(s.labels),
    datasets: buildDatasets(s, [CYAN_600, ROSE_600], [CYAN_500, ROSE_500], isLight)
  }
}

export function buildDiskChart(metrics: MetricsData | null, isLight: boolean): ChartData | null {
  if (!metrics) return null
  const s = metrics.disk
  return {
    labels: toMs(s.labels),
    datasets: buildDatasets(s, PALETTE_LIGHT, PALETTE_DARK, isLight)
  }
}

export function buildProcessesChart(
  metrics: MetricsData | null,
  isLight: boolean
): ChartData | null {
  if (!metrics) return null
  const s = metrics.processes
  return {
    labels: toMs(s.labels),
    datasets: buildDatasets(s, [FUCHSIA_600], [FUCHSIA_500], isLight)
  }
}

export function buildMemoryChart(metrics: MetricsData | null, isLight: boolean): ChartData | null {
  if (!metrics) return null
  const s = metrics.memory
  return {
    labels: toMs(s.labels),
    datasets: buildDatasets(s, [INDIGO_600, CYAN_600], [INDIGO_500, CYAN_500], isLight)
  }
}

export function buildPacketsChart(metrics: MetricsData | null, isLight: boolean): ChartData | null {
  if (!metrics) return null
  const s = metrics.packets
  return {
    labels: toMs(s.labels),
    datasets: buildDatasets(s, [CYAN_600, INDIGO_600], [CYAN_500, INDIGO_500], isLight)
  }
}

export function buildConnectionsChart(
  metrics: MetricsData | null,
  isLight: boolean
): ChartData | null {
  if (!metrics) return null
  const s = metrics.connections
  return {
    labels: toMs(s.labels),
    datasets: buildDatasets(s, [EMERALD_600], [EMERALD_500], isLight)
  }
}

export function buildTrafficChart(
  iface: string,
  metrics: MetricsData | null,
  isLight: boolean
): ChartData | null {
  if (!metrics?.traffic[iface]) return null
  const s = metrics.traffic[iface]
  return { labels: toMs(s.labels), datasets: buildTrafficDatasets(s, isLight) }
}

export function buildLatencyChart(hostData: PingHost, isLight: boolean): ChartData | null {
  if (!hostData.latency?.labels?.length) return null
  return {
    labels: toMs(hostData.latency.labels),
    datasets: buildLatencyDatasets(hostData.latency, isLight)
  }
}

export function buildQualityChart(hostData: PingHost, isLight: boolean): ChartData | null {
  if (!hostData.quality?.labels?.length) return null
  return {
    labels: toMs(hostData.quality.labels),
    datasets: buildQualityDatasets(hostData.quality, isLight)
  }
}

// ── Utility helpers ───────────────────────────────────────────────────────────

export function getTrafficInterfaces(metrics: MetricsData | null): string[] {
  if (!metrics) return []
  return Object.keys(metrics.traffic).sort()
}

export function getInterfaceDisplayName(iface: string, metrics: MetricsData | null): string {
  if (!metrics?.traffic[iface]) return iface
  const data = metrics.traffic[iface]
  if (data.zone && data.device) {
    return `${data.zone} (${data.device})`
  }
  return iface
}

export function getLatencyQuality(metrics: MetricsData | null): Record<string, PingHost> {
  return metrics?.latency_quality ?? {}
}
