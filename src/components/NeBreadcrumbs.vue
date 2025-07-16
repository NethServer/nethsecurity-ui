<script generic="T extends BreadcrumbItem" lang="ts" setup>
import { computed } from 'vue'

export type BreadcrumbItem = {
  order: number
  label: string
}

const { items, separator = '>' } = defineProps<{
  items: T[]
  separator?: string
}>()

defineEmits<{
  click: [item: T]
}>()

const orderedItems = computed<T[]>(() => [...items].sort((a, b) => a.order - b.order))
</script>

<template>
  <nav aria-label="Breadcrumb" class="font-medium">
    <ul class="flex space-x-1">
      <template v-for="(item, index) in orderedItems" :key="item.order">
        <li class="space-x-1">
          <template v-if="index < orderedItems.length - 1">
            <a
              class="text-primary-700 hover:text-primary-800 hover:underline dark:text-primary-500 dark:hover:text-primary-400"
              href="#"
              @click.prevent="$emit('click', item)"
            >
              {{ item.label }}
            </a>
            <span>{{ separator }}</span>
          </template>
          <template v-else>
            <span aria-label="page">{{ item.label }}</span>
          </template>
        </li>
      </template>
    </ul>
  </nav>
</template>
