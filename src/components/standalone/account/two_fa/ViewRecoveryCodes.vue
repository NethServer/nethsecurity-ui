<script lang="ts" setup>
import {
  NeButton,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTextArea
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watchEffect } from 'vue'
import axios from 'axios'
import { getStandaloneApiEndpoint } from '@/lib/config.ts'
import { useLoginStore } from '@/stores/standalone/standaloneLogin.ts'
import { useNotificationsStore } from '@/stores/notifications.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()
const loginStore = useLoginStore()
const notificationsStore = useNotificationsStore()

const model = defineModel<boolean>({ default: false })
const loading = ref(false)
const error = ref<Error>()
const codes = ref<string[]>([])
// codes can be empty, so modal need to be shown despite codes length
const showModal = ref(false)

watchEffect(() => {
  if (model.value) {
    loadCodes()
  }
})

type RecoveryCodeResponse = {
  codes: string[]
}

function loadCodes() {
  loading.value = true
  error.value = undefined
  axios
    .get<RecoveryCodeResponse>(`${getStandaloneApiEndpoint()}/2fa/recovery-codes`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    .then((response) => {
      codes.value = response.data.codes
      showModal.value = true
    })
    .finally(() => {
      loading.value = false
      model.value = false
    })
}

const justCopied = ref(false)

function copyRecoveryCodes() {
  navigator.clipboard.writeText(codes.value.join('\n'))

  justCopied.value = true

  setTimeout(() => {
    justCopied.value = false
  }, 3000)
}
</script>

<template>
  <NeButton :disabled="loading" :loading="loading" kind="tertiary" @click="model = true">
    {{ t('standalone.two_fa.recovery_otp_codes') }}
  </NeButton>
  <NeModal
    :close-aria-label="t('common.close')"
    :primary-label="t('common.close')"
    :title="t('standalone.two_fa.recovery_otp_codes')"
    kind="neutral"
    :visible="showModal"
    @close="showModal = false"
    @primary-click="showModal = false"
  >
    <NeSkeleton v-if="loading" :lines="4" size="lg" />
    <div v-else class="space-y-4">
      <p>{{ t('standalone.two_fa.recovery_otp_codes_tooltip') }}</p>
      <NeInlineNotification
        v-if="codes.length < 3"
        :description="t('standalone.two_fa.few_recovery_codes_description')"
        :title="t('standalone.two_fa.few_recovery_codes_title')"
        kind="warning"
      />
      <NeTextArea :rows="codes.length" :value="codes.join('\n')" disabled />
      <NeButton kind="secondary" size="lg" @click="copyRecoveryCodes">
        <template #prefix>
          <FontAwesomeIcon v-if="justCopied" :icon="faCheck" aria-hidden="false" class="h-4 w-4" />
          <FontAwesomeIcon v-else :icon="faCopy" aria-hidden="false" class="h-4 w-4" />
        </template>
        <p v-if="justCopied">{{ t('common.copied') }}</p>
        <p v-else>{{ t('standalone.two_fa.copy_all_codes') }}</p>
      </NeButton>
      <p>{{ t('standalone.two_fa.store_recovery_codes_description') }}</p>
    </div>
  </NeModal>
</template>
