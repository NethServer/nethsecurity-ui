<!--
  Copyright (C) 2026 Nethesis S.r.l.
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
  itemToRegenerate: ServerTunnel | ClientTunnel | null
}>()

const emit = defineEmits(['close', 'certs-regenerated'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isRegenerating = ref(false)

async function regenerateCerts() {
  if (props.itemToRegenerate) {
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    isRegenerating.value = true
    try {
      await ubusCall('ns.ovpntunnel', 'regenerate-server-certs', {
        id: props.itemToRegenerate.id
      })
      emit('certs-regenerated')
      emit('close')
    } catch (err: any) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    } finally {
      isRegenerating.value = false
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
    :title="t('standalone.openvpn_tunnel.regenerate_cert')"
    :primary-label="t('standalone.openvpn_tunnel.regenerate_cert_button')"
    :cancel-label="t('common.cancel')"
    :primary-button-disabled="isRegenerating"
    :primary-button-loading="isRegenerating"
    :close-aria-label="t('common.close')"
    @primary-click="regenerateCerts()"
    @close="close()"
  >
    {{ t('standalone.openvpn_tunnel.regenerate_cert_message') }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_regenerate_cert')"
      :description="error.notificationDescription"
      class="my-2"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
