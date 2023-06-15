<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUnitsStore } from '@/stores/controller/units'
import { NeButton } from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'
import { isEmpty } from 'lodash'
import { useUnitManagementStore } from '@/stores/controller/unitManagement'
import { useRouter } from 'vue-router'

const unitsStore = useUnitsStore()
const unitManagementStore = useUnitManagementStore()
const router = useRouter()

onMounted(() => {
  unitsStore.getUnits()
})

async function manageUnit(unitName: string) {
  await unitManagementStore.manageUnit(unitName)
  router.push(`/controller/manage/${unitName}/dashboard`)
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl">Dashboard</h1>
  </div>
  <div class="flex items-center gap-4">
    <div class="mb-4 text-lg">Units</div>
    <NeButton @click="unitsStore.getUnits" class="mb-4">Reload units</NeButton>
  </div>
  <div v-for="(unit, index) in unitsStore.units" :key="index" class="flex items-center gap-12 mb-2">
    <template v-if="unit">
      <span>{{ unit.name }}</span>
      <span>{{ unit.ipaddress ? unit.ipaddress : '-' }}</span>
      <span>{{ unit.registered ? 'Registered' : 'Not registered' }}</span>
      <span>{{ isEmpty(unit.vpn) ? 'Not connected' : 'Connected' }}</span>
      <span v-if="unit.registered && !isEmpty(unit.vpn)">
        <NeButton @click="manageUnit(unit.name)">Manage unit</NeButton>
      </span>
    </template>
  </div>
  <div class="mt-10">
    {{ unitsStore.units }}
  </div>
  <div class="mt-10">
    <div>Connected unit:</div>
    {{ unitManagementStore.unitName || '-' }}
  </div>
</template>
