<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faChevronDown, faClock } from '@fortawesome/free-solid-svg-icons'
import { NeButton, NeFormItemLabel } from '@nethesis/vue-components'
import { useThemeStore } from '@/stores/theme'

// one format for typing and showing, the way log lines read
const DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss'

const { options, selected, label, start, end } = defineProps<{
  options: { id: string; label: string }[]
  // id of the quick range in use, empty for a custom range
  selected: string
  label: string
  start: number
  end: number
}>()

const emit = defineEmits<{
  select: [id: string]
  apply: [start: number, end: number]
}>()

const { t } = useI18n()
const theme = useThemeStore()

const from = ref<Date>()
const to = ref<Date>()
const isValid = computed(() => !!from.value && !!to.value && from.value < to.value)

// the fields open on the range in view
function fillFields() {
  from.value = new Date(start)
  to.value = new Date(end)
}

function apply(close: () => void) {
  if (from.value && to.value && isValid.value) {
    emit('apply', from.value.getTime(), to.value.getTime())
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
      class="flex min-h-9 w-full items-center gap-2 rounded-md bg-white py-1.5 pr-3 pl-3 text-left text-sm text-gray-900 shadow-sm ring-1 ring-gray-300 transition-colors duration-200 ring-inset hover:bg-gray-200/70 focus:ring-2 focus:ring-primary-500 focus:outline-hidden focus:ring-inset dark:bg-gray-950 dark:text-gray-50 dark:ring-gray-600 dark:hover:bg-gray-600/30 dark:focus:ring-primary-300"
      @click="fillFields"
    >
      <FontAwesomeIcon :icon="faClock" class="size-4 shrink-0 text-gray-500" aria-hidden="true" />
      <span class="truncate">{{ label }}</span>
      <FontAwesomeIcon
        :icon="faChevronDown"
        class="ml-auto size-3 shrink-0 text-gray-500"
        aria-hidden="true"
      />
    </PopoverButton>
    <PopoverPanel
      v-slot="{ close }"
      class="absolute left-0 z-50 mt-2.5 w-80 rounded-md bg-white shadow-lg ring-1 ring-gray-900/5 focus:outline-hidden sm:w-xl dark:bg-gray-950 dark:ring-gray-500/50"
    >
      <div class="flex flex-col gap-6 p-4 sm:flex-row">
        <section class="flex flex-1 flex-col gap-4">
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-50">
            {{ t('standalone.logs.custom_range') }}
          </h3>
          <div>
            <NeFormItemLabel>{{ t('standalone.logs.from') }}</NeFormItemLabel>
            <VueDatePicker
              v-model="from"
              :formats="{ input: DATE_FORMAT }"
              :text-input="{ format: DATE_FORMAT }"
              :time-config="{ enableSeconds: true, is24: true }"
              :max-date="new Date()"
              :teleport="false"
              :dark="!theme.isLight"
              :week-start="1"
              :input-attrs="{ clearable: false }"
              :aria-labels="{ input: t('standalone.logs.from') }"
            />
          </div>
          <div>
            <NeFormItemLabel>{{ t('standalone.logs.to') }}</NeFormItemLabel>
            <VueDatePicker
              v-model="to"
              :formats="{ input: DATE_FORMAT }"
              :text-input="{ format: DATE_FORMAT }"
              :time-config="{ enableSeconds: true, is24: true }"
              :max-date="new Date()"
              :teleport="false"
              :dark="!theme.isLight"
              :week-start="1"
              :input-attrs="{ clearable: false }"
              :aria-labels="{ input: t('standalone.logs.to') }"
            />
          </div>
          <NeButton kind="primary" class="self-start" :disabled="!isValid" @click="apply(close)">
            {{ t('standalone.logs.apply_time_range') }}
          </NeButton>
        </section>
        <section
          class="flex flex-col gap-2 border-gray-200 sm:w-48 sm:border-l sm:pl-6 dark:border-gray-700"
        >
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-50">
            {{ t('standalone.logs.quick_ranges') }}
          </h3>
          <ul class="flex flex-col">
            <li v-for="option in options" :key="option.id">
              <button
                type="button"
                class="w-full cursor-pointer rounded-md px-3 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-primary-500"
                :class="
                  option.id === selected
                    ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                "
                :aria-current="option.id === selected"
                @click="select(option.id, close)"
              >
                {{ option.label }}
              </button>
            </li>
          </ul>
        </section>
      </div>
    </PopoverPanel>
  </Popover>
</template>
