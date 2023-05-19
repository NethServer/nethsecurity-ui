<script setup lang="ts">
import { useLoginUserStore } from '@/stores/loginUser'
import NeButton from '../components/common/NeButton.vue' ////

const loginUserStore = useLoginUserStore()

function logout() {
  loginUserStore.setLoggedIn(false)
}
</script>

<template>
  <div>Dashboard</div>
  <div>
    <font-awesome-icon icon="fa-solid fa-user-secret" size="m" />
    <font-awesome-icon :icon="['fas', 'user-secret']" size="2xl" />
    <font-awesome-icon :icon="['fas', 'user-secret']" size="3x" />
    <font-awesome-icon :icon="['fal', 'headset']" size="3x" />
  </div>
  <NeButton @click="logout" class="mt-4">Sign out</NeButton>
</template>
