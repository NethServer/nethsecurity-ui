<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ControllerApp from './ControllerApp.vue'
import StandaloneApp from './StandaloneApp.vue'
import { useThemeStore } from '@/stores/theme'
import { onMounted } from 'vue'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.loadTheme()
})

const mode = import.meta.env.VITE_UI_MODE
</script>

<template>
  <!-- controller -->
  <template v-if="mode === 'controller'">
    <ControllerApp />
  </template>
  <!-- standalone -->
  <template v-else>
    <StandaloneApp />
  </template>
</template>
