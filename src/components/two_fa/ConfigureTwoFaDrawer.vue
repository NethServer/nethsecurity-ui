<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement,
  savePreference
} from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageBag, validateSixDigitCode } from '@/lib/validation'
import { getTwoFaQrCode, verifyTwoFaOtp } from '@/lib/twoFa'
import QRCodeVue3 from 'qrcode-vue3'
import { ValidationError } from '@/lib/standalone/ubus'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { useNotificationsStore } from '@/stores/notifications'
import { isStandaloneMode } from '@/lib/config'

const props = defineProps({
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const otp = ref('')
const otpRef = ref()
const qrCodeUrl = ref('')
const errorBag = ref(new MessageBag())

const loading = ref({
  getTwoFaQrCode: false,
  verifyOtp: false
})

const error = ref({
  getTwoFaQrCode: '',
  getTwoFaQrCodeDetails: '',
  verifyOtp: '',
  verifyOtpDetails: ''
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      errorBag.value.clear()
      otp.value = ''
      focusElement(otpRef)
      loadQrCode()
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  for (const [key, value] of Object.entries(error.value) as [string, any][]) {
    if (typeof value === 'string') {
      // @ts-ignore
      error.value[key] = ''
    } else if (Array.isArray(value)) {
      // @ts-ignore
      error.value[key] = []
    }
  }
}

async function loadQrCode() {
  loading.value.getTwoFaQrCode = true
  error.value.getTwoFaQrCode = ''
  error.value.getTwoFaQrCodeDetails = ''
  qrCodeUrl.value = ''

  try {
    const res = await getTwoFaQrCode()
    qrCodeUrl.value = res.data.url
  } catch (err: any) {
    console.error(err)
    error.value.getTwoFaQrCode = t(getAxiosErrorMessage(err))
    error.value.getTwoFaQrCodeDetails = err.toString()
  } finally {
    loading.value.getTwoFaQrCode = false
  }
}

function validate() {
  clearErrors()
  errorBag.value.clear()
  let isValidationOk = true

  const otpValidation = validateSixDigitCode(otp.value)
  if (!otpValidation.valid) {
    errorBag.value.set('otp', [String(otpValidation.errMessage)])
    if (isValidationOk) {
      isValidationOk = false
      focusElement(otpRef)
    }
  }
  return isValidationOk
}

async function verifyOtp() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }
  loading.value.verifyOtp = true
  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()

  try {
    await verifyTwoFaOtp(loginStore.username, loginStore.token, otp.value)

    // show reminder to store recovery codes
    savePreference('twoFaRecoveryCodesStored', false, loginStore.username)

    // show toast notification
    setTimeout(() => {
      notificationsStore.createNotification({
        title: t('standalone.two_fa.two_fa_configured'),
        kind: 'success'
      })
    }, 500)

    emit('reloadData')
    closeDrawer()
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
  <NeSideDrawer
    :isShown="isShown"
    :title="t('standalone.two_fa.configure_two_fa')"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form @submit.prevent>
      <div class="space-y-6">
        <ul class="list-inside list-disc">
          <li>
            {{ t('standalone.two_fa.configure_two_fa_step_1') }}
          </li>
          <li>
            {{ t('standalone.two_fa.configure_two_fa_step_2') }}
          </li>
          <li>
            {{ t('standalone.two_fa.configure_two_fa_step_3') }}
          </li>
        </ul>
        <!-- getTwoFaQrCode error notification -->
        <NeInlineNotification
          v-if="error.getTwoFaQrCode"
          kind="error"
          :title="t('error.cannot_retrieve_qr_code')"
          :description="error.getTwoFaQrCode"
        >
          <template #details v-if="error.getTwoFaQrCodeDetails">
            {{ error.getTwoFaQrCodeDetails }}
          </template>
        </NeInlineNotification>
        <!-- skeleton for qr code -->
        <div v-if="loading.getTwoFaQrCode" class="flex animate-pulse">
          <div class="h-72 w-72 bg-gray-300 dark:bg-gray-700"></div>
        </div>
        <!-- qr code -->
        <QRCodeVue3 v-else :value="qrCodeUrl" :dotsOptions="{ type: 'dots', color: '#000' }" />
        <!-- otp -->
        <NeTextInput
          :label="t('standalone.two_fa.otp')"
          :placeholder="t('common.eg_value', { value: '123456' })"
          v-model.trim="otp"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('otp'))"
          :disabled="loading.verifyOtp"
          ref="otpRef"
        />
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
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          @click.prevent="closeDrawer"
          :disabled="loading.verifyOtp"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="verifyOtp"
          :disabled="loading.verifyOtp"
          :loading="loading.verifyOtp"
          type="submit"
        >
          {{ t('standalone.two_fa.configure') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
