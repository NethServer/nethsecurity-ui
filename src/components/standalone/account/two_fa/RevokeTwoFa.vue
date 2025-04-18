<script lang="ts" setup>
import {
  NeButton,
  NeModal,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'
import { getStandaloneApiEndpoint } from '@/lib/config.ts'
import axios from 'axios'
import { useLoginStore } from '@/stores/standalone/standaloneLogin.ts'
import { UnauthorizedAction } from '@/stores/standalone/sudo.ts'
import { useNotificationsStore } from '@/stores/notifications.ts'

const { t } = useI18n()
const loginStore = useLoginStore()
const notificationsStore = useNotificationsStore()

const emit = defineEmits(['removed'])

const removingTwoFa = ref(false)
const loading = ref(false)
const error = ref<Error>()

const errorMessage = computed<string>(() => {
  if (error.value instanceof UnauthorizedAction) {
    return t(error.value.message)
  } else {
    return t(getAxiosErrorMessage(error.value))
  }
})

function revoke() {
  loading.value = true
  error.value = undefined
  axios
    .delete(`${getStandaloneApiEndpoint()}/2fa`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    .then(() => {
      removingTwoFa.value = false
      setTimeout(() => {
        notificationsStore.createNotification({
          title: t('standalone.two_fa.two_fa_revoked'),
          kind: 'success'
        })
        emit('removed')
      }, 300)
    })
    .catch((reason) => {
      error.value = reason
    })
    .finally(() => (loading.value = false))
}

function handleClose() {
  if (!loading.value) {
    removingTwoFa.value = false
  }
}
</script>

<template>
  <NeButton kind="secondary" size="lg" @click="removingTwoFa = true">
    {{ t('standalone.two_fa.revoke_two_fa') }}
  </NeButton>
  <NeModal
    :visible="removingTwoFa"
    :title="t('standalone.two_fa.revoke_two_fa')"
    kind="warning"
    :primary-label="t('standalone.two_fa.revoke_two_fa')"
    :primary-button-disabled="loading"
    :cancel-label="t('common.cancel')"
    primary-button-kind="danger"
    :primary-button-loading="loading"
    :close-aria-label="t('common.close')"
    @close="handleClose()"
    @primary-click="revoke()"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="error"
        kind="error"
        :title="t('error.cannot_revoke_two_fa')"
        :description="errorMessage"
      />
      <p>{{ t('standalone.two_fa.revoke_two_fa_message') }}</p>
    </div>
  </NeModal>
</template>
