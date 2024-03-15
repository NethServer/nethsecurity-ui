<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeLink,
  NeTitle,
  NeInlineNotification,
  NeButton,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { NeTextInput } from '@nethserver/vue-tailwind-lib'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getProductName, getCompanyName } from '@/lib/config'
import { validateRequired } from '@/lib/validation'
import {
  deleteFromStorage,
  getStringFromStorage,
  saveToStorage
} from '@nethserver/vue-tailwind-lib'

let username = ref('')
let usernameRef = ref()
let password = ref('')
let passwordRef = ref()
let rememberMe = ref(false)

let error = ref({
  username: '',
  password: '',
  login: ''
})

const loginStore = useLoginStore()
const { t } = useI18n()

onMounted(() => {
  // read username from storage, if present
  const usernameFromStorage = getStringFromStorage('controllerUsername')

  if (usernameFromStorage) {
    rememberMe.value = true
    username.value = usernameFromStorage
    focusElement(passwordRef)
  } else {
    focusElement(usernameRef)
  }
})

async function login() {
  error.value.username = ''
  error.value.password = ''
  error.value.login = ''

  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }

  try {
    await loginStore.login(username.value, password.value)

    // set or remove username to/from local storage
    if (rememberMe.value) {
      saveToStorage('controllerUsername', username.value)
    } else {
      deleteFromStorage('controllerUsername')
    }
  } catch (err: any) {
    console.error('login error', err)

    if (err?.response?.status == 401) {
      error.value.login = 'login.incorrect_username_or_password'
      focusElement(passwordRef)
    } else {
      error.value.login = getAxiosErrorMessage(err)
    }
  }
}

function validate() {
  error.value.username = ''
  error.value.password = ''
  error.value.login = ''
  let isValidationOk = true

  // username

  {
    // check required
    let { valid, errMessage } = validateRequired(username.value)
    if (!valid) {
      error.value.username = errMessage as string

      if (isValidationOk) {
        isValidationOk = false
        focusElement(usernameRef)
      }
    }
  }

  // password

  {
    // check required
    let { valid, errMessage } = validateRequired(password.value)
    if (!valid) {
      error.value.password = errMessage as string

      if (isValidationOk) {
        isValidationOk = false
        focusElement(passwordRef)
      }
    }
  }
  return isValidationOk
}
</script>

<template>
  <div class="flex h-screen min-h-full flex-1 bg-gray-200 dark:bg-gray-950">
    <div
      class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24"
    >
      <div class="mx-auto w-full max-w-md">
        <div class="bg-gray-50 px-6 py-12 shadow dark:bg-gray-900 sm:rounded-lg sm:px-12">
          <NeTitle level="h2">{{
            t('login.welcome_title_controller', { product: getProductName() })
          }}</NeTitle>
          <div class="mb-4 text-sm text-gray-700 dark:text-gray-100">
            {{ t('login.welcome_description_controller', { product: getProductName() }) }}
          </div>
          <form class="space-y-6">
            <NeInlineNotification
              v-if="error.login"
              kind="error"
              :title="t('login.cannot_login')"
              :description="t(error.login)"
            />
            <NeTextInput
              :label="t('login.username')"
              v-model.trim="username"
              :invalidMessage="t(error.username)"
              ref="usernameRef"
            />
            <NeTextInput
              :label="t('login.password')"
              v-model="password"
              isPassword
              :showPasswordLabel="t('ne_text_input.show_password')"
              :hidePasswordLabel="t('ne_text_input.hide_password')"
              :invalidMessage="t(error.password)"
              ref="passwordRef"
            />
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  v-model="rememberMe"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 dark:border-gray-700 dark:text-primary-600 dark:focus:ring-primary-400"
                />
                <label
                  for="remember-me"
                  class="ml-3 block text-sm leading-6 text-gray-900 dark:text-gray-100"
                  >{{ t('login.remember_me') }}</label
                >
              </div>

              <div class="text-sm leading-6">
                <NeLink href="https://docs.nethsecurity.org/" target="_blank" class="font-medium">
                  {{ t('login.need_help') }}
                </NeLink>
              </div>
            </div>

            <div>
              <NeButton
                kind="primary"
                size="lg"
                @click.prevent="login"
                type="submit"
                class="w-full"
                >{{ t('login.sign_in') }}</NeButton
              >
            </div>
          </form>
        </div>
      </div>
    </div>
    <div
      class="relative hidden w-0 flex-1 items-center justify-center bg-gradient-to-t from-gray-950 to-primary-800 lg:flex"
    >
      <div class="flex w-2/3 flex-col items-center xl:w-2/5 3xl:w-1/3 5xl:w-1/4">
        <img src="/login_logo.svg" :alt="`${getCompanyName()} logo`" class="" />
        <span class="text-xl text-white">Controller</span>
      </div>
    </div>
  </div>
</template>
