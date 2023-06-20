<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle, NeButton, sortByProperty } from '@nethserver/vue-tailwind-lib'
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

  <!-- <div> //// 
    <font-awesome-icon icon="fa-solid fa-user-secret" size="m" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'user-secret']" size="2xl" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'house']" size="3x" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'address-book']" size="3x" class="mr-2" />
    <font-awesome-icon :icon="['fal', 'address-book']" size="3x" class="mr-2" />
  </div> -->

  <!-- <NeButton @click="testLogin">Test login</NeButton> ////  -->

  <!-- <div>product {{ product }}</div> ////  -->

  <!-- <div>loginStore.username {{ loginStore.username }}</div> ////  -->

  <!-- <div> //// 
    <NeButton @click="setStringItem('test', new Date().toISOString())">set to storage</NeButton>
  </div>
  <div>
    <NeButton @click="sort">Sort</NeButton>
  </div>
  <div>
    <NeButton disabled>Disabled button</NeButton>
  </div>
  <div>
    <NeTextInput label="Test" v-model="testInput" invalidMessage="Error" />
  </div>
  <div>{{ list }}</div>
  <div>theme: {{ themeStore.theme }}</div> -->
</template>
