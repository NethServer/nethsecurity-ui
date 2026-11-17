<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, nextTick, ref, useTemplateRef, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData
} from '@tanstack/vue-query'
import { refDebounced, useElementSize, useIntervalFn, useScroll } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowsRotate,
  faCalendarDay,
  faChevronDown,
  faChevronUp,
  faMagnifyingGlass,
  faPowerOff
} from '@fortawesome/free-solid-svg-icons'
import {
  NeButton,
  NeDropdownFilterV2,
  NeEmptyState,
  NeHeading,
  NeInlineNotification,
  NeSkeleton,
  NeSpinner,
  NeTextInput,
  NeToggle,
  NeTooltip,
  getAxiosErrorMessage,
  type NeDropdownFilterV2Option
} from '@nethesis/vue-components'
import LogsTimeline from '@/components/standalone/logs/LogsTimeline.vue'
import LogRow from '@/components/standalone/logs/LogRow.vue'
import LogDetailsDrawer from '@/components/standalone/logs/LogDetailsDrawer.vue'
import LogsTimeRange from '@/components/standalone/logs/LogsTimeRange.vue'
import {
  bootTimes,
  buildLogsQuery,
  findRegExp,
  formatLogTime,
  getLogs,
  parseLogLines,
  sortNewestFirst,
  withFind,
  type LogEntry,
  type LogHitsSeries
} from '@/lib/standalone/victoriaLogs'
import { vmQuery, vmQueryRange } from '@/lib/standalone/victoriaMetrics'

const PAGE_SIZE = 500
// how far a page looks past its cursor, an unbounded search opens every daily partition at once
const PAGE_SPAN_MS = 7 * 24 * 3600_000
const MAX_LINES = 50_000
// every list item is a single line of this height, so the virtualizer never has to measure
const ITEM_HEIGHT = 28
const BUCKETS = 60
const MIN_ZOOM_MS = 60_000
const PRESETS = { '15m': 15, '1h': 60, '6h': 360, '24h': 1440, '7d': 10080, '30d': 43200 }
type Preset = keyof typeof PRESETS | 'boot'
// boot time of the last uptime sample, in seconds
const BOOT_QUERY = 'timestamp(system_uptime) - system_uptime'

const { t, locale } = useI18n()
const queryClient = useQueryClient()

// items are encoded so a value containing a comma survives the round trip
const commaList = {
  get: (v: string) => (v ? v.split(',').map(decodeURIComponent) : []),
  set: (v: string[]) => v.map(encodeURIComponent).join(',')
}
const unixMs = {
  get: (v: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined),
  set: (v: number | undefined) => (v === undefined ? '' : String(v))
}

// every filter lives in the URL so a view can be shared or reloaded, and Back undoes a change
const search = useRouteQuery('q', '', { mode: 'push' })
const logsql = useRouteQuery<string, boolean>('logsql', '', {
  mode: 'push',
  transform: { get: (v) => v === '1', set: (v) => (v ? '1' : '') }
})
const serviceIds = useRouteQuery<string, string[]>('services', '', {
  mode: 'push',
  transform: commaList
})
const hiddenLevels = useRouteQuery<string, string[]>('hidden', '', {
  mode: 'push',
  transform: commaList
})
const preset = useRouteQuery<string, Preset>('range', '1h', {
  mode: 'push',
  transform: {
    get: (v) => (v === 'boot' || Object.hasOwn(PRESETS, v) ? (v as Preset) : '1h'),
    set: (v) => v
  }
})
const from = useRouteQuery<string, number | undefined>('from', '', {
  mode: 'push',
  transform: unixMs
})
const to = useRouteQuery<string, number | undefined>('to', '', { mode: 'push', transform: unixMs })

const now = ref(Date.now())
const follow = ref(false)
// the URL gets the search once typing stops, not one history entry per keystroke
const searchText = ref(search.value)
const debouncedSearch = refDebounced(searchText, 400)
watch(debouncedSearch, (value) => (search.value = value))
watch(search, (value) => (searchText.value = value))

const findText = ref('')
const debouncedFind = refDebounced(findText, 300)
const findTerm = computed(() => debouncedFind.value.trim())

const customRange = computed(() =>
  from.value !== undefined && to.value !== undefined && from.value < to.value
    ? { start: from.value, end: to.value }
    : undefined
)

