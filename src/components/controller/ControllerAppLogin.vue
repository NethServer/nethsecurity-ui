<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle, NeButton, NeTextInput } from '@nethserver/vue-tailwind-lib'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { ref } from 'vue'

const loginStore = useLoginStore()

let username = ref('')
let password = ref('')

function login() {
  //// validation

  loginStore.login(username.value, password.value)
}
</script>

<template>
  <div class="flex min-h-full h-screen flex-1 bg-gray-950">
    <div
      class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24"
    >
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <div class="px-6 py-12 shadow sm:rounded-lg sm:px-12 bg-gray-50 dark:bg-gray-900">
          <!-- logo //// -->
          <NeTitle level="h2">Welcome (controller)</NeTitle>
          <div class="text-sm mb-4 text-gray-700 dark:text-gray-100">
            Sign in to NethSecurity, secure your network and access the cloud quickly.
          </div>
          <form class="space-y-6">
            <NeTextInput label="Username" v-model="username" />

            <NeTextInput
              label="Password"
              v-model="password"
              isPassword
              showPasswordLabel="Show password"
              hidePasswordLabel="Hide password"
            />

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 dark:border-gray-700 dark:text-primary-600 dark:focus:ring-primary-400"
                />
                <label
                  for="remember-me"
                  class="ml-3 block text-sm leading-6 text-gray-900 dark:text-gray-100"
                  >Remember me</label
                >
              </div>

              <div class="text-sm leading-6">
                <a
                  href="#"
                  class="font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
                  >Need help?</a
                >
              </div>
            </div>

            <div>
              <NeButton kind="primary" @click.prevent="login" class="w-full">Sign in</NeButton>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div class="relative hidden w-0 flex-1 lg:block">
      <img
        class="absolute inset-0 h-full w-full object-cover"
        src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
        alt=""
      />
    </div>
  </div>
</template>
