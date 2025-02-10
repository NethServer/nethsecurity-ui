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
  savePreference,
  NeModal
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
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import { useSudoStore } from '@/stores/sudo'

const props = defineProps({
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const sudoStore = useSudoStore()
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

const recoveryTokens = ref<string[]>()

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

function closeRecoveryTokensModal() {
  recoveryTokens.value = undefined
  // show toast notification
  notificationsStore.createNotification({
    title: t('standalone.two_fa.two_fa_configured'),
    kind: 'success'
  })
}

const recoveryCodesJustCopied = ref(false)
function copyRecoveryCodes() {
  navigator.clipboard.writeText(recoveryTokens.value?.join('\n') || '')
  recoveryCodesJustCopied.value = true
  setTimeout(() => {
    recoveryCodesJustCopied.value = false
  }, 3000)
}

async function verifyOtp() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }
  loading.value.verifyOtp = true

  try {
    const response = await verifyTwoFaOtp(otp.value)
    recoveryTokens.value = response.data.recovery_codes
    closeDrawer()
    emit('reloadData')
    sudoStore.needs2fa = true
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
  <NeModal
    :title="t('standalone.two_fa.store_recovery_codes_title')"
    :close-aria-label="t('common.close')"
    kind="info"
    :visible="recoveryTokens != undefined"
    :primary-label="t('standalone.two_fa.i_have_stored_recovery_codes')"
    @primary-click="closeRecoveryTokensModal()"
  >
    <div class="space-y-4">
      <p>{{ t('standalone.two_fa.store_recovery_codes_description') }}</p>
      <code>
        <template v-for="(recoveryToken, index) in recoveryTokens" :key="index">
          {{ recoveryToken }}
          <br />
        </template>
      </code>
      <NeButton kind="tertiary" size="lg" @click="copyRecoveryCodes" class="-ml-2.5 mt-2">
        <template #prefix>
          <FontAwesomeIcon
            :icon="recoveryCodesJustCopied ? faCheck : faCopy"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </template>
        {{ recoveryCodesJustCopied ? t('common.copied') : t('standalone.two_fa.copy_all_codes') }}
      </NeButton>
    </div>
  </NeModal>
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