const rangeOptions = computed(() => [
  { id: 'boot', label: t('standalone.logs.since_last_boot') },
  ...Object.keys(PRESETS).map((id) => ({ id, label: t(`standalone.logs.last_${id}`) }))
])
// a custom range reads as its start and end, a quick range as its name
const rangeLabel = computed(() =>
  customRange.value
    ? rangeText(customRange.value)
    : (rangeOptions.value.find((option) => option.id === preset.value)?.label ?? '')
)

function selectPreset(id: string) {
  preset.value = id as Preset
  clearCustomRange()
}

function rangeText(shown: { start: number; end: number }) {
  const span = shown.end - shown.start
  const crossesDays = new Date(shown.start).toDateString() !== new Date(shown.end).toDateString()
  return t('standalone.logs.zoomed_range', {
    start: formatLogTime(shown.start, locale.value, span, crossesDays),
    end: formatLogTime(shown.end, locale.value, span, crossesDays)
  })
}

const lastBoot = useQuery({
  queryKey: ['logs', 'last_boot'],
  queryFn: async () => {
    const res = await vmQuery(BOOT_QUERY)
    const value = res.data.result[0]?.value[1]
    if (value === undefined) {
      throw new Error(t('standalone.logs.no_uptime_data'))
    }
    return Number(value) * 1000
  },
  enabled: computed(() => preset.value === 'boot' && !customRange.value)
})

const dragRange = ref<{ start: number; end: number }>()
// the selection while dragging, then the zoomed window
const headerText = computed(() => {
  const shown = dragRange.value ?? customRange.value
  if (!shown) {
    if (preset.value === 'boot' && lastBoot.data.value) {
      return t('standalone.logs.since_boot_at', { time: formatDateTime(lastBoot.data.value) })
    }
    return t('standalone.logs.drag_to_zoom')
  }
  return rangeText(shown)
})

const services = computed({
  get: () => toOptions(serviceIds.value),
  set: (v: NeDropdownFilterV2Option[]) => (serviceIds.value = v.map((o) => o.id))
})

const selectedRange = computed(() => {
  if (customRange.value) {
    return customRange.value
  }
  if (preset.value === 'boot') {
    return { start: lastBoot.data.value ?? now.value - MIN_ZOOM_MS, end: now.value }
  }
  return { start: now.value - PRESETS[preset.value] * 60_000, end: now.value }
})
// since boot waits for the boot time instead of querying a made-up range
const rangeReady = computed(
  () => !!customRange.value || preset.value !== 'boot' || lastBoot.data.value !== undefined
)
const stepSeconds = computed(() =>
  Math.max(1, Math.ceil((selectedRange.value.end - selectedRange.value.start) / 1000 / BUCKETS))
)
// VictoriaLogs aligns hits buckets to multiples of the step, snap to them so chart and list cover the same lines
const range = computed(() => {
  const stepMs = stepSeconds.value * 1000
  return {
    start: Math.floor(selectedRange.value.start / stepMs) * stepMs,
    end: Math.ceil(selectedRange.value.end / stepMs) * stepMs
  }
})

function setCustomRange(start: number, end: number) {
  follow.value = false
  const missing = Math.max(0, MIN_ZOOM_MS - (end - start))
  from.value = Math.round(start - missing / 2)
  to.value = Math.round(end + missing / 2)
}

function clearCustomRange() {
  from.value = undefined
  to.value = undefined
  now.value = Date.now()
}

const filters = computed(() => ({
  search: search.value,
  logsql: logsql.value,
  services: serviceIds.value,
  hiddenLevels: hiddenLevels.value
}))
// the timeline ignores hidden levels so they can be shown again from its legend
const timelineQuery = computed(() => buildLogsQuery(filters.value, false))
const linesQuery = computed(() => buildLogsQuery(filters.value))

// VictoriaLogs reads plain numbers as seconds, so times are sent as RFC3339
const rangeParams = computed(() => ({
  start: new Date(range.value.start).toISOString(),
  end: new Date(range.value.end).toISOString()
}))

