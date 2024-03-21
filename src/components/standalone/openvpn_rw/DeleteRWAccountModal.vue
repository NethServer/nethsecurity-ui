<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethserver/vue-tailwind-lib'
import type { RWAccount } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'

const props = defineProps<{
  visible: boolean
  instanceName: string
  account?: RWAccount
}>()

const emit = defineEmits(['close', 'account-deleted'])

const { t } = useI18n()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteAccount() {
  if (props.account) {
    try {
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
      isDeleting.value = true
      await ubusCall('ns.ovpnrw', 'delete-user', {
        instance: props.instanceName,
        username: props.account.name
      })
      emit('account-deleted')
      emit('close')
    } catch (err: any) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    } finally {
      isDeleting.value = false
    }
  }
}

function close() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.openvpn_rw.delete_account')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    primary-button-kind="danger"
    @primaryClick="deleteAccount()"
    @close="close()"
  >
    {{ t('standalone.openvpn_rw.delete_account_message') }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_account')"
      :description="error.notificationDescription"
      class="my-2"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
