<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeSideDrawer } from '@nethesis/vue-components'
import { levelDotClass, type LogEntry } from '@/lib/standalone/victoriaLogs'

const { entry = undefined } = defineProps<{
  entry?: LogEntry
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, locale } = useI18n()

const message = computed(() => entry?._msg.replace(/#011/g, '\t') ?? '')

const fullTime = computed(() =>
  entry
    ? new Date(entry._time).toLocaleString(locale.value, {
        dateStyle: 'medium',
        timeStyle: 'medium'
      })
    : ''
)

// every field rsyslog stored, the message and the internal ones aside
const otherFields = computed(() =>
  Object.entries(entry ?? {}).filter(
    ([name]) => !['_msg', '_time', '_stream', '_stream_id', 'level', 'app_name'].includes(name)
  )
)
</script>

<template>
  <NeSideDrawer
    :is-shown="!!entry"
    :title="t('standalone.logs.log_line')"
    :close-aria-label="t('common.shell.close_side_drawer')"
    @close="emit('close')"
  >
    <div v-if="entry" class="space-y-6">
      <pre
        class="rounded-md bg-gray-100 p-3 font-mono text-sm break-words whitespace-pre-wrap text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        >{{ message }}</pre
      >
      <dl class="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <dt class="text-gray-600 dark:text-gray-400">{{ t('standalone.logs.time') }}</dt>
        <dd>
          <time :datetime="entry._time">{{ fullTime }}</time>
        </dd>
        <dt class="text-gray-600 dark:text-gray-400">{{ t('standalone.logs.level') }}</dt>
        <dd class="flex items-center gap-2">
          <span class="size-2 rounded-full" :class="levelDotClass(entry.level ?? '')" />
          {{ entry.level || '-' }}
        </dd>
        <dt class="text-gray-600 dark:text-gray-400">{{ t('standalone.logs.service') }}</dt>
        <dd>{{ entry.app_name || '-' }}</dd>
        <template v-for="[name, value] in otherFields" :key="name">
          <dt class="font-mono text-gray-600 dark:text-gray-400">{{ name }}</dt>
          <dd class="font-mono break-all">{{ value }}</dd>
        </template>
      </dl>
    </div>
  </NeSideDrawer>
</template>
