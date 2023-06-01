<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useLoginStore } from '@/stores/controller/login'
import { NeButton } from '@nethserver/vue-tailwind-lib'

const loginStore = useLoginStore()
</script>

<!-- //// review -->

<template>
  <div class="p-5">
    <div class="mb-3">Controller shell</div>
    <div class="flex gap-3 mb-3">
      <router-link to="/controller/dashboard" class="underline">Dashboard</router-link>
      <router-link to="/controller/logs" class="underline">Logs</router-link>
      <router-link to="/controller/settings" class="underline">Settings</router-link>
      <NeButton @click="loginStore.logout">Logout</NeButton>
    </div>
    <RouterView />
  </div>
</template>
