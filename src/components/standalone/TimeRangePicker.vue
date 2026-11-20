<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faChevronDown, faClock } from '@fortawesome/free-solid-svg-icons'
import { NeHeading } from '@nethesis/vue-components'
import { useThemeStore } from '@/stores/theme'

const { options, selected, label } = defineProps<{
  options: { id: string; label: string }[]
  // id of the quick range in use, empty for an absolute range
  selected: string
  label: string
}>()

const emit = defineEmits<{
  select: [id: string]
  apply: [start: number, end: number]
}>()

const { t } = useI18n()
const theme = useThemeStore()

// read when the panel opens, so a refresh doesn't move the limit under the pointer
const maxDate = ref(new Date())

function onOpen() {
  maxDate.value = new Date()
}

// the picker opens empty so picked days run from midnight to midnight; filled with the current
// range it would copy its times, and the same day picked twice would give a few minutes
const TIME_CONFIG = {
  startTime: [
    { hours: 0, minutes: 0 },
    { hours: 23, minutes: 59 }
  ]
}

function onPick(value: Date[] | null, close: () => void) {
  if (value?.[0] && value[1]) {
    emit('apply', value[0].getTime(), value[1].getTime())
    close()
  }
}

function select(id: string, close: () => void) {
  emit('select', id)
  close()
}
</script>

<template>
  <Popover class="relative">
    <PopoverButton
      class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors duration-200 hover:bg-gray-200/70 hover:text-gray-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white focus:outline-hidden dark:text-gray-100 dark:ring-gray-500 dark:hover:bg-gray-600/30 dark:hover:text-gray-50 dark:focus:ring-primary-300 dark:focus:ring-offset-primary-950"
    >
      <FontAwesomeIcon :icon="faClock" class="size-4" aria-hidden="true" />
      <!-- read as "Time range: Last hour", an aria-label would hide the range itself -->
      <span class="sr-only">{{ t('common.time_range') }}:</span>
      <span class="tabular-nums">{{ label }}</span>
      <FontAwesomeIcon :icon="faChevronDown" class="size-3" aria-hidden="true" />
    </PopoverButton>
    <PopoverPanel
      v-slot="{ close }"
      class="absolute right-0 z-20 mt-2 flex w-max flex-col gap-6 rounded-lg bg-white p-4 shadow-lg ring-1 ring-gray-200 sm:flex-row dark:bg-gray-950 dark:ring-gray-700"
      @vue:before-mount="onOpen"
    >
      <div>
        <NeHeading tag="h6" class="mb-3">{{ t('common.absolute_time_range') }}</NeHeading>
        <VueDatePicker
          range
          inline
          :time-config="TIME_CONFIG"
          :dark="!theme.isLight"
          :max-date="maxDate"
          :week-start="1"
          @update:model-value="(value: Date[] | null) => onPick(value, close)"
        />
      </div>
      <div class="sm:w-48">
        <NeHeading tag="h6" class="mb-3">{{ t('common.quick_ranges') }}</NeHeading>
        <ul>
          <li v-for="option in options" :key="option.id">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-primary-300"
              :aria-current="option.id === selected"
              @click="select(option.id, close)"
            >
              {{ option.label }}
              <FontAwesomeIcon
                v-if="option.id === selected"
                :icon="faCheck"
                class="size-3 text-primary-600 dark:text-primary-400"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>
      </div>
    </PopoverPanel>
  </Popover>
</template>
