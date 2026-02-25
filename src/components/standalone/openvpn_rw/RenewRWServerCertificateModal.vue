<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { useNotificationsStore } from '@/stores/notifications'
import { message } from 'valibot'

const props = defineProps<{
  visible: boolean
  instanceName?: string
}>()

const emit = defineEmits(['close', 'server-certificate-renewed'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isRenewing = ref(false)

async function renewServerCertificate() {
  
  if (props.instanceName) {
    try {
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
      isRenewing.value = true
      await ubusCall('ns.ovpnrw', 'renew-server-certificate', {
        instance: props.instanceName
      })

      // show toast notification
      setTimeout(() => {
        notificationsStore.createNotification({
          title: t('standalone.openvpn_rw.server_certificate_renewed'),
          description: t('standalone.openvpn_rw.server_certificate_renewed_message'),
          kind: 'success'
        })
      }, 500)

      emit('server-certificate-renewed')
      emit('close')
    } catch (err: any) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    } finally {
      isRenewing.value = false
      close()
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
    :title="t('standalone.openvpn_rw.renew_server_certificate')"
    :primary-label="t('standalone.openvpn_rw.renew')"
    :cancel-label="t('common.cancel')"
    :primary-button-disabled="isRenewing"
    :primary-button-loading="isRenewing"
    primary-button-kind="primary"
    :close-aria-label="t('common.close')"
    @primary-click="renewServerCertificate()"
    @close="close()"
  >
    {{ t('standalone.openvpn_rw.renew_server_certificate_message') }}
  </NeModal>
</template>
