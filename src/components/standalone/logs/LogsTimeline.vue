<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElementSize } from '@vueuse/core'
import { escape } from 'lodash-es'
import {
  VisAxis,
  VisCrosshair,
  VisFreeBrush,
  VisPlotband,
  VisPlotline,
  VisStackedBar,
  VisTooltip,
  VisXYContainer
} from '@unovis/vue'
import {
  FreeBrushMode,
  PlotlineLabelPosition,
  PlotlineLineStylePresets,
  type FreeBrushSelection
} from '@unovis/ts'
import { NeButton } from '@nethesis/vue-components'
import {
  LEVEL_ORDER,
  NO_LEVEL,
  formatLogTime,
  levelColor,
  levelDotClass,
  timeTicks,
  type LogHitsSeries
} from '@/lib/standalone/victoriaLogs'
import { GRAY_200, GRAY_400, GRAY_500, GRAY_700 } from '@/lib/color'
import { useThemeStore } from '@/stores/theme'

const {
  series,
  stepSeconds,
  start,
  end,
  hiddenLevels,
  boots = [],
  visibleSpan = undefined,
  findSeries = undefined
} = defineProps<{
  series: LogHitsSeries[]
  stepSeconds: number
  start: number
  end: number
  hiddenLevels: string[]
  // unix ms of each system boot in the range
  boots?: number[]
  // unix ms of the oldest and newest line in view in the list
  visibleSpan?: { start: number; end: number }
  // hits of the find text, drawn in a strip under the chart
  findSeries?: LogHitsSeries
}>()

const emit = defineEmits<{
  zoom: [start: number, end: number]
  // the range under the cursor while dragging, undefined once the drag ends
  selecting: [range?: { start: number; end: number }]
  toggleLevel: [level: string]
}>()

const { t, locale } = useI18n()
const theme = useThemeStore()

type Bucket = { t: number; counts: Record<string, number> }

// fixed so the find strip lines up with the chart, the y labels fit up to six digits
const MARGIN = { top: 20, right: 8, bottom: 24, left: 48 }
const STRIP_MARGIN = { top: 0, right: MARGIN.right, bottom: 0, left: MARGIN.left }

// VictoriaLogs reports lines without a level as an empty value
const levelOf = (s: LogHitsSeries) => s.fields.level || NO_LEVEL

const levels = computed(() => {
  const present = series.map(levelOf)
  const known = LEVEL_ORDER.filter((level) => present.includes(level))
  return [...known, ...present.filter((level) => !LEVEL_ORDER.includes(level))]
})

const totals = computed(() => Object.fromEntries(series.map((s) => [levelOf(s), s.total])))

const buckets = computed<Bucket[]>(() => {
  const byTime = new Map<number, Bucket>()
  for (const s of series) {
    const level = levelOf(s)
    s.timestamps.forEach((ts, i) => {
      const time = Date.parse(ts)
      const bucket = byTime.get(time) ?? { t: time, counts: {} }
      bucket.counts[level] = s.values[i] ?? 0
      byTime.set(time, bucket)
    })
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t)
})

const yAccessors = computed(() =>
  levels.value.map((level) => (d: Bucket) => d.counts[level] ?? 0)
)

type FindBucket = { t: number; count: number }

const findBuckets = computed<FindBucket[]>(() =>
  (findSeries?.timestamps ?? []).map((ts, i) => ({
    t: Date.parse(ts),
    count: findSeries?.values[i] ?? 0
  }))
)
// every bucket with matches fills the strip, a darker shade means more matches
const findY = (d: FindBucket) => (d.count ? 1 : 0)
const findYDomain: [number, number] = [0, 1]
const findColor = computed(() => {
  const base = theme.isLight ? GRAY_500 : GRAY_400
  const max = Math.max(1, ...findBuckets.value.map((d) => d.count))
  return (d: FindBucket) => {
    const alpha = Math.round((0.35 + (0.65 * d.count) / max) * 255)
    return `${base}${alpha.toString(16).padStart(2, '0')}`
  }
})
const bootColor = computed(() => (theme.isLight ? GRAY_700 : GRAY_400))

// widened to the bars holding the lines in view, cut to the chart
const band = computed(() => {
  if (!visibleSpan) {
    return undefined
  }
  const stepMs = stepSeconds * 1000
  const from = Math.max(start, Math.floor(visibleSpan.start / stepMs) * stepMs)
  const to = Math.min(end, Math.floor(visibleSpan.end / stepMs) * stepMs + stepMs)
  return from < to ? { from, to } : undefined
})

