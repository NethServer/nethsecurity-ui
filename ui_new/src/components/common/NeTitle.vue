<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, type PropType } from 'vue' ////

type TitleLevel = 'h1' | 'h2' | 'h3'

const props = defineProps({
  level: {
    type: String as PropType<TitleLevel>,
    default: 'h1'
  }
})

const baseStyle = 'text-gray-900 font-medium leading-normal'

const levelStyle: { [index: string]: string } = {
  h1: 'text-2xl mb-4',
  h2: 'text-lg mb-2',
  h3: 'text-base mb-1.5'
}

const allStyles = computed(() => [baseStyle, levelStyle[props.level]].join(' '))
</script>

<template>
  <h1 :class="allStyles"><slot></slot></h1>
</template>
