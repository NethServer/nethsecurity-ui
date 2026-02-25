<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, NeTextInput } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { useNotificationsStore } from '@/stores/notifications'

const props = defineProps<{
  visible: boolean
  instanceName?: string
  serverName?: string
}>()

const emit = defineEmits(['close', 'all-certificates-regenerated'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const formRegenerateAllCertificates = ref({
  server_name: ''
})

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isRegenerating = ref(false)

async function regenerateAllCertificates() {
  if (props.instanceName) {
    try {
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
      isRegenerating.value = true
      await ubusCall('ns.ovpnrw', 'regenerate-all-certificates', {
        instance: props.instanceName
      })

      // show toast notification
      setTimeout(() => {
        notificationsStore.createNotification({
          title: t('standalone.openvpn_rw.all_certificates_regenerated'),
          description: t('standalone.openvpn_rw.all_certificates_regenerated_message'),
          kind: 'success'
        })
      }, 500)

      emit('all-certificates-regenerated')
      emit('close')
    } catch (err: any) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    } finally {
      isRegenerating.value = false
      close()
    }
  }
}

function close() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  formRegenerateAllCertificates.value.server_name = ''
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.openvpn_rw.regenerate_all_certificates')"
    :primary-label="t('standalone.openvpn_rw.regenerate')"
    :cancel-label="t('common.cancel')"
    :primary-button-disabled="
      isRegenerating || serverName !== formRegenerateAllCertificates.server_name
    "
    :primary-button-loading="isRegenerating"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @primary-click="regenerateAllCertificates()"
    @close="close()"
  >
    {{ t('standalone.openvpn_rw.regenerate_all_certificates_message') }}
    <NeTextInput
      v-model="formRegenerateAllCertificates.server_name"
      class="mt-4"
      :disabled="isRegenerating"
      :label="t('standalone.openvpn_rw.type_server_name', { server: serverName })"
    />
  </NeModal>
</template>