function bootLabel(time: number) {
  return t('standalone.logs.boot_marker', {
    time: formatLogTime(time, locale.value, end - start)
  })
}

function findTooltip(bucket: FindBucket) {
  return `<div class="text-xs">${escape(
    t('standalone.logs.find_matches_tooltip', { count: bucket.count.toLocaleString(locale.value) })
  )}</div>`
}

function levelLabel(level: string) {
  return level === NO_LEVEL ? t('standalone.logs.no_level') : level
}

// the parent passes a new array on every render, a redraw mid-drag resets the brush
const hiddenKey = computed(() => hiddenLevels.join('\n'))

// a new accessor whenever the colors change, unovis only redraws on a changed prop
const barColor = computed(() => {
  const hidden = hiddenKey.value.split('\n')
  const colors = levels.value.map((level) =>
    hidden.includes(level)
      ? theme.isLight
        ? GRAY_200
        : GRAY_700
      : levelColor(level, theme.isLight)
  )
  return (_d: Bucket, i: number) => colors[i] ?? GRAY_500
})

// stable accessors, new functions on every render make unovis redraw the chart
const xOf = (d: Bucket) => d.t
const xDomain = computed<[number, number]>(() => [start, end])
const yTickFormat = (v: number | Date) => Number(v).toLocaleString(locale.value)

const rootRef = useTemplateRef<HTMLElement>('root')
const { width } = useElementSize(rootRef)
// about one label every 80px
const xTicks = computed(() => timeTicks(start, end, Math.max(2, Math.floor(width.value / 80))))

function tickFormat(value: number | Date) {
  const date = new Date(Number(value))
  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0
  if (isMidnight || xTicks.value.stepMs >= 24 * 3600_000) {
    return date.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })
  }
  // ticks closer than a minute need seconds to tell them apart
  return formatLogTime(
    date.getTime(),
    locale.value,
    xTicks.value.stepMs < 60_000 ? 0 : end - start
  )
}

function tooltipTemplate(bucket: Bucket) {
  const span = stepSeconds * 1000
  const rows = levels.value
    .map(
      (level) =>
        `<div class="flex items-center gap-2"><span class="size-2 rounded-full" style="background-color: ${levelColor(level, theme.isLight)}"></span>${escape(levelLabel(level))}<span class="ml-auto pl-4 tabular-nums">${(bucket.counts[level] ?? 0).toLocaleString(locale.value)}</span></div>`
    )
    .join('')
  const from = formatLogTime(bucket.t, locale.value, span)
  const to = formatLogTime(bucket.t + span, locale.value, span)
  return `<div class="text-xs"><div class="mb-1 font-medium">${from} - ${to}</div>${rows}</div>`
}

// widened to whole bars, which start at multiples of the step
function selectionRange(selection: FreeBrushSelection | undefined) {
  if (selection && typeof selection[0] === 'number') {
    const [from, to] = selection as [number, number]
    const stepMs = stepSeconds * 1000
    return { start: Math.floor(from / stepMs) * stepMs, end: Math.ceil(to / stepMs) * stepMs }
  }
}

// the tooltip is hidden while dragging, it would cover the selection
const brushing = ref(false)

function onBrushMove(selection: FreeBrushSelection | undefined, _e: unknown, userDriven: boolean) {
  if (userDriven) {
    brushing.value = true
    emit('selecting', selectionRange(selection))
  }
}

function onBrushEnd(selection: FreeBrushSelection | undefined, _e: unknown, userDriven: boolean) {
  brushing.value = false
  emit('selecting', undefined)
  const range = selectionRange(selection)
  if (userDriven && range) {
    emit('zoom', range.start, range.end)
  }
}
</script>

