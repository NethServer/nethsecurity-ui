<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, type PropType } from 'vue'

type ButtonKind = 'primary' | 'secondary' | 'tertiary' | 'danger'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = defineProps({
  kind: {
    type: String as PropType<ButtonKind>,
    default: 'secondary'
  },
  size: {
    type: String as PropType<ButtonSize>,
    default: 'md'
  }
})

const baseStyle =
  'font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed focus-visible:outline-primary-500 dark:focus-visible:outline-primary-200 disabled:text-gray-400 dark:focus-visible:outline-primary-200 dark:disabled:text-gray-600'

const sizeStyle: { [index: string]: string } = {
  xs: 'rounded px-2 py-1 text-xs',
  sm: 'rounded px-2 py-1 text-sm',
  md: 'rounded-md px-2.5 py-1.5 text-sm',
  lg: 'rounded-md px-3 py-2 text-sm',
  xl: 'rounded-md px-3.5 py-2.5 text-sm'
}
const kindStyle: { [index: string]: string } = {
  primary:
    'shadow-sm bg-primary-700 text-white hover:bg-primary-800 disabled:bg-gray-200 disabled:ring-gray-200 dark:bg-primary-500 dark:text-primary-950 dark:hover:bg-primary-300 dark:disabled:bg-gray-600 dark:disabled:ring-gray-600',
  secondary:
    'shadow-sm ring-1 ring-inset bg-white text-primary-700 ring-gray-300 hover:bg-gray-50 hover:text-primary-800 disabled:bg-gray-200 disabled:ring-gray-200 dark:bg-gray-900 dark:text-primary-500 dark:ring-gray-200 dark:hover:bg-gray-600 dark:hover:text-primary-500 dark:disabled:bg-gray-600 dark:disabled:ring-gray-600',
  tertiary: 'text-primary-700 hover:text-primary-800 hover:bg-gray-50 dark:text-primary-500 dark:hover:text-primary-500 dark:hover:bg-gray-600',
  danger:
    'shadow-sm bg-rose-700 text-white hover:bg-rose-800 disabled:bg-gray-200 disabled:ring-gray-200 dark:bg-rose-500 dark:text-rose-950 dark:hover:bg-rose-400 dark:disabled:bg-gray-600 dark:disabled:ring-gray-600'
}

const allStyles = computed(() =>
  [baseStyle, kindStyle[props.kind], sizeStyle[props.size]].join(' ')
)
</script>

<template>
  <button :class="allStyles"><slot></slot></button>
</template>
