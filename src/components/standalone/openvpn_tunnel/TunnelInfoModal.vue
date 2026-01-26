<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { NeModal } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'
import { watch, ref, computed } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { getCertificateStatus } from './TunnelTable.vue';

const { t, locale } = useI18n()

const{ itemToShow = null } = defineProps<{
  itemToShow?: ServerTunnel | ClientTunnel | null
}>()

const _itemToShow = ref<ServerTunnel | ClientTunnel>();
watch(() => itemToShow, (newVal) => {
    if (newVal !== null) {
        _itemToShow.value = newVal;
    }
}, { immediate: true });

const emit = defineEmits(['close'])

function isClientTunnel(item: ServerTunnel | ClientTunnel): item is ClientTunnel {
  return 'remote_host' in item
}

const certificateStatus = computed(() => {
  if (!_itemToShow.value?.cert_expiry_ts) return { show: false }
  return getCertificateStatus(_itemToShow.value.cert_expiry_ts, isClientTunnel(_itemToShow.value), true)
})

const fieldLabels = computed(() => {
  const isTunnelClient = _itemToShow.value ? isClientTunnel(_itemToShow.value) : false
  
  return {
    bytes_received: t('standalone.openvpn_tunnel.bytes_received'),
    bytes_sent: t('standalone.openvpn_tunnel.bytes_sent'),
    cert_expiry_ts: isTunnelClient 
      ? t('standalone.openvpn_tunnel.client_cert_expiry')
      : t('standalone.openvpn_tunnel.cert_expiry'),
    connected: t('standalone.openvpn_tunnel.connection'),
    enabled: t('standalone.openvpn_tunnel.status'),
    id: 'Tunnel ID',
    local_network: t('standalone.openvpn_tunnel.local_networks'),
    ns_name: t('standalone.openvpn_tunnel.name'),
    port: t('standalone.openvpn_tunnel.port'),
    real_address: t('standalone.openvpn_tunnel.real_address'),
    remote_network: t('standalone.openvpn_tunnel.remote_networks'),
    since: t('standalone.openvpn_tunnel.since'),
    topology: t('standalone.openvpn_tunnel.topology'),
    virtual_address: t('standalone.openvpn_tunnel.virtual_address'),
    vpn_network: t('standalone.openvpn_tunnel.vpn_network'),
    remote_host: t('standalone.openvpn_tunnel.remote_host'),
  }
})

function formatFieldValue(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return ''

  // Handle timestamps
  if ((key === 'cert_expiry_ts' || key === 'since') && typeof value === 'number') {
    const date = new Date(value * 1000)
    return date.toLocaleString(locale.value)
  }

  // Handle boolean-like fields
  if (key === 'connected') {
    return value ? t('standalone.openvpn_tunnel.connected') : t('standalone.openvpn_tunnel.not_connected')
  }

  if (key === 'enabled') {
    return value ? t('standalone.openvpn_tunnel.enabled') : t('standalone.openvpn_tunnel.disabled')
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return String(value)
}

function isFieldVisible(key: string, value: any): boolean {
  // Check if field has a meaningful value
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}
</script>

<template>
  <NeModal
    :visible="itemToShow !== null"
    kind="info"
    size="lg"
    :primary-label="t('common.close')"
    :title="t('standalone.openvpn_tunnel.tunnel_details')"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="emit('close')"
  >
    <div class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
      <!-- ns_name -->
      <template v-if="isFieldVisible('ns_name', _itemToShow?.ns_name)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['ns_name'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('ns_name', _itemToShow?.ns_name) }}
        </p>
      </template>

      <!-- id -->
      <template v-if="isFieldVisible('id', _itemToShow?.id)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['id'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('id', _itemToShow?.id) }}
        </p>
      </template>

      <!-- port -->
      <template v-if="isFieldVisible('port', _itemToShow?.port)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['port'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('port', _itemToShow?.port) }}
        </p>
      </template>

      <!-- enabled -->
      <template v-if="isFieldVisible('enabled', _itemToShow?.enabled)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['enabled'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('enabled', _itemToShow?.enabled) }}
        </p>
      </template>

      <!-- topology -->
      <template v-if="isFieldVisible('topology', _itemToShow?.topology)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['topology'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('topology', _itemToShow?.topology) }}
        </p>
      </template>

      <!-- local_network -->
      <template v-if="isFieldVisible('local_network', (_itemToShow as any)?.local_network)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['local_network'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('local_network', (_itemToShow as any)?.local_network) }}
        </p>
      </template>

      <!-- remote_network -->
      <template v-if="isFieldVisible('remote_network', _itemToShow?.remote_network)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['remote_network'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('remote_network', _itemToShow?.remote_network) }}
        </p>
      </template>

      <!-- remote_host -->
      <template v-if="isFieldVisible('remote_host', (_itemToShow as any)?.remote_host)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['remote_host'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('remote_host', (_itemToShow as any)?.remote_host) }}
        </p>
      </template>

      <!-- vpn_network -->
      <template v-if="isFieldVisible('vpn_network', (_itemToShow as any)?.vpn_network)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['vpn_network'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('vpn_network', (_itemToShow as any)?.vpn_network) }}
        </p>
      </template>

      <!-- real_address -->
      <template v-if="isFieldVisible('real_address', (_itemToShow as any)?.real_address)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['real_address'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('real_address', (_itemToShow as any)?.real_address) }}
        </p>
      </template>

      <!-- virtual_address -->
      <template v-if="isFieldVisible('virtual_address', (_itemToShow as any)?.virtual_address)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['virtual_address'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('virtual_address', (_itemToShow as any)?.virtual_address) }}
        </p>
      </template>

      <!-- connected -->
      <template v-if="isFieldVisible('connected', _itemToShow?.connected)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['connected'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('connected', _itemToShow?.connected) }}
        </p>
      </template>

      <!-- since -->
      <template v-if="isFieldVisible('since', _itemToShow?.since)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['since'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('since', _itemToShow?.since) }}
        </p>
      </template>

      <!-- bytes_received -->
      <template v-if="isFieldVisible('bytes_received', _itemToShow?.bytes_received)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['bytes_received'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('bytes_received', _itemToShow?.bytes_received) }}
        </p>
      </template>

      <!-- bytes_sent -->
      <template v-if="isFieldVisible('bytes_sent', _itemToShow?.bytes_sent)">
        <p class="font-semibold text-sm">
          {{ fieldLabels['bytes_sent'] }}
        </p>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ formatFieldValue('bytes_sent', _itemToShow?.bytes_sent) }}
        </p>
      </template>

      <!-- cert_expiry_ts -->
      <template v-if="isFieldVisible('cert_expiry_ts', _itemToShow?.cert_expiry_ts)">
        <p class="font-semibold text-sm">
            {{ fieldLabels['cert_expiry_ts'] }}
        </p>        
        <div class="flex flex-col gap-2">
          <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ formatFieldValue('cert_expiry_ts', _itemToShow?.cert_expiry_ts) }}
          </p>
          <span v-if="certificateStatus.show" class="flex items-center gap-2">
            <FontAwesomeIcon
              :icon="certificateStatus.icon"
              :class="['h-4 w-4', certificateStatus.colorClass]"
              aria-hidden="true"
            />
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              {{ t(certificateStatus.messageKey!, certificateStatus.messageParams!) }}
            </p>
          </span>
        </div>
      </template>
    </div>
  </NeModal>
</template>

