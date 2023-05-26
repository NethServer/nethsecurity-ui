<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useLoginUserStore } from '@/stores/loginUser'
import { useThemeStore } from '@/stores/theme'
import {
  NeTitle,
  NeButton,
  NeTextInput,
  setStringItem,
  sortByProperty
} from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'

let list = ref([
  { id: 1, name: 'bbb' },
  { id: 2, name: 'aaa' }
])

const loginUserStore = useLoginUserStore()
const themeStore = useThemeStore()

function logout() {
  loginUserStore.setLoggedIn(false)
}

////
function sort() {
  list.value = list.value.sort(sortByProperty('name'))
}

const testInput = ref('')
</script>

<template>
  <NeTitle>Dashboard</NeTitle>
  <!-- <div> //// 
    <font-awesome-icon icon="fa-solid fa-user-secret" size="m" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'user-secret']" size="2xl" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'house']" size="3x" class="mr-2" />
    <font-awesome-icon :icon="['fas', 'address-book']" size="3x" class="mr-2" />
    <font-awesome-icon :icon="['fal', 'address-book']" size="3x" class="mr-2" />
  </div> -->
  <NeButton @click="logout">Sign out</NeButton>

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
