<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeLink } from '@nethesis/vue-components'
import { NeTitle, NeButton, NeTextInput, NeInlineNotification } from '@nethserver/vue-tailwind-lib'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { onMounted, ref, watch } from 'vue'
import { focusElement, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { MessageBag, validateRequired, validateSixDigitCode } from '@/lib/validation'
import { useI18n } from 'vue-i18n'
import { getProductName, getCompanyName } from '@/lib/config'
import {
  deleteFromStorage,
  getStringFromStorage,
  saveToStorage
} from '@nethserver/vue-tailwind-lib'
import { jwtDecode } from 'jwt-decode'
import { verifyTwoFaOtp } from '@/lib/standalone/twoFa'
import { ValidationError } from '@/lib/standalone/ubus'

let username = ref('')
let usernameRef = ref()
let password = ref('')
let passwordRef = ref()
let rememberMe = ref(false)
const jwtToken = ref('')
const twoFaOtp = ref('')
const twoFaOtpRef = ref()
let step = ref('login')
const errorBag = ref(new MessageBag())

const loading = ref({
  login: false,
  verifyOtp: false
})

let error = ref({
  username: '',
  password: '',
  otp: '',
  login: '',
  verifyOtp: '',
  verifyOtpDetails: ''
})

const { t } = useI18n()
const loginStore = useLoginStore()

watch(step, () => {
  if (step.value === '2fa') {
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
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }
  loading.value.login = true

  try {
    jwtToken.value = await loginStore.login(username.value, password.value)

    // set or remove username to/from local storage
    if (rememberMe.value) {
      saveToStorage('standaloneUsername', username.value)
    } else {
      deleteFromStorage('standaloneUsername')
    }

    // check if 2fa is enabled
    const tokenDecoded: any = jwtDecode(jwtToken.value)

    if (tokenDecoded['2fa']) {
      step.value = '2fa'
    } else {
      loginStore.loginSuccessful(username.value, jwtToken.value)
    }
  } catch (err: any) {
    console.error('login error', err)

    if (err?.response?.status == 401) {
      error.value.login = 'login.incorrect_username_or_password'
      focusElement(passwordRef)
    } else {
      error.value.login = getAxiosErrorMessage(err)
    }
  } finally {
    loading.value.login = false
  }
}

function validate() {
  error.value.username = ''
  error.value.password = ''
  error.value.login = ''
  errorBag.value.clear()
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

function validateOtp() {
  error.value.otp = ''
  error.value.verifyOtp = ''
  error.value.verifyOtpDetails = ''
  errorBag.value.clear()
  let isValidationOk = true

  const otpValidation = validateSixDigitCode(twoFaOtp.value)
  if (!otpValidation.valid) {
    errorBag.value.set('otp', [String(otpValidation.errMessage)])
    if (isValidationOk) {
      isValidationOk = false
      focusElement(twoFaOtpRef)
    }
  }
  return isValidationOk
}

async function verifyOtp() {
  const isValidationOk = validateOtp()
  if (!isValidationOk) {
    return
  }
  loading.value.verifyOtp = true

  try {
    await verifyTwoFaOtp(username.value, jwtToken.value, twoFaOtp.value)
    loginStore.loginSuccessful(username.value, jwtToken.value)
  } catch (err: any) {
    console.error(err)
    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.verifyOtp = t(getAxiosErrorMessage(err))
      error.value.verifyOtpDetails = err.toString()
    }
  } finally {
    loading.value.verifyOtp = false
  }
}
</script>

<template>
  <div class="flex h-screen min-h-full flex-1 bg-gray-200 dark:bg-gray-950">
    <div
      class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24"
    >
      <div class="mx-auto w-full max-w-md">
        <div class="bg-gray-50 px-6 py-12 shadow dark:bg-gray-900 sm:rounded-lg sm:px-12">
          <NeTitle level="h2">
            <template v-if="step === 'login'">
              {{ t('login.welcome_title_standalone', { product: getProductName() }) }}
            </template>
            <template v-if="step === '2fa'">
              {{ t('standalone.two_fa.title') }}
            </template>
          </NeTitle>
          <div class="mb-6 text-sm text-gray-700 dark:text-gray-100">
            <template v-if="step === 'login'">
              {{ t('login.welcome_description_standalone', { product: getProductName() }) }}
            </template>
            <template v-if="step === '2fa'">
              <p>
                {{ t('standalone.two_fa.enter_otp_login_1') }}
              </p>
              <p class="mt-2">
                {{ t('standalone.two_fa.enter_otp_login_2') }}
              </p>
            </template>
          </div>
          <form class="space-y-6">
            <template v-if="step === 'login'">
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
                  :disabled="loading.login"
                  :loading="loading.login"
                  class="w-full"
                  >{{ t('login.sign_in') }}</NeButton
                >
              </div>
            </template>
            <template v-if="step === '2fa'">
              <!-- verifyOtp error notification -->
              <NeInlineNotification
                v-if="error.verifyOtp"
                kind="error"
                :title="t('error.cannot_verify_otp')"
                :description="error.verifyOtp"
              >
                <template #details v-if="error.verifyOtpDetails">
                  {{ error.verifyOtpDetails }}
                </template>
              </NeInlineNotification>
              <!-- 2fa otp -->
              <NeTextInput
                :label="t('standalone.two_fa.otp')"
                v-model.trim="twoFaOtp"
                :invalidMessage="t(errorBag.getFirstI18nKeyFor('otp'))"
                ref="twoFaOtpRef"
              />
              <NeButton
                kind="primary"
                size="lg"
                @click.prevent="verifyOtp"
                type="submit"
                :disabled="loading.verifyOtp"
                :loading="loading.verifyOtp"
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
