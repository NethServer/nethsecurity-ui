<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUnitsStore } from '@/stores/controller/units'
import { NeButton } from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'

const unitsStore = useUnitsStore()

onMounted(() => {
  unitsStore.getUnits()
})
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl">Dashboard</h1>
  </div>
  <div class="flex items-center gap-4">
    <div class="mb-4 text-lg">Units</div>
    <NeButton @click="unitsStore.getUnits" class="mb-4">Reload units</NeButton>
  </div>
  <div v-for="(unit, index) in unitsStore.units" :key="index" class="flex gap-8">
    <span>{{ unit.name }}</span>
    <span>{{ unit.ipaddress }}</span>
    <span>{{ unit.registered ? 'registered' : 'not registered' }}</span>
    <span>{{ unit.vpn ? 'connected' : 'not connected' }}</span>
  </div>
  <div class="mt-4">
    {{ unitsStore.units }}
  </div>
</template>
