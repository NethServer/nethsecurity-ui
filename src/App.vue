<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ControllerApp from './ControllerApp.vue'
import StandaloneApp from './StandaloneApp.vue'
import { useThemeStore } from '@/stores/theme'
import { onMounted } from 'vue'
import { isStandaloneMode } from './lib/config'

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

const themeStore = useThemeStore()

onMounted(() => {
  console.log('%c' + welcomeMsg, 'background: #0891b2; color: white;')
  themeStore.loadTheme()
})
</script>

<template>
  <template v-if="isStandaloneMode()">
    <StandaloneApp />
  </template>
  <template v-else>
    <ControllerApp />
  </template>
</template>
