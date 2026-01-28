<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { NeModal } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'
import { watch, ref, computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getCertificateStatus } from './TunnelTable.vue'

const { t, locale } = useI18n()

const { itemToShow = null } = defineProps<{
  itemToShow?: ServerTunnel | ClientTunnel | null
}>()

const _itemToShow = ref<ServerTunnel | ClientTunnel>()
watch(
  () => itemToShow,
  (newVal) => {
    if (newVal !== null) {
      _itemToShow.value = newVal
    }
  },
  { immediate: true }
)

const emit = defineEmits(['close'])

function isClientTunnel(item: ServerTunnel | ClientTunnel): item is ClientTunnel {
  return 'remote_host' in item
}

const certificateStatus = computed(() => {
  if (!_itemToShow.value?.cert_expiry_ts) return { show: false }
  return getCertificateStatus(
    _itemToShow.value.cert_expiry_ts,
    isClientTunnel(_itemToShow.value),
    true
  )
})

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
    <div class="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
      <!-- ns_name -->
      <template v-if="isFieldVisible('ns_name', _itemToShow?.ns_name)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.name') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow?.ns_name ? _itemToShow?.ns_name : '' }}
        </p>
      </template>

      <!-- id -->
      <template v-if="isFieldVisible('id', _itemToShow?.id)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.tunnel_id') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow?.id ? _itemToShow?.id : '' }}
        </p>
      </template>

      <!-- port -->
      <template v-if="isFieldVisible('port', _itemToShow?.port)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.port') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow?.port ? _itemToShow?.port : '' }}
        </p>
      </template>

      <!-- enabled -->
      <template v-if="isFieldVisible('enabled', _itemToShow?.enabled)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.status') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            _itemToShow?.enabled
              ? t('standalone.openvpn_tunnel.enabled')
              : t('standalone.openvpn_tunnel.disabled')
          }}
        </p>
      </template>

      <!-- topology -->
      <template v-if="isFieldVisible('topology', _itemToShow?.topology)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.topology') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            _itemToShow?.topology
              ? _itemToShow?.topology === 'subnet'
                ? t('standalone.openvpn_tunnel.subnet')
                : t('standalone.openvpn_tunnel.p2p')
              : ''
          }}
        </p>
      </template>

      <!-- local_network -->
      <template v-if="isFieldVisible('local_network', (_itemToShow as any)?.local_network)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.local_networks') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            (_itemToShow as any)?.local_network
              ? (_itemToShow as any)?.local_network.join(', ')
              : ''
          }}
        </p>
      </template>

      <!-- remote_network -->
      <template v-if="isFieldVisible('remote_network', _itemToShow?.remote_network)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.remote_networks') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow?.remote_network ? _itemToShow?.remote_network.join(', ') : '' }}
        </p>
      </template>

      <!-- remote_host -->
      <template v-if="isFieldVisible('remote_host', (_itemToShow as any)?.remote_host)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.remote_host') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            (_itemToShow as any)?.remote_host ? (_itemToShow as any)?.remote_host.join(', ') : ''
          }}
        </p>
      </template>

      <!-- vpn_network -->
      <template v-if="isFieldVisible('vpn_network', (_itemToShow as any)?.vpn_network)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.vpn_network') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ (_itemToShow as any)?.vpn_network ? (_itemToShow as any)?.vpn_network : '' }}
        </p>
      </template>

      <!-- real_address -->
      <template v-if="isFieldVisible('real_address', (_itemToShow as any)?.real_address)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.real_address') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ (_itemToShow as any)?.real_address ? (_itemToShow as any)?.real_address : '' }}
        </p>
      </template>

      <!-- virtual_address -->
      <template v-if="isFieldVisible('virtual_address', (_itemToShow as any)?.virtual_address)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.virtual_address') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ (_itemToShow as any)?.virtual_address ? (_itemToShow as any)?.virtual_address : '' }}
        </p>
      </template>

      <!-- connected -->
      <template v-if="isFieldVisible('connected', _itemToShow?.connected)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.connection') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{
            _itemToShow?.connected
              ? t('standalone.openvpn_tunnel.connected')
              : t('standalone.openvpn_tunnel.not_connected')
          }}
        </p>
      </template>

      <!-- since -->
      <template v-if="isFieldVisible('since', _itemToShow?.since)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.since') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow?.since ? new Date(_itemToShow.since * 1000).toLocaleString(locale) : '' }}
        </p>
      </template>

      <!-- bytes_received -->
      <template v-if="isFieldVisible('bytes_received', _itemToShow?.bytes_received)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.bytes_received') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow?.bytes_received ? _itemToShow.bytes_received : '' }}
        </p>
      </template>

      <!-- bytes_sent -->
      <template v-if="isFieldVisible('bytes_sent', _itemToShow?.bytes_sent)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.bytes_sent') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow?.bytes_sent ? _itemToShow.bytes_sent : '' }}
        </p>
      </template>

      <!-- cert_expiry_ts -->
      <template v-if="isFieldVisible('cert_expiry_ts', _itemToShow?.cert_expiry_ts)">
        <p class="text-sm font-semibold">
          {{
            isClientTunnel(_itemToShow!)
              ? t('standalone.openvpn_tunnel.client_cert_expiry')
              : t('standalone.openvpn_tunnel.cert_expiry')
          }}
        </p>
        <div class="flex flex-col gap-2">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{
              _itemToShow?.cert_expiry_ts
                ? new Date(_itemToShow.cert_expiry_ts * 1000).toLocaleString(locale)
                : ''
            }}
          </p>
          <span v-if="certificateStatus.show" class="flex items-center gap-2">
            <FontAwesomeIcon
              :icon="certificateStatus.icon"
              :class="['h-4 w-4', certificateStatus.colorClass]"
              aria-hidden="true"
            />
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ t(certificateStatus.messageKey!, certificateStatus.messageParams!) }}
            </p>
          </span>
        </div>
      </template>
    </div>
  </NeModal>
</template>
