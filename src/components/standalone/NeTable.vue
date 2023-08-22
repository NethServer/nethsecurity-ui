<script lang="ts" setup>
import type { PropType } from 'vue'
import { NeSkeleton } from '@nethserver/vue-tailwind-lib'
import { get } from 'lodash'
import { useI18n } from 'vue-i18n'

/**
 * Headers that can be passed to the table.
 */
interface Headers {
  label?: string
  key: string
}

/**
 * Key-value data that will be rendered to the table.
 */
interface Data {
  [key: string]: any
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
    type: Array<Headers>,
    required: true
  },
  /**
   * Data that will be used to populate the table, values will be extracted from the header key.
   */
  data: {
    type: Array<Data>,
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
   * Styling of the table.
   */
  style: {
    type: String as PropType<TableStyle>,
    default: 'basic'
  }
})
</script>

<template>
  <div :class="['table-' + style, { 'read-only': readonly }]">
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
                <NeSkeleton :lines="10" />
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
                <td :colspan="headers.length">{{ t('No element.') }}</td>
              </tr>
            </template>
          </template>
        </tbody>
      </slot>
    </table>
  </div>
</template>

<style>
table {
  @apply w-full;
}

/* Base style CSS. */
.table-basic {
  @apply -mx-4 overflow-hidden overflow-x-auto border-y border-gray-300 dark:border-gray-600 sm:mx-0 sm:rounded-lg sm:border-x;
}

.table-basic table {
  @apply divide-y divide-gray-300 dark:divide-gray-600;
}

.table-basic thead {
  @apply hidden bg-gray-100 dark:bg-gray-800 md:table-header-group;
}

.table-basic.read-only thead {
  @apply bg-transparent;
}

.table-basic tbody {
  @apply divide-y divide-gray-300 dark:divide-gray-600 dark:bg-gray-950;
}

.table-basic.read-only tbody {
  @apply bg-transparent;
}

.table-basic th {
  @apply whitespace-nowrap px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-50;
}

.table-basic td {
  @apply whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-200;
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
  @apply bg-gray-100 px-6 py-4 first-of-type:rounded-l-md last-of-type:rounded-r-md dark:bg-gray-800;
}
</style>
