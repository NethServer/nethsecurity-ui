<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, NeTextInput } from '@nethesis/vue-components'
import { NeModal, NeInlineNotification } from '@nethesis/vue-components'

const props = defineProps<{
  visible: boolean
  instanceName?: string
  serverName?: string
}>()

const emit = defineEmits(['close', 'all-certificates-regenerated'])

const { t } = useI18n()

const error = ref<Error>()
const serverNameModal = ref('')
const isRegenerating = ref(false)

async function regenerateAllCertificates() {
  if (props.instanceName) {
    try {
      error.value = undefined
      isRegenerating.value = true
      await ubusCall('ns.ovpnrw', 'regenerate-all-certificates', {
        instance: props.instanceName
      })
      emit('all-certificates-regenerated')
      emit('close')
    } catch (err: any) {
      error.value = err
    } finally {
      isRegenerating.value = false
    }
  }
}

function close() {
  if (!isRegenerating.value) {
    error.value = undefined
    serverNameModal.value = ''
    emit('close')
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.openvpn_rw.regenerate_all_certificates')"
    :primary-label="t('standalone.openvpn_rw.regenerate')"
    :cancel-label="t('common.cancel')"
    :primary-button-disabled="isRegenerating || props.serverName !== serverNameModal"
    :primary-button-loading="isRegenerating"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @primary-click="regenerateAllCertificates()"
    @close="close()"
  >
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('error.cannot_renew_server_cert')"
      :description="t(getAxiosErrorMessage(error))"
      class="mb-2"
    />
    {{ t('standalone.openvpn_rw.regenerate_all_certificates_message') }}
    <NeTextInput
      v-model="serverNameModal"
      class="mt-4"
      :disabled="isRegenerating"
      :label="t('standalone.openvpn_rw.type_server_name', { server: props.serverName })"
    />
  </NeModal>
</template>
