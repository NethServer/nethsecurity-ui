<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUnitsStore } from '@/stores/controller/units'
import { NeButton, NeTextInput } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'
import { isEmpty } from 'lodash-es'
import { useUnitManagementStore } from '@/stores/controller/unitManagement'
import { useRouter } from 'vue-router'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { savePreference } from '@nethserver/vue-tailwind-lib'

const unitsStore = useUnitsStore()
const unitManagementStore = useUnitManagementStore()
const router = useRouter()
const loginStore = useLoginStore()

let newUnitName = ref('')

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

async function changeLocale(lang: string) {
  savePreference('locale', lang, loginStore.username)

  // reload page
  location.reload()
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl">Dashboard</h1>
  </div>
  <div class="flex items-center gap-4">
    <div class="mb-4 text-lg">Units</div>
    <NeButton size="lg" @click="unitsStore.getUnits" class="mb-4">Reload units</NeButton>
  </div>
  <div
    v-for="(unit, index) in unitsStore.units"
    :key="index"
    class="mb-2 flex max-w-3xl items-center"
  >
    <template v-if="unit">
      <span class="w-1/5">{{ unit.id }}</span>
      <span class="w-1/5">{{ unit.name }}</span>
      <span class="w-1/5">{{ unit.ipaddress ? unit.ipaddress : '-' }}</span>
      <span class="w-1/5">{{ unit.registered ? 'Registered' : 'Not registered' }}</span>
      <span class="w-1/5">{{ isEmpty(unit.vpn) ? 'Not connected' : 'Connected' }}</span>
      <span v-if="!unit.registered" class="w-1/5">
        <NeButton size="lg" @click="approveUnit(unit.id)">Approve unit</NeButton>
      </span>
      <span v-if="unit.registered && !isEmpty(unit.vpn)" class="w-1/5">
        <NeButton size="lg" @click="manageUnit(unit.id)">Manage unit</NeButton>
      </span>
    </template>
  </div>
  <div class="mb-4 mt-8 text-lg">Add unit</div>
  <div class="flex items-end">
    <NeTextInput label="Unit name" v-model.trim="newUnitName" class="mr-4 max-w-xs" />
    <NeButton @click="addUnit" size="lg" :disabled="!newUnitName.trim()">Add unit</NeButton>
  </div>
  <!-- ////  -->
  <div class="my-8">
    <div class="mb-4">Select language</div>
    <NeButton size="lg" @click="changeLocale('it')" class="mb-4 mr-4">Italian</NeButton>
    <NeButton size="lg" @click="changeLocale('en')" class="mb-4">English</NeButton>
  </div>
</template>
