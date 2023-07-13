<script lang="ts" setup>
defineProps({
  title: String,
  description: String
})
</script>

<template>
  <div class="flex flex-col md:flex-row">
    <div class="md:w-5/12 md:pr-6">
      <slot name="title">
        <h2 class="font-medium text-xl mb-2">{{ title }}</h2>
      </slot>
      <slot name="description">
        <p class="font-normal text-sm text-gray-500 dark:text-gray-400 mb-8">{{ description }}</p>
      </slot>
    </div>
    <div class="md:w-7/12">
      <slot></slot>
    </div>
  </div>
</template>
