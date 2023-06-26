<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle, NeButton, NeComboBox, sortByProperty } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { getProductName } from '@/lib/config'
import { ubusCall } from '@/lib/standalone/ubus'
import { useI18n } from 'vue-i18n'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { savePreference } from '@/lib/storage'

const loginStore = useLoginStore()
const { t } = useI18n()

////
let list = ref([
  { id: 1, name: 'bbb' },
  { id: 2, name: 'aaa' }
])

////
function sort() {
  list.value = list.value.sort(sortByProperty('name'))
}

// let testInput = ref('') ////

const product = getProductName() ////

let ubusOutput = ref('')

async function testUbus() {
  ubusOutput.value = await ubusCall('luci', 'getRealtimeStats', {
    mode: 'conntrack'
  })
}

async function changeLocale(lang: string) {
  savePreference('locale', lang, loginStore.username)

  // reload page
  location.reload()
}

const cboItems = [
  { id: '1', label: 'First' },
  { id: '2', label: 'Second' },
  { id: '3', label: 'Third', disabled: true },
  { id: '4', label: 'Fourth' }
]
let cboSelected = ref('4')
</script>

<template>
  <NeTitle>{{ t('standalone.dashboard.title') }}</NeTitle>

  <!-- ////  -->
  <div class="mb-8">
    <div class="mb-4">Select language</div>
    <NeButton @click="changeLocale('it')" class="mb-4 mr-4">Italian</NeButton>
    <NeButton @click="changeLocale('en')" class="mb-4">English</NeButton>
  </div>

  <div class="mb-8">Test i18n label: {{ t('common.save') }}</div>

  <!-- ////  -->
  <NeButton @click="testUbus" class="mb-4">Test ubus</NeButton>

  <div>{{ ubusOutput }}</div>

  <!-- <NeComboBox v-model="cboSelected" :options="cboItems" label="Label" /> ////
  <NeButton @click="cboSelected = '2'" class="mb-4">Set cbo</NeButton> -->
</template>
