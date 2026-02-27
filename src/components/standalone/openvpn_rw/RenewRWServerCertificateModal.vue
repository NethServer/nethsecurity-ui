<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal, NeInlineNotification } from '@nethesis/vue-components'

const props = defineProps<{
  visible: boolean
  instanceName?: string
}>()

const emit = defineEmits(['close', 'server-certificate-renewed'])

const { t } = useI18n()

const error = ref<Error>()
const isRenewing = ref(false)

async function renewServerCertificate() {
  if (props.instanceName) {
    try {
      error.value = undefined
      isRenewing.value = true
      await ubusCall('ns.ovpnrw', 'renew-server-certificate', {
        instance: props.instanceName
      })
      emit('server-certificate-renewed')
      emit('close')
    } catch (err: any) {
      error.value = err
    } finally {
      isRenewing.value = false
    }
  }
}

function close() {
  if (!isRenewing.value) {
    error.value = undefined
    emit('close')
  }
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
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('error.cannot_renew_server_cert')"
      :description="t(getAxiosErrorMessage(error))"
      class="mb-2"
    />
    {{ t('standalone.openvpn_rw.renew_server_certificate_message') }}
  </NeModal>
</template>
