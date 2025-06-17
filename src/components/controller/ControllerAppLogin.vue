<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getAxiosErrorMessage,
  getStringFromStorage,
  NeButton,
  NeHeading,
  NeInlineNotification,
  NeLink,
  NeTextInput
} from '@nethesis/vue-components'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCompanyName, getPrivacyPolicyUrl, getProductName } from '@/lib/config'
import { MessageBag, validateRequired, validateSixDigitCode } from '@/lib/validation'
import { getControllerRoutePrefix } from '@/lib/router'
import router from '@/router'
import { ValidationError } from '@/lib/standalone/ubus'

const username = ref('')
const password = ref('')
const twoFaOtp = ref('')
const formRefs = {
  username: useTemplateRef<HTMLInputElement>('username-ref'),
  password: useTemplateRef<HTMLInputElement>('password-ref'),
  twoFaOtp: useTemplateRef<HTMLInputElement>('two-fa-otp-ref')
}
const rememberMe = ref(false)
const validationErrors = ref(new MessageBag())
const error = ref<Error>()

const loading = ref(false)

const loginStore = useLoginStore()
const { t } = useI18n()

onMounted(() => {
  // read username from storage, if present
  const usernameFromStorage = getStringFromStorage('controllerUsername')

  if (usernameFromStorage) {
    rememberMe.value = true
    username.value = usernameFromStorage
    formRefs.password.value?.focus()
  } else {
    formRefs.username.value?.focus()
  }
})

async function login() {
  loading.value = true
  error.value = undefined
  if (isFormInvalid()) {
    loading.value = false
    return
  }

  try {
    await loginStore.login(username.value, password.value, rememberMe.value)
    if (!loginStore.twoFaActive) {
      await router.push(`${getControllerRoutePrefix()}/`)
    }
  } catch (err: any) {
    if (err?.response?.status == 401) {
      error.value = new Error('login.incorrect_username_or_password')
      formRefs.password.value?.focus()
    } else {
      error.value = new Error(getAxiosErrorMessage(err))
    }
  } finally {
    loading.value = false
  }
}

async function verifyTwoFa() {
  loading.value = true
  error.value = undefined
  if (isFormInvalid()) {
    loading.value = false
    return
  }
  try {
    await loginStore.verifyTwoFaToken(username.value, twoFaOtp.value)
    await router.push(`${getControllerRoutePrefix()}/`)
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrors.value = err.errorBag
      formRefs.twoFaOtp.value?.focus()
    } else {
      error.value = new Error(getAxiosErrorMessage(err))
    }
  } finally {
    loading.value = false
  }
}

function isFormInvalid() {
  validationErrors.value.clear()
  if (loginStore.twoFaActive) {
    {
      // otp
      const { valid, errMessage } = validateSixDigitCode(twoFaOtp.value)
      if (!valid) {
        validationErrors.value.set('otp', errMessage as string)
        formRefs.twoFaOtp.value?.focus()
      }
    }
  } else {
    {
      // username
      const { valid, errMessage } = validateRequired(username.value)
      if (!valid) {
        validationErrors.value.set('username', errMessage as string)
        formRefs.username.value?.focus()
      }
    }
    {
      // password
      const { valid, errMessage } = validateRequired(password.value)
      if (!valid) {
        validationErrors.value.set('password', errMessage as string)
        formRefs.password.value?.focus()
      }
    }
  }
  return validationErrors.value.size > 0
}
</script>

<template>
  <div class="flex h-screen min-h-full flex-1 bg-gray-200 dark:bg-gray-950">
    <div
      class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24"
    >
      <div class="mx-auto w-full max-w-md">
        <div class="bg-gray-50 px-6 py-12 shadow sm:rounded-lg sm:px-12 dark:bg-gray-900">
          <NeHeading tag="h4" class="mb-4">
            {{ t('login.welcome_title_controller', { product: getProductName() }) }}
          </NeHeading>
          <div class="mb-6 text-sm text-gray-700 dark:text-gray-100">
            {{ t('login.welcome_description_controller', { product: getProductName() }) }}
            <!-- session expired notification -->
            <NeInlineNotification
              v-if="loginStore.isSessionExpired"
              kind="info"
              :title="t('login.session_has_expired')"
              :description="t('login.please_sign_in_again')"
              :close-aria-label="t('common.close')"
              class="mt-6"
            />
          </div>
          <div v-if="getPrivacyPolicyUrl() != ''" class="mt-1 text-sm leading-6">
            <NeLink :href="getPrivacyPolicyUrl()" target="_blank" class="font-medium">
              {{ t('login.privacy_policy') }}
            </NeLink>
          </div>
          <form v-if="loginStore.twoFaActive" class="space-y-6">
            <NeInlineNotification
              v-if="error"
              :description="t(error.message)"
              :title="t('login.cannot_login')"
              kind="error"
            />
            <NeTextInput
              ref="two-fa-otp-ref"
              v-model.trim="twoFaOtp"
              :disabled="loading"
              :invalid-message="t(validationErrors.getFirstI18nKeyFor('otp'))"
              :label="t('standalone.two_fa.otp')"
              :loading="loading"
            />
            <NeButton
              :disabled="loading"
              :loading="loading"
              class="w-full"
              kind="primary"
              size="lg"
              type="submit"
              @click.prevent="verifyTwoFa"
              >{{ t('standalone.two_fa.verify_code') }}
            </NeButton>
          </form>
          <form v-else class="space-y-6" @submit.prevent>
            <NeInlineNotification
              v-if="error"
              kind="error"
              :title="t('login.cannot_login')"
              :description="t(error.message)"
            />
            <NeTextInput
              ref="username-ref"
              v-model.trim="username"
              :label="t('login.username')"
              :disabled="loading"
              :invalid-message="t(validationErrors.getFirstI18nKeyFor('username'))"
              autocomplete="username"
              :loading="loading"
            />
            <NeTextInput
              ref="password-ref"
              v-model="password"
              :label="t('login.password')"
              is-password
              :disabled="loading"
              :show-password-label="t('ne_text_input.show_password')"
              :hide-password-label="t('ne_text_input.hide_password')"
              :invalid-message="t(validationErrors.getFirstI18nKeyFor('password'))"
              autocomplete="current-password"
              :loading="loading"
            />
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input
                  id="remember-me"
                  v-model="rememberMe"
                  name="remember-me"
                  type="checkbox"
                  class="text-primary-600 focus:ring-primary-600 dark:text-primary-600 dark:focus:ring-primary-400 h-4 w-4 rounded border-gray-300 dark:border-gray-700"
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
                :disabled="loading"
                :loading="loading"
                type="submit"
                class="w-full"
                @click.prevent="login"
                >{{ t('login.sign_in') }}</NeButton
              >
            </div>
          </form>
        </div>
      </div>
    </div>
    <div
      class="to-primary-800 relative hidden w-0 flex-1 items-center justify-center bg-linear-to-t from-gray-950 lg:flex"
    >
      <div class="3xl:w-1/3 5xl:w-1/4 flex w-2/3 flex-col items-center xl:w-2/5">
        <img src="/login_logo.svg" :alt="`${getCompanyName()} logo`" class="" />
        <span class="text-xl text-white">Controller</span>
      </div>
    </div>
  </div>
</template>
