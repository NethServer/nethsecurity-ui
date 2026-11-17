//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import axios from 'axios'
import { escapeRegExp } from 'lodash-es'
import {
  AMBER_600,
  CYAN_600,
  FUCHSIA_500,
  FUCHSIA_600,
  GRAY_500,
  INDIGO_500,
  ROSE_600
} from '@/lib/color'
import { getStandaloneApiEndpoint } from '@/lib/config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

// single log line as stored by VictoriaLogs from rsyslog, plus any other field it carries
export interface LogEntry {
  _time: string
  _msg: string
  _stream_id: string
  app_name?: string
  level?: string
  [field: string]: string | undefined
}

export interface LogHitsSeries {
  fields: Record<string, string>
  timestamps: string[]
  values: number[]
  total: number
}

export interface LogFilters {
  search: string
  // search is sent as LogsQL instead of being parsed as grep-like words
  logsql: boolean
  services: string[]
  hiddenLevels: string[]
}

// lines without a level, `-` is never a real level name
export const NO_LEVEL = '-'

// syslog levels from most to least severe, as VictoriaLogs names them
export const LEVEL_ORDER = [
  'emergency',
  'alert',
  'critical',
  'error',
  'warning',
  'notice',
  'info',
  'debug'
]

// checked with the dataviz palette validator against white and gray-950
const LEVEL_COLORS: Record<string, { light: string; dark: string }> = {
  emergency: { light: ROSE_600, dark: ROSE_600 },
  alert: { light: ROSE_600, dark: ROSE_600 },
  critical: { light: ROSE_600, dark: ROSE_600 },
  error: { light: ROSE_600, dark: ROSE_600 },
  warning: { light: AMBER_600, dark: AMBER_600 },
  notice: { light: FUCHSIA_600, dark: FUCHSIA_500 },
  info: { light: CYAN_600, dark: CYAN_600 },
  debug: { light: INDIGO_500, dark: INDIGO_500 }
}

// same colors as LEVEL_COLORS, as classes for templates
const LEVEL_DOT_CLASSES: Record<string, string> = {
  emergency: 'bg-rose-600',
  alert: 'bg-rose-600',
  critical: 'bg-rose-600',
  error: 'bg-rose-600',
  warning: 'bg-amber-600',
  notice: 'bg-fuchsia-600 dark:bg-fuchsia-500',
  info: 'bg-cyan-600',
  debug: 'bg-indigo-500'
}

export function levelColor(level: string, isLight: boolean) {
  const color = LEVEL_COLORS[level]
  return color ? (isLight ? color.light : color.dark) : GRAY_500
}

export function levelDotClass(level: string) {
  return LEVEL_DOT_CLASSES[level] ?? 'bg-gray-500'
}

/** GET on the VictoriaLogs API through the API server; `text` keeps the JSON lines response as a string */
export function getLogs<T>(
  path: string,
  params: Record<string, string | number>,
  text = false,
  signal?: AbortSignal
) {
  const loginStore = useLoginStore()
  return axios.get<T>(`${getStandaloneApiEndpoint()}/logs/${path}`, {
    params,
    headers: { Authorization: `Bearer ${loginStore.token}` },
    responseType: text ? 'text' : 'json',
    signal
  })
}

/** `_time` with nanoseconds padded to 9 digits, VictoriaLogs trims trailing zeros, so these sort as strings */
export function logTimeKey(time: string) {
  return time.replace(/(?:\.(\d+))?Z$/, (_, fraction = '') => `.${fraction.padEnd(9, '0')}Z`)
}

/** Sorts lines newest first in place, a query with a limit returns them only roughly ordered */
export function sortNewestFirst(lines: LogEntry[]) {
  return lines.sort((a, b) => {
    const ka = logTimeKey(a._time)
    const kb = logTimeKey(b._time)
    return ka < kb ? 1 : ka > kb ? -1 : 0
  })
}

/** Parses a `/select/logsql/query` response, one JSON object per line */
export function parseLogLines(data: string) {
  return data
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as LogEntry)
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

// a leading `-` excludes; then a quoted phrase, a /regex/ standing alone, or a word
const SEARCH_TOKEN = /(-?)(?:"([^"]*)"|\/((?:\\.|[^/\\])+)\/(?=\s|$)|(\S+))/g

/** Builds the LogsQL filter for the given filters; `withLevels` false leaves the level filter out */
export function buildLogsQuery(filters: LogFilters, withLevels = true): string {
  const parts: string[] = []
  if (filters.logsql) {
    if (filters.search.trim()) {
      parts.push(`(${filters.search})`)
    }
  } else {
    // like grep -i: words match as prefixes, phrases exactly, regexes anywhere
    for (const [, not, phrase, regexp, word] of filters.search.matchAll(SEARCH_TOKEN)) {
      if (phrase) {
        parts.push(`${not}i(${quote(phrase)})`)
      } else if (regexp) {
        parts.push(`${not}~${quote(`(?i)${regexp}`)}`)
      } else if (word) {
        parts.push(`${not}i(${quote(word)}*)`)
      }
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

/** Adds the find filter to a query from buildLogsQuery: the text matches as a case-insensitive prefix */
export function withFind(query: string, find: string) {
  const filter = `i(${quote(find)}*)`
  return query === '*' ? filter : `${query} ${filter}`
}

/** Matches the find text in a message where withFind matches it: at the start of a word, any case */
export function findRegExp(find: string) {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(find)}`, 'iu')
}

/** Boot times in unix ms, one per boot, from `timestamp(system_uptime) - system_uptime` values in seconds */
export function bootTimes(values: number[]) {
  const boots: number[] = []
  for (const value of [...values].sort((a, b) => a - b)) {
    // the same boot computes to a slightly different second from each sample
    if (!boots.length || value * 1000 - boots.at(-1)! > 60_000) {
      boots.push(value * 1000)
    }
  }
  return boots
}