const hits = useQuery({
  queryKey: ['logs', 'hits', range, stepSeconds, timelineQuery],
  queryFn: async ({ signal }) => {
    const res = await getLogs<{ hits: LogHitsSeries[] }>(
      'hits',
      {
        ...rangeParams.value,
        query: timelineQuery.value,
        step: `${stepSeconds.value}s`,
        field: 'level'
      },
      false,
      signal
    )
    return res.data.hits
  },
  enabled: rangeReady,
  placeholderData: keepPreviousData
})

type LinesParam = { direction: 'older' | 'newer'; cursor: string }
// `exhausted`: nothing in the page's direction within PAGE_SPAN_MS of its cursor
type LinesPage = { lines: LogEntry[]; exhausted: boolean }

function withFilter(query: string, filter: string) {
  return query === '*' ? filter : `${query} ${filter}`
}

// the chart range only places the list: it starts at the range end, and scrolls on past both ends
const lines = useInfiniteQuery({
  queryKey: ['logs', 'lines', range, linesQuery],
  queryFn: async ({ pageParam: param, signal }): Promise<LinesPage> => {
    const pageParam = param ?? firstLinesParam()
    const cursor = Date.parse(pageParam.cursor)
    if (pageParam.direction === 'older') {
      // `end` is exclusive, newest lines first
      const res = await getLogs<string>(
        'query',
        {
          start: new Date(cursor - PAGE_SPAN_MS).toISOString(),
          end: pageParam.cursor,
          query: linesQuery.value,
          limit: PAGE_SIZE
        },
        true,
        signal
      )
      const page = sortNewestFirst(parseLogLines(res.data))
      const last = page.at(-1)?._time
      if (page.length < PAGE_SIZE || !last) {
        return { lines: page, exhausted: !page.length }
      }
      return {
        lines: [...page.filter((l) => l._time !== last), ...(await linesAt(last, signal))],
        exhausted: false
      }
    }
    const res = await getLogs<string>(
      'query',
      {
        start: pageParam.cursor,
        end: new Date(Math.min(Date.now(), cursor + PAGE_SPAN_MS)).toISOString(),
        query: `${withFilter(linesQuery.value, `_time:>${pageParam.cursor}`)} | first ${PAGE_SIZE} by (_time)`
      },
      true,
      signal
    )
    const page = sortNewestFirst(parseLogLines(res.data))
    const first = page[0]?._time
    if (page.length < PAGE_SIZE || !first) {
      return { lines: page, exhausted: !page.length }
    }
    return {
      lines: [...(await linesAt(first, signal)), ...page.filter((l) => l._time !== first)],
      exhausted: false
    }
  },
  // null is the first page, from the range end
  initialPageParam: null as LinesParam | null,
  getNextPageParam: (lastPage, allPages, lastPageParam): LinesParam | undefined => {
    if (lastPage.exhausted || loadedCount(allPages) >= MAX_LINES) {
      return undefined
    }
    return {
      direction: 'older',
      cursor: lastPage.lines.at(-1)?._time ?? (lastPageParam ?? firstLinesParam()).cursor
    }
  },
  getPreviousPageParam: (firstPage, allPages, firstPageParam): LinesParam | undefined => {
    if (
      (firstPageParam?.direction === 'newer' && firstPage.exhausted) ||
      loadedCount(allPages) >= MAX_LINES
    ) {
      return undefined
    }
    return {
      direction: 'newer',
      cursor: firstPage.lines[0]?._time ?? (firstPageParam ?? firstLinesParam()).cursor
    }
  },
  enabled: rangeReady,
  placeholderData: keepPreviousData
})

// a full page can end inside a burst of lines sharing one timestamp, like the kernel boot log;
// the whole burst is loaded with the page, as the next page starts past that timestamp
async function linesAt(time: string, signal: AbortSignal) {
  const res = await getLogs<string>(
    'query',
    {
      start: time,
      end: new Date(Date.parse(time) + 1000).toISOString(),
      query: withFilter(linesQuery.value, `_time:[${time}, ${time}]`)
    },
    true,
    signal
  )
  return parseLogLines(res.data)
}

function firstLinesParam(): LinesParam {
  return { direction: 'older', cursor: new Date(range.value.end).toISOString() }
}

function loadedCount(pages: LinesPage[]) {
  return pages.reduce((sum, page) => sum + page.lines.length, 0)
}

