<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeLink,
  NeInlineNotification,
  NeHeading,
  NeButton,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage,
  deleteFromStorage,
  getStringFromStorage,
  saveToStorage
} from '@nethesis/vue-components'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { onMounted, ref, watch } from 'vue'
import { MessageBag, validateRequired, validateSixDigitCode } from '@/lib/validation'
import { useI18n } from 'vue-i18n'
import { getProductName, getCompanyName, getPrivacyPolicyUrl } from '@/lib/config'
import { jwtDecode } from 'jwt-decode'
import { verifyTwoFaOtp } from '@/lib/twoFa'
import { ValidationError } from '@/lib/standalone/ubus'

const username = ref('')
const usernameRef = ref()
const password = ref('')
const passwordRef = ref()
const rememberMe = ref(false)
const jwtToken = ref('')
const twoFaOtp = ref('')
const twoFaOtpRef = ref()
const step = ref('login')
const errorBag = ref(new MessageBag())

const loading = ref({
  login: false,
  verifyOtp: false
})

const error = ref({
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
    const { valid, errMessage } = validateRequired(username.value)
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
    const { valid, errMessage } = validateRequired(password.value)
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
        <div class="bg-gray-50 px-6 py-12 shadow sm:rounded-lg sm:px-12 dark:bg-gray-900">
          <NeHeading tag="h4" class="mb-4">
            <template v-if="step === 'login'">
              {{ t('login.welcome_title_standalone', { product: getProductName() }) }}
            </template>
            <template v-if="step === '2fa'">
              {{ t('standalone.two_fa.title') }}
            </template>
          </NeHeading>
          <div class="mb-6 text-sm text-gray-700 dark:text-gray-100">
            <template v-if="step === 'login'">
              {{ t('login.welcome_description_standalone', { product: getProductName() }) }}
              <!-- session expired notification -->
              <NeInlineNotification
                v-if="loginStore.isSessionExpired"
                kind="info"
                :title="t('login.session_has_expired')"
                :description="t('login.please_sign_in_again')"
                :close-aria-label="t('common.close')"
                class="mt-6"
              />
            </template>
            <template v-if="step === '2fa'">
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
            <template v-if="step === 'login'">
              <NeInlineNotification
                v-if="error.login"
                kind="error"
                :title="t('login.cannot_login')"
                :description="t(error.login)"
              />
              <NeTextInput
                ref="usernameRef"
                v-model.trim="username"
                :label="t('login.username')"
                :invalid-message="t(error.username)"
                autocomplete="username"
              />
              <NeTextInput
                ref="passwordRef"
                v-model="password"
                :label="t('login.password')"
                is-password
                :show-password-label="t('ne_text_input.show_password')"
                :hide-password-label="t('ne_text_input.hide_password')"
                :invalid-message="t(error.password)"
                autocomplete="current-password"
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
                  type="submit"
                  :disabled="loading.login"
                  :loading="loading.login"
                  class="w-full"
                  @click.prevent="login"
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
                <template v-if="error.verifyOtpDetails" #details>
                  {{ error.verifyOtpDetails }}
                </template>
              </NeInlineNotification>
              <!-- 2fa otp -->
              <NeTextInput
                ref="twoFaOtpRef"
                v-model.trim="twoFaOtp"
                :label="t('standalone.two_fa.otp')"
                :invalid-message="t(errorBag.getFirstI18nKeyFor('otp'))"
              />
              <NeButton
                kind="primary"
                size="lg"
                type="submit"
                :disabled="loading.verifyOtp"
                :loading="loading.verifyOtp"
                class="w-full"
                @click.prevent="verifyOtp"
                >{{ t('standalone.two_fa.verify_code') }}</NeButton
              >
            </template>
          </form>
        </div>
      </div>
    </div>
    <div
      class="to-primary-800 relative hidden w-0 flex-1 items-center justify-center bg-linear-to-t from-gray-950 lg:flex"
    >
      <img
        src="/login_logo.svg"
        :alt="`${getCompanyName()} logo`"
        class="3xl:w-1/3 5xl:w-1/4 w-2/3 xl:w-2/5"
      />
    </div>
  </div>
</template>
