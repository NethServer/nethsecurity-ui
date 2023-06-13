<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUnitsStore } from '@/stores/controller/units'
import { NeButton } from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'
import { isEmpty } from 'lodash'

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
  <div v-for="(unit, index) in unitsStore.units" :key="index" class="flex gap-12">
    <template v-if="unit">
      <span>{{ unit.name }}</span>
      <span>{{ unit.ipaddress ? unit.ipaddress : '-' }}</span>
      <span>{{ unit.registered ? 'Registered' : 'Not registered' }}</span>
      <span>{{ isEmpty(unit.vpn) ? 'Not connected' : 'Connected' }}</span>
    </template>
  </div>
  <div class="mt-10">
    {{ unitsStore.units }}
  </div>
</template>
