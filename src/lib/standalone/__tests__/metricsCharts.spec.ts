//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest'
import {
  buildTemperatureChart,
  getTemperatureChips,
  type MetricsData
} from '@/lib/standalone/metricsCharts'
import { AMBER_600, CYAN_600, INDIGO_600, ROSE_500, ROSE_600 } from '@/lib/color'

const EMPTY_SERIES = { labels: [], datasets: [] }

function metricsWith(temperature: MetricsData['temperature']): MetricsData {
  return {
    connections: EMPTY_SERIES,
    traffic: {},
    cpu: EMPTY_SERIES,
    load: EMPTY_SERIES,
    diskio: EMPTY_SERIES,
    disk: EMPTY_SERIES,
    processes: EMPTY_SERIES,
    memory: EMPTY_SERIES,
    packets: EMPTY_SERIES,
    temperature
  }
}

const METRICS = metricsWith({
  'k10temp-pci-00c3': {
    labels: [100, 160],
    datasets: [
      { label: 'temp1', data: [43.5, null] },
      { label: 'temp2', data: [41, 42] },
      { label: 'High', data: [70, 70], threshold: 'max' },
      { label: 'Critical', data: [100, 100], threshold: 'crit' }
    ]
  },
  'acpitz-acpi-0': { labels: [], datasets: [] }
})

describe('getTemperatureChips', () => {
  it('returns chip names sorted', () => {
    expect(getTemperatureChips(METRICS)).toEqual(['acpitz-acpi-0', 'k10temp-pci-00c3'])
  })

  it('returns an empty list without temperature data', () => {
    expect(getTemperatureChips(null)).toEqual([])
    expect(getTemperatureChips(metricsWith(undefined))).toEqual([])
  })
})

describe('buildTemperatureChart', () => {
  it('returns null for missing or empty chips', () => {
    expect(buildTemperatureChart('k10temp-pci-00c3', null, true)).toBeNull()
    expect(buildTemperatureChart('missing', METRICS, true)).toBeNull()
    expect(buildTemperatureChart('acpitz-acpi-0', METRICS, true)).toBeNull()
  })

  it('converts labels to milliseconds and keeps gaps', () => {
    const chart = buildTemperatureChart('k10temp-pci-00c3', METRICS, true)!
    expect(chart.labels).toEqual([100000, 160000])
    expect(chart.datasets[0]).toMatchObject({ label: 'temp1', data: [43.5, null] })
  })

  it('draws sensors as solid lines and thresholds as dashed lines', () => {
    const datasets = buildTemperatureChart('k10temp-pci-00c3', METRICS, true)!.datasets as Record<
      string,
      unknown
    >[]
    expect(datasets[0]).toMatchObject({ borderColor: CYAN_600 })
    expect(datasets[0]).not.toHaveProperty('borderDash')
    expect(datasets[1]).toMatchObject({ borderColor: INDIGO_600 })
    expect(datasets[2]).toMatchObject({ label: 'High', borderColor: AMBER_600, borderDash: [6, 4] })
    expect(datasets[3]).toMatchObject({
      label: 'Critical',
      borderColor: ROSE_600,
      borderDash: [2, 3]
    })
  })

  it('uses dark palette colors in dark mode', () => {
    const datasets = buildTemperatureChart('k10temp-pci-00c3', METRICS, false)!.datasets as Record<
      string,
      unknown
    >[]
    expect(datasets[3]).toMatchObject({ borderColor: ROSE_500 })
  })
})