<template>
  <div ref="root" class="logs-timeline" :class="{ brushing }">
    <VisXYContainer
      :data="buckets"
      :height="136"
      :x-domain="xDomain"
      :margin="MARGIN"
      :auto-margin="false"
      :aria-label="t('standalone.logs.timeline_aria_label')"
    >
      <VisPlotband v-if="band" axis="x" :from="band.from" :to="band.to" />
      <VisStackedBar
        :x="xOf"
        :y="yAccessors"
        :color="barColor"
        :data-step="stepSeconds * 1000"
        :bar-padding="0.15"
        :rounded-corners="1"
      />
      <VisAxis
        type="x"
        :tick-values="xTicks.ticks"
        :tick-format="tickFormat"
        :grid-line="false"
      />
      <VisAxis type="y" :num-ticks="3" :tick-format="yTickFormat" />
      <VisFreeBrush
        :mode="FreeBrushMode.X"
        :selection-min-length="stepSeconds * 1000"
        :on-brush-move="onBrushMove"
        :on-brush-end="onBrushEnd"
      />
      <VisPlotline
        v-for="boot in boots"
        :key="boot"
        axis="x"
        :value="boot"
        :color="bootColor"
        :line-width="1.5"
        :line-style="PlotlineLineStylePresets.Dash"
        :label-text="bootLabel(boot)"
        :label-position="PlotlineLabelPosition.TopRight"
        :label-color="bootColor"
        :label-size="11"
      />
      <VisCrosshair :template="tooltipTemplate" />
      <VisTooltip class-name="logs-tooltip" />
    </VisXYContainer>
    <div v-if="findSeries" class="relative mt-1">
      <span
        class="absolute inset-y-0 left-0 flex w-10 items-center justify-end text-xs text-gray-600 dark:text-gray-400"
        aria-hidden="true"
      >
        {{ t('standalone.logs.find') }}
      </span>
      <VisXYContainer
        :data="findBuckets"
        :height="20"
        :x-domain="xDomain"
        :y-domain="findYDomain"
        :margin="STRIP_MARGIN"
        :auto-margin="false"
        :aria-label="t('standalone.logs.find_strip_aria_label')"
      >
        <VisStackedBar
          :x="xOf"
          :y="findY"
          :color="findColor"
          :data-step="stepSeconds * 1000"
          :bar-padding="0.15"
          :rounded-corners="1"
        />
        <VisCrosshair :template="findTooltip" />
        <VisTooltip class-name="logs-tooltip" />
      </VisXYContainer>
    </div>
    <div class="mt-3 flex flex-wrap gap-1">
      <NeButton
        v-for="level in levels"
        :key="level"
        kind="tertiary"
        size="sm"
        :aria-pressed="!hiddenLevels.includes(level)"
        :title="
          hiddenLevels.includes(level)
            ? t('standalone.logs.show_level', { level: levelLabel(level) })
            : t('standalone.logs.hide_level', { level: levelLabel(level) })
        "
        @click="emit('toggleLevel', level)"
      >
        <span
          class="flex items-center gap-2 font-normal"
          :class="
            hiddenLevels.includes(level)
              ? 'text-gray-500 line-through dark:text-gray-400'
              : 'text-gray-700 dark:text-gray-200'
          "
        >
          <span
            class="size-2.5 rounded-full"
            :class="
              hiddenLevels.includes(level)
                ? 'border-2 border-gray-400 dark:border-gray-500'
                : levelDotClass(level)
            "
          />
          {{ levelLabel(level) }}
          <span class="text-gray-500 tabular-nums dark:text-gray-400">
            {{ (totals[level] ?? 0).toLocaleString(locale) }}
          </span>
        </span>
      </NeButton>
    </div>
  </div>
</template>

<style scoped>
.logs-timeline {
  --vis-font-family: inherit;
  --vis-axis-grid-color: var(--color-gray-200);
  --vis-axis-tick-label-color: var(--color-gray-500);
  --vis-free-brush-selection-fill-color: var(--color-primary-500);
  --vis-free-brush-selection-stroke-color: var(--color-primary-600);
  --vis-plotband-color: color-mix(in srgb, var(--color-primary-500) 15%, transparent);
  --vis-tooltip-background-color: var(--color-white);
  --vis-tooltip-border-color: var(--color-gray-200);
  --vis-tooltip-text-color: var(--color-gray-700);
}

.dark .logs-timeline {
  --vis-axis-grid-color: var(--color-gray-800);
  --vis-plotband-color: color-mix(in srgb, var(--color-primary-400) 20%, transparent);
  --vis-axis-tick-label-color: var(--color-gray-400);
  --vis-tooltip-background-color: var(--color-gray-800);
  --vis-tooltip-border-color: var(--color-gray-700);
  --vis-tooltip-text-color: var(--color-gray-100);
}
.brushing :deep(.logs-tooltip) {
  visibility: hidden;
}
</style>
