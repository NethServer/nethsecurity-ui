<script lang="ts" setup>
import { NeSkeleton } from '@nethserver/vue-tailwind-lib'
import { get } from 'lodash'

type Headers = {
  label: string
  key: string
}

type Data = {
  [key: string]: any
}

defineProps({
  headers: {
    type: Array<Headers>,
    required: true
  },
  data: {
    type: Array<Data>,
    required: true
  },
  readonly: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div class="overflow-x-auto -mx-4 sm:mx-0">
    <div class="inline-block min-w-full pb-2 align-middle">
      <div
        class="overflow-hidden sm:rounded-lg border-y sm:border-x border-gray-300 dark:border-gray-600"
      >
        <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
          <thead :class="{ 'bg-gray-100 dark:bg-gray-800': !readonly }">
            <tr>
              <th v-for="header in headers" :key="header.key" scope="col">
                {{ header.label }}
              </th>
              <th v-if="$slots.action"></th>
            </tr>
          </thead>
          <tbody
            :class="{ 'bg-white dark:bg-gray-950': !readonly }"
            class="divide-y divide-gray-300 dark:divide-gray-600"
          >
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
                  <td v-if="$slots.action">
                    <slot :item="item" name="action"></slot>
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr>
                  <td :colspan="headers.length">No element found.</td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
td {
  @apply whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200 px-6 py-4;
}

th {
  @apply px-6 py-3 text-left text-sm whitespace-nowrap font-medium text-gray-900 dark:text-gray-50;
}
</style>
