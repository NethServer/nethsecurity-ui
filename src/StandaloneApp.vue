<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import StandaloneAppShell from '@/components/standalone/StandaloneAppShell.vue'
import StandaloneAppLogin from '@/components/standalone/StandaloneAppLogin.vue'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
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
