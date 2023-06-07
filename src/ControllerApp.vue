<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import ControllerAppShell from '@/components/controller/ControllerAppShell.vue'
import ControllerAppLogin from '@/components/controller/ControllerAppLogin.vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { onMounted } from 'vue'

const loginStore = useLoginStore()

onMounted(() => {
  loginStore.loadUserFromStorage()
})
</script>

<template>
  <template v-if="loginStore.isLoggedIn">
    <ControllerAppShell />
  </template>
  <template v-else>
    <ControllerAppLogin />
  </template>
</template>
