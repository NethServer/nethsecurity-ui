<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useLoginUserStore } from '@/stores/loginUser'
import NeButton from '../components/common/NeButton.vue'
import NeTitle from '../components/common/NeTitle.vue'

const loginUserStore = useLoginUserStore()

function logout() {
  loginUserStore.setLoggedIn(false)
}
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
</template>
