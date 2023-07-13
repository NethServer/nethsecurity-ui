<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { NeButton } from '@nethserver/vue-tailwind-lib'
import { getControllerRoutePrefix } from '@/lib/router'
import { useI18n } from 'vue-i18n'

const loginStore = useLoginStore()
const { t } = useI18n()
</script>

<template>
  <div class="p-5">
    <div class="mb-3 text-2xl">Controller shell</div>
    <div class="flex gap-3 mb-8">
      <router-link :to="`${getControllerRoutePrefix()}/dashboard`" class="underline"
        >Dashboard</router-link
      >
      <router-link :to="`${getControllerRoutePrefix()}/logs`" class="underline">Logs</router-link>
      <router-link :to="`${getControllerRoutePrefix()}/settings`" class="underline">{{
        t('controller.settings.title')
      }}</router-link>
      <NeButton size="lg" @click="loginStore.logout">Logout</NeButton>
    </div>
    <div class="relative">
      <RouterView />
    </div>
  </div>
</template>
