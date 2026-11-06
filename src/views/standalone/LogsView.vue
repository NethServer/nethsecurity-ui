<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch, watchEffect } from 'vue'
import axios from 'axios'
import { useI18n } from 'vue-i18n'
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/vue-query'
import { refDebounced, useElementVisibility, useIntervalFn } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowsRotate, faCalendarDay, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import {
  NeButton,
  NeDropdownFilterV2,
  NeEmptyState,
  NeHeading,
  NeInlineNotification,
  NeListbox,
  NeSkeleton,
  NeSpinner,
  NeTextInput,
  NeToggle,
  getAxiosErrorMessage,
  type NeDropdownFilterV2Option
} from '@nethesis/vue-components'
import LogsTimeline from '@/components/standalone/logs/LogsTimeline.vue'
import LogRow from '@/components/standalone/logs/LogRow.vue'
import {
  NO_LEVEL,
  buildLogsQuery,
  formatLogTime,
  type LogEntry,
  type LogHitsSeries
} from '@/lib/standalone/victoriaLogs'
import { getStandaloneApiEndpoint } from '@/lib/config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

const PAGE_SIZE = 200
const BUCKETS = 60
const MIN_ZOOM_MS = 60_000
const PRESETS = { '15m': 15, '1h': 60, '6h': 360, '24h': 1440, '7d': 10080, '30d': 43200 }
type Preset = keyof typeof PRESETS

const { t, locale } = useI18n()
const queryClient = useQueryClient()
const loginStore = useLoginStore()

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
  transform: { get: (v) => (Object.hasOwn(PRESETS, v) ? (v as Preset) : '1h'), set: (v) => v }
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

const customRange = computed(() =>
  from.value !== undefined && to.value !== undefined && from.value < to.value
    ? { start: from.value, end: to.value }
    : undefined
)

// "custom" is shown while zoomed in, but can't be picked
const rangeOptions = computed(() => [
  ...Object.keys(PRESETS).map((id) => ({ id, label: t(`standalone.logs.last_${id}`) })),
  ...(customRange.value
    ? [{ id: 'custom', label: t('standalone.logs.custom'), disabled: true }]
    : [])
])
const rangeChoice = computed({
  get: () => (customRange.value ? 'custom' : preset.value),
  set: (id: string) => {
    // NeListbox emits its current value on mount, which would drop the zoom
    if (id === 'custom') {
      return
    }
    preset.value = id as Preset
    clearCustomRange()
  }
})

const dragRange = ref<{ start: number; end: number }>()
// the selection while dragging, then the zoomed window
const headerText = computed(() => {
  const shown = dragRange.value ?? customRange.value
  if (!shown) {
    return t('standalone.logs.drag_to_zoom')
  }
  const span = shown.end - shown.start
  const crossesDays = new Date(shown.start).toDateString() !== new Date(shown.end).toDateString()
  return t('standalone.logs.zoomed_range', {
    start: formatLogTime(shown.start, locale.value, span, crossesDays),
    end: formatLogTime(shown.end, locale.value, span, crossesDays)
  })
})

const services = computed({
  get: () => toOptions(serviceIds.value),
  set: (v: NeDropdownFilterV2Option[]) => (serviceIds.value = v.map((o) => o.id))
})

const selectedRange = computed(
  () => customRange.value ?? { start: now.value - PRESETS[preset.value] * 60_000, end: now.value }
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
  services: serviceIds.value,
  hiddenLevels: hiddenLevels.value
}))
// the timeline ignores hidden levels so they can be shown again from its legend
const timelineQuery = computed(() => buildLogsQuery(filters.value, false))
const linesQuery = computed(() => buildLogsQuery(filters.value))

function getLogs<T>(path: string, params: Record<string, string | number>, text = false) {
  return axios.get<T>(`${getStandaloneApiEndpoint()}/logs/${path}`, {
    params,
    headers: { Authorization: `Bearer ${loginStore.token}` },
    responseType: text ? 'text' : 'json'
  })
}

// VictoriaLogs reads plain numbers as seconds, so times are sent as RFC3339
const rangeParams = computed(() => ({
  start: new Date(range.value.start).toISOString(),
  end: new Date(range.value.end).toISOString()
}))

const hits = useQuery({
  queryKey: ['logs', 'hits', range, stepSeconds, timelineQuery],
  queryFn: async () => {
    const res = await getLogs<{ hits: LogHitsSeries[] }>('hits', {
      ...rangeParams.value,
      query: timelineQuery.value,
      step: `${stepSeconds.value}s`,
      field: 'level'
    })
    return res.data.hits
  },
  placeholderData: keepPreviousData
})

const lines = useInfiniteQuery({
  queryKey: ['logs', 'lines', range, linesQuery],
  // newest first, each page ends at the raw `_time` of the previous one to keep its nanoseconds
  queryFn: async ({ pageParam }) => {
    const res = await getLogs<string>(
      'query',
      {
        ...rangeParams.value,
        ...(pageParam ? { end: pageParam } : {}),
        query: linesQuery.value,
        limit: PAGE_SIZE
      },
      true
    )
    // one JSON object per line
    return res.data
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line) as LogEntry)
  },
  initialPageParam: '',
  // shortcut: `end` is exclusive, so lines sharing the exact boundary timestamp are skipped; page with offset if it shows up
  getNextPageParam: (lastPage) =>
    lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?._time,
  placeholderData: keepPreviousData
})

const serviceValues = useQuery({
  queryKey: ['logs', 'values', 'app_name', range],
  queryFn: async () => {
    const res = await getLogs<{ values: { value: string }[] }>('field_values', {
      ...rangeParams.value,
      query: '*',
      field: 'app_name'
    })
    return res.data.values.map((v) => v.value).sort((a, b) => a.localeCompare(b))
  },
  placeholderData: keepPreviousData
})

