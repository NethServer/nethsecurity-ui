<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { revokeTwoFa } from '@/lib/twoFa'
import { useNotificationsStore } from '@/stores/notifications'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { UnauthorizedAction, useSudoStore } from '@/stores/sudo'
import axios from 'axios'
import { getControllerApiEndpoint, getStandaloneApiEndpoint, isStandaloneMode } from '@/lib/config'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'

const { visible } = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close', 'reloadData'])
const sudoStore = useSudoStore()

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const loading = ref(false)
const error = ref<string>()

watch(
  () => visible,
  (value) => {
    if (value) {
      error.value = undefined
    }
  }
)

function handleClose() {
  if (!loading.value) {
    emit('close')
  }
}

function revoke() {
  loading.value = true
  error.value = undefined
  const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
  const endpoint = isStandaloneMode() ? getStandaloneApiEndpoint() : getControllerApiEndpoint()
  axios
    .delete(`${endpoint}/2fa`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    .then(() => {
      setTimeout(() => {
        notificationsStore.createNotification({
          title: t('standalone.two_fa.two_fa_revoked'),
          kind: 'success'
        })
      }, 500)

      emit('close')
      emit('reloadData')
      sudoStore.needs2fa = false
    })
    .catch((reason) => {
      if (reason instanceof UnauthorizedAction) {
        error.value = t(reason.message)
      } else {
        error.value = t(getAxiosErrorMessage(reason))
      }
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.two_fa.revoke_two_fa')"
    kind="warning"
    :primaryLabel="t('standalone.two_fa.revoke_two_fa')"
    :primary-button-disabled="loading"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonLoading="loading"
    :closeAriaLabel="t('common.close')"
    @close="handleClose()"
    @primaryClick="revoke()"
  >
    <div class="space-y-4">
      <NeInlineNotification
        kind="error"
        v-if="error != undefined"
        :description="error"
        :title="t('error.generic_error')"
      />
      <p>{{ t('standalone.two_fa.revoke_two_fa_message') }}</p>
    </div>
  </NeModal>
</template>
