<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  deleteFromStorage,
  focusElement,
  getAxiosErrorMessage,
  getStringFromStorage,
  NeButton,
  NeHeading,
  NeInlineNotification,
  NeLink,
  NeTextInput,
  saveToStorage
} from '@nethesis/vue-components'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { MessageBag, validateRequired } from '@/lib/validation'
import { useI18n } from 'vue-i18n'
import { getCompanyName, getPrivacyPolicyUrl, getProductName } from '@/lib/config'
import axios from 'axios'

const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const twoFaOtp = ref('')

const step = ref<'login' | '2fa'>('login')
const validationBag = ref(new MessageBag())

const usernameRef = useTemplateRef('username-ref')
const passwordRef = useTemplateRef('password-ref')
const twoFaOtpRef = useTemplateRef('two-fa-otp-ref')

type ValidationResponse = {
  data: {
    validation: {
      errors: Array<{
        message: string
        parameter: string
        value: string
      }>
    }
  }
}

const loading = ref(false)
const error = ref<Error>()

const { t } = useI18n()
const loginStore = useLoginStore()

watch(step, () => {
  if (step.value == '2fa') {
    focusElement(twoFaOtpRef)
  }
})

onMounted(() => {
  // read username from storage, if present
  const usernameFromStorage = getStringFromStorage('standaloneUsername')

  if (usernameFromStorage) {
    rememberMe.value = true
    username.value = usernameFromStorage
    focusElement(passwordRef)
  } else {
    focusElement(usernameRef)
  }
})

async function login() {
  error.value = undefined
  if (invalidForm()) {
    return
  }

  loading.value = true
  try {
    const token = await loginStore.login(username.value, password.value, twoFaOtp.value)

    // set or remove username to/from local storage
    if (rememberMe.value) {
      saveToStorage('standaloneUsername', username.value)
    } else {
      deleteFromStorage('standaloneUsername')
    }
    loginStore.loginSuccessful(username.value, token)
  } catch (err: any) {
    if (axios.isAxiosError<ValidationResponse>(err) && err.response != undefined) {
      // error has returned successfully from server, parse validation errors
      err.response.data.data.validation.errors.forEach((item) => {
        validationBag.value.set(item.parameter, item.message)
      })
      if (validationBag.value.has('password')) {
        focusElement(passwordRef)
      } else if (validationBag.value.has('two_fa')) {
        if (step.value == 'login') {
          step.value = '2fa'
          validationBag.value.delete('two_fa')
        }
        focusElement(twoFaOtpRef)
      }
    } else {
      error.value = err
    }
  } finally {
    loading.value = false
  }
}

function invalidForm(): boolean {
  validationBag.value.clear()
  if (step.value == '2fa') {
    {
      // check required
      let { valid, errMessage } = validateRequired(twoFaOtp.value)
      if (!valid) {
        validationBag.value.set('two_fa', errMessage as string)
      }
    }
  } else {
    {
      // check required
      let { valid, errMessage } = validateRequired(username.value)
      if (!valid) {
        validationBag.value.set('username', errMessage as string)
      }
    }
    {
      // check required
      let { valid, errMessage } = validateRequired(password.value)
      if (!valid) {
        validationBag.value.set('password', errMessage as string)
      }
    }
  }
  return validationBag.value.size > 0
}
</script>

<template>
  <div class="flex h-screen min-h-full flex-1 bg-gray-200 dark:bg-gray-950">
    <div
      class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24"
    >
      <div class="mx-auto w-full max-w-md">
        <div class="bg-gray-50 px-6 py-12 shadow dark:bg-gray-900 sm:rounded-lg sm:px-12">
          <NeHeading tag="h4" class="mb-4">
            <template v-if="step == 'login'">
              {{ t('login.welcome_title_standalone', { product: getProductName() }) }}
            </template>
            <template v-if="step == '2fa'">
              {{ t('standalone.two_fa.title') }}
            </template>
          </NeHeading>
          <div class="mb-6 text-sm text-gray-700 dark:text-gray-100">
            <template v-if="step == 'login'">
              {{ t('login.welcome_description_standalone', { product: getProductName() }) }}
              <!-- session expired notification -->
              <NeInlineNotification
                v-if="loginStore.isSessionExpired"
                kind="info"
                :title="t('login.session_has_expired')"
                :description="t('login.please_sign_in_again')"
                :closeAriaLabel="t('common.close')"
                class="mt-6"
              />
            </template>
            <template v-if="step == '2fa'">
              <p>
                {{ t('standalone.two_fa.enter_otp_login_1') }}
              </p>
              <p class="mt-2">
                {{ t('standalone.two_fa.enter_otp_login_2') }}
              </p>
            </template>
            <div v-if="getPrivacyPolicyUrl() != ''" class="mt-1 text-sm leading-6">
              <NeLink :href="getPrivacyPolicyUrl()" target="_blank" class="font-medium">
                {{ t('login.privacy_policy') }}
              </NeLink>
            </div>
          </div>
          <form class="space-y-6">
            <NeInlineNotification
              v-if="error != undefined"
              :description="t(getAxiosErrorMessage(error))"
              :title="t('login.cannot_login')"
              kind="error"
            />
            <template v-if="step == 'login'">
              <NeTextInput
                :label="t('login.username')"
                v-model.trim="username"
                :invalidMessage="t(validationBag.getFirstI18nKeyFor('username'))"
                autocomplete="username"
                ref="username-ref"
              />
              <NeTextInput
                :label="t('login.password')"
                v-model="password"
                isPassword
                :showPasswordLabel="t('ne_text_input.show_password')"
                :hidePasswordLabel="t('ne_text_input.hide_password')"
                :invalidMessage="t(validationBag.getFirstI18nKeyFor('password'))"
                autocomplete="current-password"
                ref="password-ref"
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
                  <NeLink
                    href="https://docs.nethsecurity.org/en/latest/remote_access.html#default-credentials"
                    target="_blank"
                    class="font-medium"
                  >
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
                  :disabled="loading"
                  :loading="loading"
                  class="w-full"
                  >{{ t('login.sign_in') }}</NeButton
                >
              </div>
            </template>
            <template v-if="step == '2fa'">
              <!-- 2fa otp -->
              <NeTextInput
                :label="t('standalone.two_fa.otp')"
                v-model.trim="twoFaOtp"
                :invalidMessage="t(validationBag.getFirstI18nKeyFor('two_fa'))"
                ref="two-fa-otp-ref"
              />
              <NeButton
                kind="primary"
                size="lg"
                @click.prevent="login"
                type="submit"
                :disabled="loading"
                :loading="loading"
                class="w-full"
                >{{ t('standalone.two_fa.verify_code') }}</NeButton
              >
            </template>
          </form>
        </div>
      </div>
    </div>
    <div
      class="relative hidden w-0 flex-1 items-center justify-center bg-gradient-to-t from-gray-950 to-primary-800 lg:flex"
    >
      <img
        src="/login_logo.svg"
        :alt="`${getCompanyName()} logo`"
        class="w-2/3 xl:w-2/5 3xl:w-1/3 5xl:w-1/4"
      />
    </div>
  </div>
</template>
