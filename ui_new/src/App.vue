<script setup lang="ts">
import AppShell from './components/AppShell.vue' ////
import LoginView from './views/LoginView.vue' ////
import { useLoginUserStore } from '@/stores/loginUser'

const loginUserStore = useLoginUserStore()
</script>

<template>
  <template v-if="loginUserStore.isLoggedIn">
    <AppShell />
  </template>
  <template v-else>
    <LoginView />
  </template>
</template>

<!-- //// remove? -->
<style scoped></style>
