<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import AppShell from '@/components/AppShell.vue'
import LoginView from '@/views/LoginView.vue'
import { useLoginUserStore } from '@/stores/loginUser'
import { useThemeStore } from '@/stores/theme'
import { onMounted } from 'vue';

const loginUserStore = useLoginUserStore()
const themeStore = useThemeStore()

onMounted(() => {
  themeStore.loadTheme()
})
</script>

<template>
  <template v-if="loginUserStore.isLoggedIn">
    <AppShell />
  </template>
  <template v-else>
    <LoginView />
  </template>
</template>
