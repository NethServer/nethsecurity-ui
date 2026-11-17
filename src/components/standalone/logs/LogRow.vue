<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed } from 'vue'
import { levelDotClass, type LogEntry } from '@/lib/standalone/victoriaLogs'

const {
  entry,
  find = undefined,
  isCurrentMatch = false
} = defineProps<{
  entry: LogEntry
  time: string
  find?: RegExp
  isCurrentMatch?: boolean
}>()

// matches past this many characters would be cut off, the message starts a bit before them
const MAX_LEAD = 40

const parts = computed(() => {
  // rsyslog escapes tabs as `#011`
  const message = entry._msg.replace(/#011/g, ' ').trim()
  const match = find ? message.match(find) : null
  if (!match || match.index === undefined) {
    return { before: message, match: '', after: '' }
  }
  const start = match.index > MAX_LEAD ? match.index - MAX_LEAD / 2 : 0
  return {
    before: (start ? '…' : '') + message.slice(start, match.index),
    match: match[0],
    after: message.slice(match.index + match[0].length)
  }
})
</script>

<template>
  <button
    type="button"
    class="grid h-7 w-full cursor-pointer grid-cols-[auto_7.5rem_minmax(0,1fr)] items-center gap-x-3 px-4 text-left text-sm whitespace-nowrap hover:bg-primary-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500 sm:grid-cols-[5.5rem_7.5rem_10rem_minmax(0,1fr)] sm:px-6 dark:hover:bg-primary-950"
  >
    <span class="flex items-center gap-2 text-gray-600 dark:text-gray-300">
      <span class="size-2 shrink-0 rounded-full" :class="levelDotClass(entry.level ?? '')" />
      <span class="sr-only sm:not-sr-only">{{ entry.level || '-' }}</span>
    </span>
    <time :datetime="entry._time" class="text-gray-500 tabular-nums dark:text-gray-400">
      {{ time }}
    </time>
    <span class="hidden truncate font-medium text-primary-700 sm:block dark:text-primary-400">
      {{ entry.app_name || '-' }}
    </span>
    <span class="truncate font-mono text-gray-900 dark:text-gray-100"
      >{{ parts.before
      }}<mark
        v-if="parts.match"
        class="rounded-sm text-gray-900"
        :class="
          isCurrentMatch
            ? 'bg-yellow-400 dark:bg-yellow-500'
            : 'bg-yellow-200 dark:bg-yellow-300'
        "
        >{{ parts.match }}</mark
      >{{ parts.after }}</span
    >
  </button>
</template>
