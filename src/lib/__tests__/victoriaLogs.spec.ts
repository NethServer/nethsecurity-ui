//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import { NO_LEVEL, buildLogsQuery, timeTicks, type LogFilters } from '@/lib/standalone/victoriaLogs'

const empty: LogFilters = { search: '', services: [], hiddenLevels: [] }

describe('timeTicks', () => {
  const HOUR = 3600_000
  const start = new Date(2026, 10, 3, 12, 43, 17).getTime()

  it('places 24h ticks on round local hours within the range', () => {
    const { ticks, stepMs } = timeTicks(start, start + 24 * HOUR, 12)
    expect(stepMs).toBe(2 * HOUR)
    expect(ticks).toHaveLength(12)
    expect(ticks[0]).toBeGreaterThanOrEqual(start)
    expect(ticks.at(-1)).toBeLessThanOrEqual(start + 24 * HOUR)
    for (const tick of ticks) {
      const d = new Date(tick)
      expect([d.getMinutes(), d.getSeconds(), d.getHours() % 2]).toEqual([0, 0, 0])
    }
  })

  it('puts daily ticks on local midnight', () => {
    const { ticks } = timeTicks(start, start + 7 * 24 * HOUR, 8)
    expect(ticks).toHaveLength(7)
    expect(ticks.every((tick) => new Date(tick).getHours() === 0)).toBe(true)
  })

  it('never exceeds maxTicks', () => {
    for (const span of [60_000, 15 * 60_000, HOUR, 6 * HOUR, 30 * 24 * HOUR]) {
      expect(timeTicks(start, start + span, 5).ticks.length).toBeLessThanOrEqual(5)
    }
  })
})

describe('buildLogsQuery', () => {
  it('matches everything when no filter is set', () => {
    expect(buildLogsQuery(empty)).toBe('*')
    expect(buildLogsQuery({ ...empty, search: '   ' })).toBe('*')
  })

  it('escapes quotes and backslashes so search text cannot break out of the phrase', () => {
    expect(buildLogsQuery({ ...empty, search: 'a\\b' })).toBe('i("a\\\\b"*)')
    expect(buildLogsQuery({ ...empty, search: 'x") | delete' })).toBe(
      'i("x\\")"*) i("|"*) i("delete"*)'
    )
  })

  it('treats LogsQL syntax in search as plain text', () => {
    expect(buildLogsQuery({ ...empty, search: '* | stats count()' })).toBe(
      'i("*"*) i("|"*) i("stats"*) i("count()"*)'
    )
  })

  it('matches words as prefixes and quoted phrases exactly', () => {
    expect(buildLogsQuery({ ...empty, search: 'Exit "Disconnect received"  root' })).toBe(
      'i("Exit"*) i("Disconnect received") i("root"*)'
    )
  })

  it('skips an empty quoted phrase', () => {
    expect(buildLogsQuery({ ...empty, search: '""' })).toBe('*')
  })

  it('excludes hidden levels only when asked to', () => {
    const filters = { ...empty, services: ['dropbear'], hiddenLevels: ['info', 'debug'] }
    expect(buildLogsQuery(filters)).toBe('app_name:in("dropbear") -level:in("info","debug")')
    expect(buildLogsQuery(filters, false)).toBe('app_name:in("dropbear")')
  })

  it('hides lines without a level with an empty value filter', () => {
    expect(buildLogsQuery({ ...empty, hiddenLevels: [NO_LEVEL] })).toBe('-level:""')
    expect(buildLogsQuery({ ...empty, hiddenLevels: ['info', NO_LEVEL] })).toBe(
      '-level:in("info") -level:""'
    )
  })

  it('quotes service names with special characters', () => {
    expect(buildLogsQuery({ ...empty, services: ['openvpn(ns_roadwarrior1)', 'dropbear'] })).toBe(
      'app_name:in("openvpn(ns_roadwarrior1)","dropbear")'
    )
  })
})