function toOptions(values?: string[]) {
  return (values ?? []).map((v) => ({ id: v, label: v }))
}
const serviceOptions = computed(() => toOptions(serviceValues.data.value))

function toggleAllServices() {
  serviceIds.value = serviceIds.value.length ? [] : (serviceValues.data.value ?? [])
}

const entries = computed(() => lines.data.value?.pages.flat() ?? [])

const timeFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
)
const dayFormat = computed(
  () => new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' })
)
// formatted once per data change instead of on every render of every row
const rows = computed(() => {
  let previousDay = ''
  return entries.value.map((entry) => {
    const date = new Date(entry._time)
    const day = dayFormat.value.format(date)
    const row = {
      id: `${entry._time}|${entry._stream_id}`,
      entry,
      time: timeFormat.value.format(date),
      day,
      isNewDay: day !== previousDay
    }
    previousDay = day
    return row
  })
})

const totalShown = computed(() =>
  (hits.data.value ?? [])
    .filter((s) => !hiddenLevels.value.includes(s.fields.level || NO_LEVEL))
    .reduce((sum, s) => sum + s.total, 0)
)
const hasFilters = computed(
  () =>
    !!search.value ||
    !!serviceIds.value.length ||
    !!hiddenLevels.value.length ||
    !!customRange.value
)

const listRef = useTemplateRef<HTMLElement>('list')
// only the rows in view are in the DOM, heights are measured as they render
const virtualizer = useVirtualizer(
  computed(() => ({
    count: rows.value.length,
    getScrollElement: () => listRef.value,
    estimateSize: () => 36,
    overscan: 10,
    getItemKey: (index: number) => rows.value[index]?.id ?? index
  }))
)
const virtualRows = computed(() =>
  virtualizer.value.getVirtualItems().flatMap(({ index, start }) => {
    const row = rows.value[index]
    return row ? [{ index, start, row }] : []
  })
)

const sentinelRef = useTemplateRef<HTMLElement>('sentinel')
const sentinelVisible = useElementVisibility(sentinelRef, { scrollTarget: listRef })
// keeps loading pages while the end of the list is in view
watchEffect(() => {
  if (
    sentinelVisible.value &&
    lines.hasNextPage.value &&
    !lines.isFetchingNextPage.value &&
    !lines.isFetchNextPageError.value &&
    !lines.isPlaceholderData.value
  ) {
    lines.fetchNextPage()
  }
})

function refresh() {
  // new data redraws the chart, which drops the selection being dragged
  if (dragRange.value) {
    return
  }
  if (!customRange.value) {
    now.value = Date.now()
  }
  queryClient.invalidateQueries({ queryKey: ['logs'] })
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
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.logs.title') }}</NeHeading>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex flex-wrap items-center gap-3">
        <NeTextInput
          v-model="searchText"
          is-search
          class="w-full sm:w-96"
          :placeholder="t('standalone.logs.search_placeholder')"
          :aria-label="t('standalone.logs.search')"
        />
        <NeListbox
          v-model="rangeChoice"
          class="w-full sm:w-44"
          :options="rangeOptions"
          :aria-label="t('standalone.logs.time_range')"
          :no-options-label="t('ne_dropdown_filter.no_options')"
          :optional-label="t('common.optional')"
        />
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
        <NeButton kind="tertiary" :disabled="!hasFilters" @click="clearFilters">
          {{ t('common.clear_filters') }}
        </NeButton>
      </div>
      <div class="flex items-center gap-6">
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
      v-if="hits.isError.value || lines.isError.value"
      kind="error"
      :title="t(getAxiosErrorMessage(hits.error.value ?? lines.error.value))"
      :description="(hits.error.value ?? lines.error.value)?.message"
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
        @zoom="setCustomRange"
        @selecting="(selection) => (dragRange = selection)"
        @toggle-level="toggleLevel"
      />
    </div>

    <div
      class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
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
            :style="{ transform: `translateY(${virtualRows[0]?.start ?? 0}px)` }"
          >
            <li
              v-for="{ index, row } in virtualRows"
              :key="row.id"
              :ref="(el) => virtualizer.measureElement(el as Element | null)"
              :data-index="index"
            >
              <div
                v-if="row.isNewDay"
                class="flex items-center gap-2 border-y border-primary-100 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-900 sm:px-6 dark:border-primary-900 dark:bg-primary-950 dark:text-primary-100"
              >
                <FontAwesomeIcon :icon="faCalendarDay" class="size-4" aria-hidden="true" />
                {{ row.day }}
              </div>
              <LogRow
                :entry="row.entry"
                :time="row.time"
                :class="{ 'bg-gray-100 dark:bg-gray-900/60': index % 2 }"
                @filter-service="filterService"
              />
            </li>
          </ol>
        </div>
        <div
          ref="sentinel"
          class="flex justify-center px-4 py-3 text-sm text-gray-500 dark:text-gray-400"
        >
          <NeSpinner v-if="lines.isFetchingNextPage.value" />
          <span v-else-if="!lines.hasNextPage.value">
            {{ t('standalone.logs.end_of_range') }}
          </span>
        </div>
      </div>
      <p
        v-if="entries.length"
        class="border-t border-gray-200 px-4 py-2 text-xs text-gray-500 sm:px-6 dark:border-gray-800 dark:text-gray-400"
      >
        {{
          t('standalone.logs.showing_count', {
            shown: entries.length.toLocaleString(locale),
            total: totalShown.toLocaleString(locale)
          })
        }}
      </p>
    </div>
  </div>
</template>
