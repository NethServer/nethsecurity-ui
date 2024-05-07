<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeInlineNotification,
  NeRadioSelection,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { getProductName } from '@/lib/config'

const props = defineProps<{
  visible: boolean
  itemToDownload: ServerTunnel | ClientTunnel | null
}>()

const { t } = useI18n()
const emit = defineEmits(['close', 'tunnel-downloaded'])

const { visible, itemToDownload } = toRefs(props)
const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDownloading = ref(false)
const downloadMode = ref<
  'nethsecurity_client_configuration' | 'private_key_tunnel_ca_certificates' | ''
>('')

const downloadOptions = [
  {
    id: 'nethsecurity_client_configuration',
    label: t('standalone.openvpn_tunnel.nethsecurity_client_configuration', {
      product: getProductName()
    }),
    description: t('standalone.openvpn_tunnel.nethsecurity_client_configuration_description', {
      product: getProductName()
    })
  }
]

async function downloadTunnel() {
  if (itemToDownload.value && downloadMode.value) {
    try {
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
      isDownloading.value = true
      if (downloadMode.value == 'nethsecurity_client_configuration') {
        const exportedJsonPayload = JSON.stringify(
          (await ubusCall('ns.ovpntunnel', 'export-client', { id: itemToDownload.value.id })).data
        )
        var downloadElement = document.createElement('a')
        downloadElement.setAttribute(
          'href',
          'data:text/json;charset=utf-8,' + encodeURIComponent(exportedJsonPayload)
        )
        downloadElement.setAttribute(
          'download',
          `${!itemToDownload.value.ns_name ? 'tunnel' : itemToDownload.value.ns_name}.json`
        )
        document.body.appendChild(downloadElement)
        downloadElement.click()
        downloadElement.remove()
      } else {
        // TODO: download private key, tunnel and ca certificates
      }
      emit('tunnel-downloaded')
      close()
    } catch (err: any) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    } finally {
      isDownloading.value = false
    }
  }
}

function close() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  downloadMode.value = ''
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="neutral"
    :title="t('standalone.openvpn_tunnel.download')"
    :primaryLabel="t('standalone.openvpn_tunnel.download')"
    :primaryButtonDisabled="!downloadMode || isDownloading"
    :primaryButtonLoading="isDownloading"
    :close-aria-label="t('common.close')"
    @primaryClick="downloadTunnel()"
    @close="close()"
  >
    {{ t('standalone.openvpn_tunnel.download_tunnel_message', { name: itemToDownload?.ns_name }) }}
    <NeRadioSelection
      :card="true"
      :options="downloadOptions"
      v-model="downloadMode"
      :label="''"
      :grid-style="'grid-cols-1 gap-3'"
      class="mt-4"
      card-size="lg"
    >
      <template #option="{ option }">
        <div class="flex flex-col gap-y-1 text-left">
          <p>{{ option.label }}</p>
          <p class="text-gray-500 dark:text-gray-400">{{ option.description }}</p>
        </div>
      </template>
    </NeRadioSelection>
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_download_tunnel')"
      :description="error.notificationDescription"
      class="mt-4"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