const findHits = useQuery({
  queryKey: ['logs', 'find', range, stepSeconds, linesQuery, findTerm],
  queryFn: async ({ signal }) => {
    const res = await getLogs<{ hits: LogHitsSeries[] }>(
      'hits',
      {
        ...rangeParams.value,
        query: withFind(linesQuery.value, findTerm.value),
        step: `${stepSeconds.value}s`
      },
      false,
      signal
    )
    return res.data.hits[0] ?? { fields: {}, timestamps: [], values: [], total: 0 }
  },
  enabled: computed(() => rangeReady.value && !!findTerm.value),
  placeholderData: keepPreviousData
})

const boots = useQuery({
  queryKey: ['logs', 'boots', range, stepSeconds],
  queryFn: async () => {
    const res = await vmQueryRange(
      BOOT_QUERY,
      range.value.start / 1000,
      range.value.end / 1000,
      stepSeconds.value
    )
    const values = res.data.result.flatMap((series) => series.values.map(([, v]) => Number(v)))
    return bootTimes(values).filter((boot) => boot >= range.value.start && boot <= range.value.end)
  },
  enabled: rangeReady,
  placeholderData: keepPreviousData
})

// every service ever logged, app_name is a stream field so this reads only the stream index
const serviceValues = useQuery({
  queryKey: ['logs', 'services'],
  queryFn: async ({ signal }) => {
    const res = await getLogs<{ values: { value: string }[] }>(
      'stream_field_values',
      { query: '*', field: 'app_name' },
      false,
      signal
    )
    return res.data.values.map((v) => v.value).sort((a, b) => a.localeCompare(b))
  }
})

function toOptions(values?: string[]) {
  return (values ?? []).map((v) => ({ id: v, label: v }))
}
const serviceOptions = computed(() => toOptions(serviceValues.data.value))

function toggleAllServices() {
  serviceIds.value = serviceIds.value.length ? [] : (serviceValues.data.value ?? [])
}

const entries = computed(() => lines.data.value?.pages.flatMap((page) => page.lines) ?? [])

// milliseconds tell apart lines a service logs in the same second, like one per DNS record
const timeFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
)
function formatDateTime(time?: string | number) {
  return time === undefined
    ? ''
    : new Date(time).toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'medium' })
}
const dayFormat = computed(
  () => new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' })
)
const find = computed(() => (findTerm.value ? findRegExp(findTerm.value) : undefined))

type ListItem =
  | { kind: 'line'; id: string; entry: LogEntry; time: string; striped: boolean }
  | { kind: 'day' | 'boot' | 'status'; id: string; text: string }

// what is above the oldest loaded line, always the first item so indexes don't shift
const olderStatus = computed(() => {
  if (lines.isFetchingNextPage.value) {
    return t('standalone.logs.loading_older')
  }
  if (lines.hasNextPage.value) {
    return t('standalone.logs.scroll_for_older')
  }
  if (entries.value.length >= MAX_LINES) {
    return t('standalone.logs.lines_capped', { max: MAX_LINES.toLocaleString(locale.value) })
  }
  return t('standalone.logs.no_older_lines', { time: formatDateTime(entries.value.at(-1)?._time) })
})

// oldest line first, like cat, with day and boot separators; formatted once per data change
const items = computed(() => {
  const list: ListItem[] = [{ kind: 'status', id: 'status', text: olderStatus.value }]
  const bootsAsc = boots.data.value ?? []
  let bootIndex = 0
  let previousDay = ''
  let previousTime: number | undefined
  let lineCount = 0
  // a stream can log many lines with the same timestamp, a counter keeps their ids apart
  const seen = new Map<string, number>()
  for (const entry of [...entries.value].reverse()) {
    const date = new Date(entry._time)
    const time = date.getTime()
    // a boot between the previous (older) line and this one
    while (bootIndex < bootsAsc.length && bootsAsc[bootIndex]! < time) {
      const boot = bootsAsc[bootIndex]!
      if (previousTime !== undefined && boot >= previousTime) {
        list.push({
          kind: 'boot',
          id: `boot|${boot}`,
          text: t('standalone.logs.system_boot', { time: formatDateTime(boot) })
        })
      }
      bootIndex++
    }
    const day = dayFormat.value.format(date)
    if (day !== previousDay) {
      list.push({ kind: 'day', id: `day|${entry._time}`, text: day })
      previousDay = day
    }
    const key = `${entry._time}|${entry._stream_id}`
    const repeat = seen.get(key) ?? 0
    seen.set(key, repeat + 1)
    list.push({
      kind: 'line',
      id: `${key}|${repeat}`,
      entry,
      time: timeFormat.value.format(date),
      striped: lineCount % 2 === 1
    })
    previousTime = time
    lineCount++
  }
  return list
})

