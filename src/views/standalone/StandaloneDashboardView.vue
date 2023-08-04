<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle, NeButton } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { savePreference } from '@nethserver/vue-tailwind-lib'
import { ubusCall } from '@/lib/standalone/ubus'
import { onBeforeRouteUpdate } from 'vue-router'
import { ref } from 'vue'

const loginStore = useLoginStore()
const { t } = useI18n()

const output = ref('')

async function changeLocale(lang: string) {
  savePreference('locale', lang, loginStore.username)

  // reload page
  location.reload()
}

async function test() {
  const res = await ubusCall('ns.templates', 'add_ipv6_rules') ////

  console.log('res', res) ////

  output.value = res.data
}
</script>

<template>
  <NeTitle>{{ t('standalone.dashboard.title') }}</NeTitle>

  <!-- ////  -->
  <div class="mb-8">
    <NeButton size="lg" @click="changeLocale('it')" class="mb-4 mr-4">ITA</NeButton>
    <NeButton size="lg" @click="changeLocale('en')" class="mb-4">ENG</NeButton>
  </div>

  <NeButton size="lg" @click="test" class="mt-8">ns.templates add_ipv6_rules</NeButton>
  <div class="mt-4">Output:</div>
  <div>{{ output }}</div>
</template>
