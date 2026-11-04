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
  VisStackedBar,
  VisTooltip,
  VisXYContainer
} from '@unovis/vue'
import { FreeBrushMode, type FreeBrushSelection } from '@unovis/ts'
import { NeButton } from '@nethesis/vue-components'
import {
  LEVEL_COLORS,
  NO_LEVEL,
  formatLogTime,
  timeTicks,
  type LogHitsSeries
} from '@/lib/standalone/victoriaLogs'
import { GRAY_200, GRAY_500, GRAY_700 } from '@/lib/color'
import { useThemeStore } from '@/stores/theme'

const { series, stepSeconds, start, end, hiddenLevels } = defineProps<{
  series: LogHitsSeries[]
  stepSeconds: number
  start: number
  end: number
  hiddenLevels: string[]
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

// syslog levels from most to least severe, as VictoriaLogs names them
const LEVEL_ORDER = [
  'emergency',
  'alert',
  'critical',
  'error',
  'warning',
  'notice',
  'info',
  'debug'
]

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

function levelColor(level: string) {
  return LEVEL_COLORS[level] ?? GRAY_500
}

function levelLabel(level: string) {
  return level === NO_LEVEL ? t('standalone.logs.no_level') : level
}

// a new accessor whenever the colors change, unovis only redraws on a changed prop
const barColor = computed(() => {
  const colors = levels.value.map((level) =>
    hiddenLevels.includes(level) ? (theme.isLight ? GRAY_200 : GRAY_700) : levelColor(level)
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
        `<div class="flex items-center gap-2"><span class="size-2 rounded-full" style="background-color: ${levelColor(level)}"></span>${escape(levelLabel(level))}<span class="ml-auto pl-4 tabular-nums">${(bucket.counts[level] ?? 0).toLocaleString(locale.value)}</span></div>`
    )
    .join('')
  const from = formatLogTime(bucket.t, locale.value, span)
  const to = formatLogTime(bucket.t + span, locale.value, span)
  return `<div class="text-xs"><div class="mb-1 font-medium">${from} - ${to}</div>${rows}</div>`
}

function selectionRange(selection: FreeBrushSelection | undefined) {
  if (selection && typeof selection[0] === 'number') {
    const [from, to] = selection as [number, number]
    return { start: Math.floor(from), end: Math.ceil(to) }
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
      :height="120"
      :x-domain="xDomain"
      :aria-label="t('standalone.logs.timeline_aria_label')"
    >
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
      <VisCrosshair :template="tooltipTemplate" />
      <VisTooltip class-name="logs-tooltip" />
    </VisXYContainer>
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
        :class="{ 'opacity-50': hiddenLevels.includes(level) }"
        @click="emit('toggleLevel', level)"
      >
        <span class="flex items-center gap-2 font-normal text-gray-700 dark:text-gray-200">
          <span
            class="size-2.5 rounded-full border-2"
            :style="{
              borderColor: levelColor(level),
              backgroundColor: hiddenLevels.includes(level) ? 'transparent' : levelColor(level)
            }"
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
  --vis-tooltip-background-color: var(--color-white);
  --vis-tooltip-border-color: var(--color-gray-200);
  --vis-tooltip-text-color: var(--color-gray-700);
}

.dark .logs-timeline {
  --vis-axis-grid-color: var(--color-gray-800);
  --vis-axis-tick-label-color: var(--color-gray-400);
  --vis-tooltip-background-color: var(--color-gray-800);
  --vis-tooltip-border-color: var(--color-gray-700);
  --vis-tooltip-text-color: var(--color-gray-100);
}
.brushing :deep(.logs-tooltip) {
  visibility: hidden;
}
</style>
