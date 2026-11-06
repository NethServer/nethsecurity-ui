//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { AMBER_500, CYAN_500, GRAY_400, PINK_500, ROSE_500 } from '@/lib/color'

// single log line as stored by VictoriaLogs from rsyslog
export interface LogEntry {
  _time: string
  _msg: string
  _stream_id: string
  app_name?: string
  level?: string
}

export interface LogHitsSeries {
  fields: Record<string, string>
  timestamps: string[]
  values: number[]
  total: number
}

export interface LogFilters {
  search: string
  services: string[]
  hiddenLevels: string[]
}

// lines without a level, `-` is never a real level name
export const NO_LEVEL = '-'

export const LEVEL_COLORS: Record<string, string> = {
  emergency: ROSE_500,
  alert: ROSE_500,
  critical: ROSE_500,
  error: ROSE_500,
  warning: AMBER_500,
  notice: PINK_500,
  info: CYAN_500,
  debug: GRAY_400
}

/** Local time for a unix-ms timestamp, detailed enough to tell apart points in a range `spanMs` long */
export function formatLogTime(
  ms: number,
  locale: string,
  spanMs: number,
  withDate = spanMs > 2 * 24 * 3600_000
) {
  return new Date(ms).toLocaleString(locale, {
    ...(withDate ? { day: '2-digit', month: '2-digit' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    ...(spanMs <= 10 * 60_000 ? { second: '2-digit' } : {})
  })
}

const TICK_STEPS_MS = [
  10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400, 172800, 604800
].map((s) => s * 1000)

/** Axis ticks at round local times between start and end, at most `maxTicks` unless the range needs more than weekly ones */
export function timeTicks(start: number, end: number, maxTicks: number) {
  const stepMs =
    TICK_STEPS_MS.find((step) => (end - start) / step <= maxTicks) ?? TICK_STEPS_MS.at(-1)!
  // shortcut: aligns with the UTC offset at `start`, ticks after a DST change are off by the shift; align each tick if that matters
  const offset = new Date(start).getTimezoneOffset() * 60_000
  const ticks: number[] = []
  for (let t = Math.ceil((start - offset) / stepMs) * stepMs + offset; t <= end; t += stepMs) {
    ticks.push(t)
  }
  return { ticks, stepMs }
}

function quote(value: string) {
  // LogsQL quoted strings follow Go escaping, which JSON escaping is a subset of
  return JSON.stringify(value)
}

/** Builds the LogsQL filter for the given filters; `withLevels` false leaves the level filter out */
export function buildLogsQuery(filters: LogFilters, withLevels = true): string {
  const parts: string[] = []
  // quoted phrases match exactly, every other word matches as a prefix
  for (const match of filters.search.matchAll(/"([^"]*)"|(\S+)/g)) {
    if (match[1]) {
      parts.push(`i(${quote(match[1])})`)
    } else if (match[2]) {
      parts.push(`i(${quote(match[2])}*)`)
    }
  }
  if (filters.services.length) {
    parts.push(`app_name:in(${filters.services.map(quote).join(',')})`)
  }
  if (withLevels) {
    const named = filters.hiddenLevels.filter((level) => level !== NO_LEVEL)
    if (named.length) {
      parts.push(`-level:in(${named.map(quote).join(',')})`)
    }
    // `in("")` doesn't match a missing field, an empty value filter does
    if (filters.hiddenLevels.includes(NO_LEVEL)) {
      parts.push('-level:""')
    }
  }
  return parts.length ? parts.join(' ') : '*'
}
