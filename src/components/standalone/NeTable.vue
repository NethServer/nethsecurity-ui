<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import type { PropType } from 'vue'
import { get } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { NeSkeleton } from '@nethesis/vue-components'

/**
 * Headers that can be passed to the table.
 */
interface Headers {
  label?: string
  key: string
}

/**
 * Table style.
 */
type TableStyle = 'basic' | 'card'

const { t } = useI18n()

defineOptions({
  inheritAttrs: false
})

defineProps({
  /**
   * List of headers to be viewed in the table.
   */
  headers: {
    type: Object as PropType<Array<Headers>>,
    required: true
  },
  /**
   * Data that will be used to populate the table, values will be extracted from the header key.
   */
  data: {
    type: Object as PropType<Array<any>>,
    required: true
  },
  /**
   * Mark the table as readonly.
   */
  readonly: {
    type: Boolean,
    default: false
  },
  /**
   * Loading state of the table.
   */
  loading: {
    type: Boolean,
    default: false
  },
  /**
   * Number of lines shown for the loading skeleton
   */
  skeletonLines: {
    type: Number,
    default: 10
  },
  /**
   * Styling of the table.
   */
  style: {
    type: String as PropType<TableStyle>,
    default: 'basic'
  },
  /**
   * Hide border and header background
   */
  ghost: {
    type: Boolean
  },
  /**
   * Reduce vertical padding of rows
   */
  condensed: {
    type: Boolean
  }
})
</script>

<template>
  <div>
    <div :class="['table-' + style, { ghost: ghost, condensed: condensed, 'read-only': readonly }]">
      <table v-bind="$attrs" :class="$attrs">
        <slot name="thead">
          <thead>
            <tr>
              <th v-for="header in headers" :key="header.key" scope="col">
                {{ header.label }}
              </th>
            </tr>
          </thead>
        </slot>
        <slot name="tbody">
          <tbody>
            <template v-if="loading">
              <tr>
                <td :colspan="headers.length">
                  <NeSkeleton :lines="skeletonLines" />
                </td>
              </tr>
            </template>
            <template v-else>
              <template v-if="data.length > 0">
                <tr v-for="item in data" :key="item.key">
                  <template v-for="header in headers" :key="header.key">
                    <td>
                      <slot :item="item" :name="header.key">
                        {{ get(item, header.key) }}
                      </slot>
                    </td>
                  </template>
                </tr>
              </template>
              <template v-else>
                <tr>
                  <td :colspan="headers.length">{{ t('ne_table.no_items') }}</td>
                </tr>
              </template>
            </template>
          </tbody>
        </slot>
      </table>
    </div>
  </div>
</template>

<style>
table {
  @apply w-full;
}

/* Base style CSS. */
.table-basic {
  @apply -mx-4 overflow-x-auto border-y border-gray-300 dark:border-gray-600 sm:mx-0 sm:rounded-lg sm:border-x;
}

.table-basic.ghost {
  @apply border-transparent dark:border-transparent;
}

.table-basic table {
  @apply divide-y divide-gray-300 dark:divide-gray-600;
}

.table-basic thead {
  @apply hidden bg-gray-100 dark:bg-gray-800 md:table-header-group;
}

.table-basic.ghost thead {
  @apply bg-transparent dark:bg-transparent;
}

.table-basic.read-only thead {
  @apply bg-transparent;
}

.table-basic tbody {
  @apply divide-y divide-gray-300 bg-white dark:divide-gray-600 dark:bg-gray-950;
}

.table-basic.read-only tbody {
  @apply bg-transparent;
}

.table-basic th {
  @apply whitespace-nowrap px-6 pb-3 pt-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-50;
}

.table-basic.condensed th {
  @apply px-4 pb-2 pt-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-50;
}

.table-basic.ghost th {
  @apply px-0;
}

.table-basic td {
  @apply whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-200;
}

.table-basic.condensed td {
  @apply px-4 py-2;
}

.table-basic.ghost td {
  @apply px-0;
}

/* Card style CSS. */
.table-card {
  @apply overflow-hidden overflow-x-auto;
}

.table-card table {
  @apply border-separate border-spacing-y-4;
}

.table-card th {
  @apply px-6 text-start text-base font-medium;
}

.table-card td {
  @apply bg-white px-6 py-4 first-of-type:rounded-l-md last-of-type:rounded-r-md dark:bg-gray-800;
}

.table-card.condensed td {
  @apply px-4 py-2;
}
</style>
