<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'
import { ubusCall } from '@/lib/standalone/ubus'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  itemToDelete: ServerTunnel | ClientTunnel | null
}>()

const emit = defineEmits(['close', 'tunnel-deleted'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteTunnel() {
  if (props.itemToDelete) {
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    isDeleting.value = true
    try {
      await ubusCall('ns.ovpntunnel', 'delete-tunnel', { id: props.itemToDelete.id })
      emit('tunnel-deleted')
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
    :title="t('standalone.openvpn_tunnel.delete_tunnel')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @primaryClick="deleteTunnel()"
    @close="close()"
  >
    {{
      t('standalone.openvpn_tunnel.delete_tunnel_message', {
        name: itemToDelete?.ns_name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_tunnel')"
      :description="error.notificationDescription"
      class="my-2"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
