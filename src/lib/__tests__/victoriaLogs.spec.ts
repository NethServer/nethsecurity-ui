//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { describe, it, expect } from 'vitest'
import {
  NO_LEVEL,
  bootTimes,
  buildLogsQuery,
  findRegExp,
  sortNewestFirst,
  timeTicks,
  withFind,
  type LogFilters
} from '@/lib/standalone/victoriaLogs'

const empty: LogFilters = { search: '', logsql: false, services: [], hiddenLevels: [] }

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

  it('excludes words and phrases with a leading dash', () => {
    expect(buildLogsQuery({ ...empty, search: 'error -dnsmasq -"query[A]"' })).toBe(
      'i("error"*) -i("dnsmasq"*) -i("query[A]")'
    )
    expect(buildLogsQuery({ ...empty, search: '-' })).toBe('i("-"*)')
  })

  it('matches /regex/ case-insensitively, also excluded', () => {
    expect(buildLogsQuery({ ...empty, search: '/oom|segfault/ -/^DHCP\\/v6/' })).toBe(
      '~"(?i)oom|segfault" -~"(?i)^DHCP\\\\/v6"'
    )
  })

  it('reads a path as a word, not a regex', () => {
    expect(buildLogsQuery({ ...empty, search: '/etc/config/network' })).toBe(
      'i("/etc/config/network"*)'
    )
  })

  it('sends LogsQL as is, grouped before the other filters', () => {
    expect(
      buildLogsQuery({ ...empty, logsql: true, search: 'a or b', services: ['dropbear'] })
    ).toBe('(a or b) app_name:in("dropbear")')
    expect(buildLogsQuery({ ...empty, logsql: true, search: '  ' })).toBe('*')
  })
})

describe('find', () => {
  it('adds the find text as a prefix filter', () => {
    expect(withFind('*', 'oom')).toBe('i("oom"*)')
    expect(withFind('app_name:in("kernel")', 'out of "mem')).toBe(
      'app_name:in("kernel") i("out of \\"mem"*)'
    )
  })

  it('matches at the start of a word, in any case', () => {
    const re = findRegExp('oom')
    expect(re.test('Out of memory: OOM killer')).toBe(true)
    expect(re.test('oom-kill:constraint')).toBe(true)
    expect(re.test('zoom in')).toBe(false)
    expect(findRegExp('a.b').test('axb')).toBe(false)
  })
})

describe('sortNewestFirst', () => {
  it('orders by the full timestamp, trimmed zeros included', () => {
    const lines = ['13:55:50.0015Z', '13:55:50.001548Z', '13:55:51Z', '13:55:50.1Z'].map(
      (time) => ({ _time: `2026-11-16T${time}`, _msg: '', _stream_id: '' })
    )
    expect(sortNewestFirst(lines).map((l) => l._time.slice(11))).toEqual([
      '13:55:51Z',
      '13:55:50.1Z',
      '13:55:50.001548Z',
      '13:55:50.0015Z'
    ])
  })
})

describe('bootTimes', () => {
  it('keeps one time per boot', () => {
    expect(bootTimes([1793009416, 1793009415, 1792748769, 1793009415])).toEqual([
      1792748769_000, 1793009415_000
    ])
  })
})
