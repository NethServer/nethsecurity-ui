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
  'font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:focus-visible:outline-cyan-200 disabled:text-gray-400 disabled:cursor-not-allowed'

const sizeStyle: { [index: string]: string } = {
  xs: 'rounded px-2 py-1 text-xs',
  sm: 'rounded px-2 py-1 text-sm',
  md: 'rounded-md px-2.5 py-1.5 text-sm',
  lg: 'rounded-md px-3 py-2 text-sm',
  xl: 'rounded-md px-3.5 py-2.5 text-sm'
}
const kindStyle: { [index: string]: string } = {
  primary:
    'shadow-sm bg-cyan-700 text-white hover:bg-cyan-800 disabled:bg-gray-200 disabled:ring-gray-200',
  secondary:
    'shadow-sm ring-1 ring-inset bg-white text-cyan-700 ring-gray-300 hover:bg-gray-50 hover:text-cyan-800 disabled:bg-gray-200 disabled:ring-gray-200',
  tertiary: 'text-cyan-700 hover:text-cyan-800',
  danger:
    'shadow-sm bg-rose-700 text-white hover:bg-rose-800 disabled:bg-gray-200 disabled:ring-gray-200'
}

const allStyles = computed(() =>
  [baseStyle, kindStyle[props.kind], sizeStyle[props.size]].join(' ')
)
</script>

<template>
  <button :class="allStyles"><slot></slot></button>
</template>
