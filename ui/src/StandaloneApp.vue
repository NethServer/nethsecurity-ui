<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import StandaloneAppShell from '@/components/standalone/AppShell.vue'
import StandaloneAppLogin from '@/components/standalone/AppLogin.vue'
import { useLoginStore } from '@/stores/standalone/login'
import { onMounted } from 'vue'

const loginStore = useLoginStore()

onMounted(() => {
  loginStore.loadUserFromStorage()
})
</script>

<template>
  <template v-if="loginStore.isLoggedIn">
    <StandaloneAppShell />
  </template>
  <template v-else>
    <StandaloneAppLogin />
  </template>
</template>
