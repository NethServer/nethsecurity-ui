<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSideDrawer,
  NeTextInput
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref, useTemplateRef } from 'vue'
import { getStandaloneApiEndpoint } from '@/lib/config.ts'
import axios, { isAxiosError } from 'axios'
import { useLoginStore } from '@/stores/standalone/standaloneLogin.ts'
import { UnauthorizedAction } from '@/stores/standalone/sudo.ts'
import {
  getValidationErrorsFromAxiosError,
  MessageBag,
  validateSixDigitCode
} from '@/lib/validation.ts'
import { useQRCode } from '@vueuse/integrations/useQRCode'

type QrCodeResponse = {
  data: {
    key: string
    url: string
  }
}

const emits = defineEmits(['success'])

const loginStore = useLoginStore()
const { t } = useI18n()

const loading = ref(false)
const configuringTwoFa = ref(false)
const error = ref<Error>()
const data = ref<QrCodeResponse>()

const otp = ref('')
const otpRef = useTemplateRef<HTMLInputElement>('otp-ref')
const validationBag = ref(new MessageBag())
const verifyingOtp = ref(false)
const verifyingOtpError = ref<Error>()

const qrUrl = computed(() => data.value?.data.url ?? '')
const qrcode = useQRCode(qrUrl, {
  scale: 6
})

function convertErrorToMessage(error?: Error): string {
  if (error instanceof UnauthorizedAction) {
    return t(error.message)
  } else {
    return t(getAxiosErrorMessage(error))
  }
}

const errorMessage = computed<string>(() => convertErrorToMessage(error.value))

const verifyingOtpErrorMessage = computed<string>(() =>
  convertErrorToMessage(verifyingOtpError.value)
)

function getQrCode() {
  loading.value = true
  error.value = undefined
  axios
    .get<QrCodeResponse>(`${getStandaloneApiEndpoint()}/2fa/qr-code`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    .then((res) => {
      data.value = res.data
      configuringTwoFa.value = true
    })
    .catch((reason) => {
      if (!(reason instanceof UnauthorizedAction)) {
        error.value = reason
      }
    })
    .finally(() => {
      loading.value = false
    })
}

function configureTwoFa() {
  getQrCode()
}

function isFormValid() {
  validationBag.value.clear()
  const otpValidation = validateSixDigitCode(otp.value)
  if (!otpValidation.valid) {
    validationBag.value.set('otp', [String(otpValidation.errMessage)])
  }
  const validForm = validationBag.value.size == 0
  if (!validForm) {
    otpRef.value?.focus()
  }
  return validForm
}

type ConfiguredTwoFaResponse = {
  data: string[]
}

function verifyOtp() {
  if (isFormValid()) {
    verifyingOtp.value = true
    axios
      .post<ConfiguredTwoFaResponse>(`${getStandaloneApiEndpoint()}/2fa/otp-verify`, {
        otp: otp.value,
        username: loginStore.username,
        token: loginStore.token
      })
      .then(() => {
        configuringTwoFa.value = false
        setTimeout(() => {
          emits('success')
        }, 300)
      })
      .catch((reason) => {
        if (isAxiosError(reason) && reason.response?.data?.message == 'validation_failed') {
          validationBag.value = getValidationErrorsFromAxiosError(reason)
        } else {
          verifyingOtpError.value = reason
        }
      })
      .finally(() => (verifyingOtp.value = false))
  }
}

function closeDrawer() {
  if (!loading.value) {
    configuringTwoFa.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <NeInlineNotification
      v-if="error != undefined"
      :description="errorMessage"
      :title="t('error.generic_error')"
      kind="error"
    />
    <NeButton :disabled="loading" :loading="loading" kind="secondary" @click="configureTwoFa()">
      {{ t('standalone.two_fa.configure_two_fa') }}
    </NeButton>
    <NeSideDrawer
      :close-aria-label="t('common.shell.close_side_drawer')"
      :is-shown="configuringTwoFa"
      :title="t('standalone.two_fa.configure_two_fa')"
      @close="closeDrawer"
    >
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
        <img :src="qrcode" alt="QR Code" />
        <form class="space-y-6" @submit.prevent="verifyOtp">
          <NeInlineNotification
            v-if="verifyingOtpError"
            :description="verifyingOtpErrorMessage"
            :title="t('error.cannot_verify_otp')"
            kind="error"
          />
          <NeTextInput
            ref="otp-ref"
            v-model.trim="otp"
            :disabled="verifyingOtp"
            :invalid-message="t(validationBag.getFirstI18nKeyFor('otp'))"
            :label="t('standalone.two_fa.otp')"
            :placeholder="t('common.eg_value', { value: '123456' })"
          />
          <hr class="my-8 border-gray-200 dark:border-gray-700" />
          <div class="flex justify-end">
            <NeButton
              :disabled="verifyingOtp"
              class="mr-3"
              kind="tertiary"
              size="lg"
              @click.prevent="closeDrawer"
            >
              {{ t('common.cancel') }}
            </NeButton>
            <NeButton
              :disabled="verifyingOtp"
              :loading="verifyingOtp"
              kind="primary"
              size="lg"
              type="submit"
            >
              {{ t('standalone.two_fa.configure') }}
            </NeButton>
          </div>
        </form>
      </div>
    </NeSideDrawer>
  </div>
</template>
