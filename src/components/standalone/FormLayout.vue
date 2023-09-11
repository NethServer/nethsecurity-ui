<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
defineProps({
  title: String,
  description: String
})
</script>

<template>
  <div class="flex flex-col md:flex-row">
    <div class="sm:mr-6 md:w-5/12">
      <slot name="title">
        <h2 class="mb-2 text-xl font-medium">{{ title }}</h2>
      </slot>
      <slot name="description">
        <p class="mb-8 text-sm font-normal text-gray-500 dark:text-gray-400">{{ description }}</p>
      </slot>
    </div>
    <div class="md:w-7/12">
      <slot></slot>
    </div>
  </div>
</template>
