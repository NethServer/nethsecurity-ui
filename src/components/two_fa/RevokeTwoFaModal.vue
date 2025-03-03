<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { revokeTwoFa, verifyTwoFaOtp } from '@/lib/twoFa'
import { ValidationError } from '@/lib/standalone/ubus'
import { MessageBag, validateSixDigitCode } from '@/lib/validation'
import { useNotificationsStore } from '@/stores/notifications'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import {
  focusElement,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeModal,
  NeTextInput
} from '@nethesis/vue-components'
import { isStandaloneMode } from '@/lib/config'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: {
    type: Boolean
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
const notificationsStore = useNotificationsStore()
const otp = ref('')
const otpRef = ref()
const errorBag = ref(new MessageBag())

const loading = ref({
  revokeTwoFa: false,
  verifyOtp: false
})

const error = ref({
  revokeTwoFa: '',
  revokeTwoFaDetails: '',
  verifyOtp: '',
  verifyOtpDetails: ''
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      clearErrors()
      errorBag.value.clear()
      otp.value = ''
      focusElement(otpRef)
    }
  }
)

function clearErrors() {
  error.value.revokeTwoFa = ''
  error.value.revokeTwoFaDetails = ''
  error.value.verifyOtp = ''
  error.value.verifyOtpDetails = ''
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

  try {
    await verifyTwoFaOtp(loginStore.username, loginStore.token, otp.value)

    // otp is correct, revoke 2fa
    revoke()
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

async function revoke() {
  clearErrors()
  loading.value.revokeTwoFa = true

  try {
    await revokeTwoFa()

    // show toast notification
    setTimeout(() => {
      notificationsStore.createNotification({
        title: t('standalone.two_fa.two_fa_revoked'),
        kind: 'success'
      })
    }, 500)

    emit('close')
    emit('reloadData')
  } catch (err: any) {
    console.error(err)
    error.value.revokeTwoFa = t(getAxiosErrorMessage(err))
    error.value.revokeTwoFaDetails = err.toString()
  } finally {
    loading.value.revokeTwoFa = false
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.two_fa.revoke_two_fa')"
    kind="warning"
    :primary-label="t('standalone.two_fa.revoke_two_fa')"
    :primary-button-disabled="loading.verifyOtp || loading.revokeTwoFa"
    :cancel-label="t('common.cancel')"
    primary-button-kind="danger"
    :primary-button-loading="loading.verifyOtp || loading.revokeTwoFa"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="verifyOtp"
  >
    {{ t('standalone.two_fa.revoke_two_fa_message') }}
    <!-- otp -->
    <NeTextInput
      ref="otpRef"
      v-model.trim="otp"
      :label="t('standalone.two_fa.otp')"
      :placeholder="t('common.eg_value', { value: '123456' })"
      :invalid-message="t(errorBag.getFirstI18nKeyFor('otp'))"
      :disabled="loading.verifyOtp || loading.revokeTwoFa"
      class="mt-5"
    />
    <!-- verifyOtp error notification -->
    <NeInlineNotification
      v-if="error.verifyOtp"
      kind="error"
      :title="t('error.cannot_verify_otp')"
      :description="error.verifyOtp"
      class="mt-4"
    >
      <template v-if="error.verifyOtpDetails" #details>
        {{ error.verifyOtpDetails }}
      </template>
    </NeInlineNotification>
    <!-- revokeTwoFa error notification -->
    <NeInlineNotification
      v-if="error.revokeTwoFa"
      kind="error"
      :title="t('error.cannot_revoke_two_fa')"
      :description="error.revokeTwoFa"
      class="mt-4"
    >
      <template v-if="error.revokeTwoFaDetails" #details>
        {{ error.revokeTwoFaDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