// indexes in `items` of the loaded lines that match the find text
const matches = computed(() => {
  const re = find.value
  if (!re) {
    return []
  }
  return items.value.flatMap((item, index) =>
    item.kind === 'line' && re.test(item.entry._msg.replace(/#011/g, ' ')) ? [index] : []
  )
})
const currentMatch = ref(-1)
watch(findTerm, () => (currentMatch.value = -1))
const findTotal = computed(() => findHits.data.value?.total ?? 0)

const hasFilters = computed(
  () =>
    !!search.value ||
    !!serviceIds.value.length ||
    !!hiddenLevels.value.length ||
    !!customRange.value
)

const listRef = useTemplateRef<HTMLElement>('list')
const virtualizer = useVirtualizer(
  computed(() => ({
    count: items.value.length,
    getScrollElement: () => listRef.value,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 20,
    getItemKey: (index: number) => items.value[index]?.id ?? index
  }))
)
const virtualItems = computed(() =>
  virtualizer.value.getVirtualItems().flatMap(({ index, start }) => {
    const item = items.value[index]
    return item ? [{ index, start, item }] : []
  })
)

// a new range or filter opens at the bottom, on the last line before the range end
const pinToBottom = ref(true)
watch(
  () => [range.value, linesQuery.value],
  () => (pinToBottom.value = true)
)
watch(items, async () => {
  if (!pinToBottom.value || !entries.value.length || lines.isPlaceholderData.value) {
    return
  }
  // the list has its new height after the render
  await nextTick()
  if (pinToBottom.value && listRef.value) {
    // the newer lines loader row stays just out of view, it loads once scrolled into
    const el = listRef.value
    el.scrollTop = el.scrollHeight - el.clientHeight - ITEM_HEIGHT
    // cleared only now, at scroll 0 the top would start loading older lines
    pinToBottom.value = false
  }
})

const { y: listScrollY } = useScroll(listRef)
const { height: listHeight } = useElementSize(listRef)

// time of the oldest and newest line in view, marked on the chart
const visibleSpan = computed(() => {
  const inView = items.value
    .slice(
      Math.floor(listScrollY.value / ITEM_HEIGHT),
      Math.ceil((listScrollY.value + listHeight.value) / ITEM_HEIGHT)
    )
    .filter((item) => item.kind === 'line')
  const first = inView[0]
  const last = inView.at(-1)
  if (!first || !last || lines.isPlaceholderData.value) {
    return undefined
  }
  return { start: Date.parse(first.entry._time), end: Date.parse(last.entry._time) }
})

// read from the element, a scroll done in code moves it before any scroll event
function listNear(edge: 'top' | 'bottom') {
  const el = listRef.value
  if (!el) {
    return false
  }
  const distance = edge === 'top' ? el.scrollTop : el.scrollHeight - el.scrollTop - el.clientHeight
  return distance < ITEM_HEIGHT / 2
}

const loadingNewer = ref(false)
// keeps loading newer pages while the bottom of the list is in view
watchEffect(() => {
  void listScrollY.value
  void items.value
  if (
    listNear('bottom') &&
    !pinToBottom.value &&
    !loadingNewer.value &&
    lines.hasPreviousPage.value &&
    !lines.isFetchPreviousPageError.value &&
    !lines.isPlaceholderData.value
  ) {
    loadNewer()
  }
})

async function loadNewer() {
  loadingNewer.value = true
  try {
    await lines.fetchPreviousPage()
  } finally {
    // checked again once the new lines are rendered and the list is taller
    await nextTick()
    loadingNewer.value = false
  }
}

const loadingOlder = ref(false)
// and older ones at the top
watchEffect(() => {
  void listScrollY.value
  void items.value
  if (
    listNear('top') &&
    !pinToBottom.value &&
    !loadingOlder.value &&
    lines.hasNextPage.value &&
    !lines.isFetchNextPageError.value &&
    !lines.isPlaceholderData.value
  ) {
    loadOlder()
  }
})

// lines added on top would push the ones in view down, the view stays on the same line instead
async function loadOlder() {
  loadingOlder.value = true
  const offset = virtualizer.value.scrollOffset ?? 0
  const index = Math.floor(offset / ITEM_HEIGHT)
  const anchor = items.value.slice(index).find((item) => item.kind === 'line')?.id
  const anchorIndex = items.value.findIndex((item) => item.id === anchor)
  try {
    await lines.fetchNextPage()
    await nextTick()
    const newIndex = items.value.findIndex((item) => item.id === anchor)
    if (anchor && newIndex > anchorIndex) {
      virtualizer.value.scrollToOffset(offset + (newIndex - anchorIndex) * ITEM_HEIGHT)
    }
  } finally {
    // the sentinel is checked again only once the view has moved off it
    await nextTick()
    loadingOlder.value = false
  }
}

const seekingMatch = ref(false)

// down goes to newer matches, up to older ones, loading older pages when the top is reached
async function goToMatch(delta: 1 | -1) {
  if (seekingMatch.value) {
    return
  }
  seekingMatch.value = true
  try {
    // nothing picked yet: start from the newest match, at the bottom
    let next = currentMatch.value < 0 ? matches.value.length - 1 : currentMatch.value + delta
    while (next < 0 && lines.hasNextPage.value && matches.value.length < findTotal.value) {
      const before = matches.value.length
      await loadOlder()
      // older matches went in front, the one just above the current is the last of them
      next = matches.value.length - before - 1
    }
    if (!matches.value.length) {
      return
    }
    currentMatch.value =
      ((next % matches.value.length) + matches.value.length) % matches.value.length
    virtualizer.value.scrollToIndex(matches.value[currentMatch.value]!, { align: 'center' })
  } finally {
    seekingMatch.value = false
  }
}

const findStatus = computed(() => {
  if (!findTerm.value || findHits.isPending.value) {
    return ''
  }
  if (!findTotal.value) {
    return t('standalone.logs.no_matches')
  }
  const current = currentMatch.value >= 0 ? currentMatch.value + 1 : 0
  return t('standalone.logs.match_count', {
    current: current.toLocaleString(locale.value),
    total: findTotal.value.toLocaleString(locale.value)
  })
})

const selectedEntry = ref<LogEntry>()

function refresh() {
  // new data redraws the chart, which drops the selection being dragged
  if (dragRange.value) {
    return
  }
  const before = range.value
  if (!customRange.value) {
    now.value = Date.now()
  }
  // a moved range is a new query key, which fetches by itself
  if (range.value.start !== before.start || range.value.end !== before.end) {
    return
  }
  // invalidating an infinite query refetches every loaded page, only the newest one is kept
  queryClient.setQueriesData<InfiniteData<LinesPage, LinesParam | null>>(
    { queryKey: ['logs', 'lines'] },
    (data) => data && { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) }
  )
  for (const key of ['hits', 'find', 'boots', 'lines', 'last_boot']) {
    queryClient.invalidateQueries({ queryKey: ['logs', key] })
  }
}

const followInterval = useIntervalFn(refresh, 5000, { immediate: false })
watch(follow, (value) => {
  if (value) {
    clearCustomRange()
    followInterval.resume()
  } else {
    followInterval.pause()
  }
})

function toggleLevel(level: string) {
  hiddenLevels.value = hiddenLevels.value.includes(level)
    ? hiddenLevels.value.filter((l) => l !== level)
    : [...hiddenLevels.value, level]
}

function filterService(name: string) {
  selectedEntry.value = undefined
  if (!serviceIds.value.includes(name)) {
    serviceIds.value = [...serviceIds.value, name]
  }
}

function clearFilters() {
  search.value = ''
  serviceIds.value = []
  hiddenLevels.value = []
  clearCustomRange()
}

const error = computed(
  () => lastBoot.error.value ?? hits.error.value ?? lines.error.value ?? findHits.error.value
)
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.logs.title') }}</NeHeading>
  <div class="space-y-6">
    <!-- the filter field has a label, the controls next to it line up with its input -->
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="flex flex-wrap items-end gap-4">
        <NeTextInput
          v-model="searchText"
          is-search
          class="w-full sm:w-md"
          :label="t('standalone.logs.filter_lines')"
          :placeholder="
            logsql
              ? t('standalone.logs.logsql_placeholder')
              : t('standalone.logs.filter_placeholder')
          "
          :clear-search-label="t('ne_dropdown_filter.clear_search')"
        >
          <template #tooltip>
            <NeTooltip>
              <template #content>
                {{ logsql ? t('standalone.logs.logsql_helper') : t('standalone.logs.grep_helper') }}
              </template>
            </NeTooltip>
          </template>
        </NeTextInput>
        <div class="flex h-9 items-center">
          <NeToggle v-model="logsql" :label="t('standalone.logs.logsql')" />
        </div>
        <LogsTimeRange
          class="w-full sm:w-72"
          :options="rangeOptions"
          :selected="customRange ? '' : preset"
          :label="rangeLabel"
          :start="range.start"
          :end="range.end"
          @select="selectPreset"
          @apply="setCustomRange"
        />
        <div class="flex h-9 items-center">
          <NeDropdownFilterV2
            v-model="services"
            kind="checkbox"
            show-options-filter
            :label="t('standalone.logs.service')"
            :options="serviceOptions"
            :loading-options="serviceValues.isPending.value"
            :max-options-shown="serviceOptions.length"
            :custom-action-label="
              serviceIds.length
                ? t('ne_dropdown_filter.clear_all')
                : t('ne_dropdown_filter.select_all')
            "
            :options-filter-placeholder="t('standalone.logs.filter_services')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :clear-filter-label="t('ne_dropdown_filter.clear_filter')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            @custom-action="toggleAllServices"
          />
        </div>
        <div class="flex h-9 items-center">
          <NeButton kind="tertiary" :disabled="!hasFilters" @click="clearFilters">
            {{ t('common.reset_filters') }}
          </NeButton>
        </div>
      </div>
      <div class="flex h-9 items-center gap-6">
        <NeToggle v-model="follow" :label="t('standalone.logs.follow')" />
        <NeButton kind="primary" @click="refresh">
          <template #prefix>
            <FontAwesomeIcon
              :icon="faArrowsRotate"
              :class="{ 'animate-spin': hits.isFetching.value || lines.isFetching.value }"
              aria-hidden="true"
            />
          </template>
          {{ t('standalone.logs.refresh') }}
        </NeButton>
      </div>
    </div>

    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t(getAxiosErrorMessage(error))"
      :description="error.message"
    />

    <div
      class="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-950"
    >
      <p class="mb-3 text-sm text-gray-600 dark:text-gray-300">{{ headerText }}</p>
      <NeSkeleton v-if="hits.isPending.value" :lines="5" />
      <LogsTimeline
        v-else
        :series="hits.data.value ?? []"
        :step-seconds="stepSeconds"
        :start="range.start"
        :end="range.end"
        :hidden-levels="hiddenLevels"
        :boots="boots.data.value"
        :visible-span="visibleSpan"
        :find-series="findTerm && findTotal ? findHits.data.value : undefined"
        @zoom="setCustomRange"
        @selecting="(selection) => (dragRange = selection)"
        @toggle-level="toggleLevel"
      />
    </div>

    <div
      class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
      <div
        class="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-800"
      >
        <NeTextInput
          v-model="findText"
          is-search
          class="w-full sm:w-72"
          :placeholder="t('standalone.logs.find_in_lines')"
          :aria-label="t('standalone.logs.find_in_lines')"
          :clear-search-label="t('ne_dropdown_filter.clear_search')"
          @keydown.enter.exact.prevent="goToMatch(1)"
          @keydown.shift.enter.prevent="goToMatch(-1)"
        />
        <NeButton
          kind="tertiary"
          size="sm"
          :disabled="!findTotal || seekingMatch"
          :aria-label="t('standalone.logs.previous_match')"
          :title="t('standalone.logs.previous_match')"
          @click="goToMatch(-1)"
        >
          <FontAwesomeIcon :icon="faChevronUp" class="size-4" aria-hidden="true" />
        </NeButton>
        <NeButton
          kind="tertiary"
          size="sm"
          :disabled="!findTotal || seekingMatch"
          :aria-label="t('standalone.logs.next_match')"
          :title="t('standalone.logs.next_match')"
          @click="goToMatch(1)"
        >
          <FontAwesomeIcon :icon="faChevronDown" class="size-4" aria-hidden="true" />
        </NeButton>
        <NeSpinner v-if="seekingMatch || findHits.isFetching.value" size="4" />
        <span class="text-sm text-gray-600 tabular-nums dark:text-gray-300" aria-live="polite">
          {{ findStatus }}
        </span>
      </div>
      <div v-if="lines.isPending.value" class="p-6">
        <NeSkeleton :lines="8" />
      </div>
      <NeEmptyState
        v-else-if="!entries.length && !lines.isError.value"
        :title="t('standalone.logs.no_logs')"
        :description="t('standalone.logs.no_logs_description')"
        :icon="faMagnifyingGlass"
      >
        <NeButton v-if="hasFilters" kind="tertiary" size="lg" @click="clearFilters">
          {{ t('common.reset_filters') }}
        </NeButton>
      </NeEmptyState>
      <div
        v-else
        ref="list"
        class="max-h-[65vh] overflow-y-auto"
        :class="{ 'opacity-50': lines.isPlaceholderData.value }"
      >
        <div class="relative" :style="{ height: `${virtualizer.getTotalSize()}px` }">
          <ol
            class="absolute inset-x-0 top-0"
            :style="{ transform: `translateY(${virtualItems[0]?.start ?? 0}px)` }"
          >
            <li v-for="{ index, item } in virtualItems" :key="item.id" :data-index="index">
              <div
                v-if="item.kind === 'status'"
                class="flex h-7 items-center justify-center gap-2 px-4 text-sm text-gray-600 dark:text-gray-400"
              >
                <NeSpinner v-if="lines.isFetchingNextPage.value" size="4" />
                {{ item.text }}
              </div>
              <div
                v-else-if="item.kind === 'day'"
                class="flex h-7 items-center gap-2 bg-indigo-100 px-4 text-sm font-medium text-indigo-800 sm:px-6 dark:bg-indigo-950 dark:text-indigo-100"
              >
                <FontAwesomeIcon :icon="faCalendarDay" class="size-4" aria-hidden="true" />
                {{ item.text }}
              </div>
              <div
                v-else-if="item.kind === 'boot'"
                class="flex h-7 items-center gap-2 border-y border-dashed border-gray-500 bg-gray-100 px-4 text-sm font-medium text-gray-900 sm:px-6 dark:border-gray-400 dark:bg-gray-800 dark:text-gray-50"
              >
                <FontAwesomeIcon :icon="faPowerOff" class="size-4" aria-hidden="true" />
                {{ item.text }}
              </div>
              <LogRow
                v-else-if="item.kind === 'line'"
                :entry="item.entry"
                :time="item.time"
                :find="find"
                :is-current-match="matches[currentMatch] === index"
                :class="
                  selectedEntry === item.entry
                    ? 'bg-primary-100 dark:bg-primary-900'
                    : item.striped && 'bg-gray-100 dark:bg-gray-900/60'
                "
                @click="selectedEntry = item.entry"
              />
            </li>
          </ol>
        </div>
        <div
          class="flex h-7 items-center justify-center gap-2 px-4 text-sm text-gray-600 dark:text-gray-400"
        >
          <template v-if="lines.isFetchingPreviousPage.value">
            <NeSpinner size="4" />
            {{ t('standalone.logs.loading_newer') }}
          </template>
          <template v-else-if="!lines.hasPreviousPage.value">
            {{
              entries.length >= MAX_LINES
                ? t('standalone.logs.lines_capped', { max: MAX_LINES.toLocaleString(locale) })
                : t('standalone.logs.no_newer_lines')
            }}
          </template>
        </div>
      </div>
      <p
        v-if="entries.length"
        class="border-t border-gray-200 px-4 py-2 text-xs text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400"
      >
        {{
          t('standalone.logs.loaded_lines', {
            count: entries.length.toLocaleString(locale),
            start: formatDateTime(entries.at(-1)?._time),
            end: formatDateTime(entries[0]?._time)
          })
        }}
      </p>
    </div>
  </div>
  <LogDetailsDrawer
    :entry="selectedEntry"
    @close="selectedEntry = undefined"
    @filter-service="filterService"
  />
</template>
