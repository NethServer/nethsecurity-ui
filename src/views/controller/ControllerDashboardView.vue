<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUnitsStore } from '@/stores/controller/units'
import { NeButton, NeTextInput } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'
import { isEmpty } from 'lodash'
import { useUnitManagementStore } from '@/stores/controller/unitManagement'
import { useRouter } from 'vue-router'

let newUnitName = ref('')

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

async function addUnit() {
  if (newUnitName.value.trim()) {
    await unitManagementStore.addUnit(newUnitName.value.trim())
    newUnitName.value = ''
  }
}

async function approveUnit(unitName: string) {
  await unitManagementStore.addUnit(unitName)
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl">Dashboard</h1>
  </div>
  <div class="flex items-center gap-4">
    <div class="mb-4 text-lg">Units</div>
    <NeButton @click="unitsStore.getUnits" class="mb-4">Reload units</NeButton>
  </div>
  <div
    v-for="(unit, index) in unitsStore.units"
    :key="index"
    class="flex items-center mb-2 max-w-3xl"
  >
    <template v-if="unit">
      <span class="w-1/5">{{ unit.name }}</span>
      <span class="w-1/5">{{ unit.ipaddress ? unit.ipaddress : '-' }}</span>
      <span class="w-1/5">{{ unit.registered ? 'Registered' : 'Not registered' }}</span>
      <span class="w-1/5">{{ isEmpty(unit.vpn) ? 'Not connected' : 'Connected' }}</span>
      <span v-if="!unit.registered" class="w-1/5">
        <NeButton @click="approveUnit(unit.name)">Approve unit</NeButton>
      </span>
      <span v-if="unit.registered && !isEmpty(unit.vpn)" class="w-1/5">
        <NeButton @click="manageUnit(unit.name)">Manage unit</NeButton>
      </span>
    </template>
  </div>
  <div class="mt-8 mb-4 text-lg">Add unit</div>
  <div class="flex items-end">
    <NeTextInput label="Unit name" v-model="newUnitName" class="max-w-xs mr-4" />
    <NeButton @click="addUnit" size="lg" :disabled="!newUnitName.trim()">Add unit</NeButton>
  </div>
</template>
