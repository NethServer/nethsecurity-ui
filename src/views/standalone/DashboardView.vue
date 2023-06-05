<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useLoginStore } from '@/stores/standalone/login'
import {
  NeTitle,
  NeButton,
  NeTextInput,
  setStringItem,
  sortByProperty
} from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { getProductName } from '@/lib/config'
import { ubusCall } from '@/lib/standalone/ubus'

const loginStore = useLoginStore()

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

function testUbus() {
  ubusCall('luci', 'getRealtimeStats', {
    mode: 'conntrack'
  })
}
</script>

<template>
  <NeTitle>Dashboard</NeTitle>

  <!-- ////  -->
  <NeButton @click="testUbus">Test ubus</NeButton>

  <!-- <div> //// 
    <font-awesome-icon icon="fa-solid fa-user-secret" size="m" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'user-secret']" size="2xl" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'house']" size="3x" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'address-book']" size="3x" class="mr-2" />
    <font-awesome-icon :icon="['fal', 'address-book']" size="3x" class="mr-2" />
  </div> -->

  <!-- <NeButton @click="testLogin">Test login</NeButton> ////  -->

  <div>product {{ product }}</div>

  <div>loginStore.username {{ loginStore.username }}</div>

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
