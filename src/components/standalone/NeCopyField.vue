<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
const props = defineProps<{
  value: string
  label?: string
  copyValueLabel?: string
}>()

function copyValue() {
  navigator.clipboard.writeText(props.value)
}
</script>

<template>
  <div>
    <p class="mb-2 text-sm font-medium leading-6 text-gray-700 dark:text-gray-200" v-if="label">
      {{ label }}
    </p>
    <div
      class="text-md flex flex-row rounded-md border border-gray-300 bg-white text-gray-700 transition-colors duration-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-200 sm:text-sm sm:leading-6"
    >
      <div class="no-scrollbar mt-0 max-w-full flex-grow overflow-x-scroll px-3 py-1.5">
        {{ value }}
      </div>
      <button
        class="rounded-r-md bg-gray-50 px-3 py-1.5 duration-200 hover:bg-gray-200 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white focus:duration-0 dark:bg-gray-950 dark:hover:bg-gray-800 dark:focus:ring-primary-300 dark:focus:ring-offset-primary-950"
        @click="copyValue()"
      >
        <font-awesome-icon
          :icon="['fas', 'clone']"
          aria-hidden="true"
          :class="['h-4', 'w-4', copyValueLabel ? 'mr-2' : '']"
        />
        {{ copyValueLabel }}
      </button>
    </div>
  </div>
</template>

<style>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
