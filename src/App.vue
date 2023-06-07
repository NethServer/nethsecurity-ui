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

const welcomeMsg = [
  '  _   _      _   _      _____                      _ _         ',
  ' | \\ | |    | | | |    / ____|                    (_) |        ',
  ' |  \\| | ___| |_| |__ | (___   ___  ___ _   _ _ __ _| |_ _   _ ',
  " | . ` |/ _ \\ __| '_ \\ \\___ \\ / _ \\/ __| | | | '__| | __| | | |",
  ' | |\\  |  __/ |_| | | |____) |  __/ (__| |_| | |  | | |_| |_| |',
  ' |_| \\_|\\___|\\__|_| |_|_____/ \\___|\\___|\\__,_|_|  |_|\\__|\\__, |',
  '                                                          __/ |',
  '                                                         |___/ '
].join('\n')

onMounted(() => {
  themeStore.loadTheme()

  console.log('%c' + welcomeMsg, 'background: #0891b2; color: white;')
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
