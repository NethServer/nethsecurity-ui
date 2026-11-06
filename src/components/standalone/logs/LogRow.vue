<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LEVEL_COLORS, type LogEntry } from '@/lib/standalone/victoriaLogs'
import { GRAY_500 } from '@/lib/color'

const { entry, time } = defineProps<{
  entry: LogEntry
  time: string
}>()

const emit = defineEmits<{
  filterService: [service: string]
}>()

const { t } = useI18n()

// rsyslog escapes tabs as `#011`
const message = computed(() => entry._msg.replace(/#011/g, ' ').trim())
</script>

<template>
  <div
    class="grid grid-cols-[auto_auto_1fr] items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:grid-cols-[6rem_5.5rem_11rem_1fr] sm:px-6"
  >
    <span class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
      <span
        class="size-2 shrink-0 rounded-full"
        :style="{ backgroundColor: LEVEL_COLORS[entry.level ?? ''] ?? GRAY_500 }"
      />
      {{ entry.level || '-' }}
    </span>
    <time :datetime="entry._time" class="text-gray-500 tabular-nums dark:text-gray-400">
      {{ time }}
    </time>
    <button
      v-if="entry.app_name"
      type="button"
      class="cursor-pointer truncate text-left font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-primary-400"
      :title="t('standalone.logs.filter_by_service', { service: entry.app_name })"
      @click="emit('filterService', entry.app_name)"
    >
      {{ entry.app_name }}
    </button>
    <span v-else class="text-gray-500">-</span>
    <p
      class="col-span-3 font-mono text-[13px] leading-5 break-words whitespace-pre-wrap text-gray-900 sm:col-span-1 dark:text-gray-100"
    >{{ message }}</p>
  </div>
</template>
