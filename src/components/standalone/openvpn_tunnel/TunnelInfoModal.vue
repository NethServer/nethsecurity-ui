<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { NeModal } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'
import { watch, ref } from 'vue'
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

function getCertStatus(expirationTimestamp: number) {
  if (!_itemToShow.value?.certificates) return { show: false }
  return getCertificateStatus({ cert: expirationTimestamp })
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
    <div v-if="_itemToShow !== undefined" class="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
      <!-- fields visible both for server and client tunnels -->

      <!-- ns_name -->
      <p class="text-sm font-semibold">
        {{ t('standalone.openvpn_tunnel.name') }}
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ _itemToShow.ns_name }}
      </p>

      <!-- id -->
      <p class="text-sm font-semibold">
        {{ t('standalone.openvpn_tunnel.tunnel_id') }}
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ _itemToShow.id }}
      </p>

      <!-- port -->
      <p class="text-sm font-semibold">
        {{ t('standalone.openvpn_tunnel.port') }}
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{ _itemToShow.port }}
      </p>

      <!-- enabled -->
      <p class="text-sm font-semibold">
        {{ t('standalone.openvpn_tunnel.status') }}
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{
          _itemToShow.enabled
            ? t('standalone.openvpn_tunnel.enabled')
            : t('standalone.openvpn_tunnel.disabled')
        }}
      </p>

      <!-- topology -->
      <p class="text-sm font-semibold">
        {{ t('standalone.openvpn_tunnel.topology') }}
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{
          _itemToShow.topology
            ? _itemToShow.topology === 'subnet'
              ? t('standalone.openvpn_tunnel.subnet')
              : t('standalone.openvpn_tunnel.p2p')
            : ''
        }}
      </p>

      <!-- remote_network -->
      <p class="text-sm font-semibold">
        {{ t('standalone.openvpn_tunnel.remote_networks') }}
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        <template v-if="_itemToShow.remote_network.length > 0">
          {{ _itemToShow.remote_network.join(', ') }}
        </template>
        <template v-else> - </template>
      </p>

      <!-- fields visible only for client tunnels (both connected and not) -->

      <!-- remote_host -->
      <template v-if="isClientTunnel(_itemToShow)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.remote_host') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <template v-if="_itemToShow.remote_host.length > 0">
            {{ _itemToShow.remote_host.join(', ') }}
          </template>
          <template v-else> - </template>
        </p>
      </template>

      <!-- fields visible only for server tunnels (both connected and not) -->

      <!-- local_network -->
      <template v-if="!isClientTunnel(_itemToShow)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.local_networks') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          <template v-if="_itemToShow.local_network.length > 0">
            {{ _itemToShow.local_network.join(', ') }}
          </template>
          <template v-else> - </template>
        </p>
      </template>

      <!-- vpn_network -->
      <template v-if="!isClientTunnel(_itemToShow)">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.vpn_network') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow.vpn_network }}
        </p>
      </template>

      <!-- fields visible only for connected server tunnels -->

      <!-- real_address -->
      <template v-if="!isClientTunnel(_itemToShow) && _itemToShow.connected">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.real_address') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow.real_address }}
        </p>
      </template>

      <!-- virtual_address -->
      <template v-if="!isClientTunnel(_itemToShow) && _itemToShow.connected">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.virtual_address') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow.virtual_address }}
        </p>
      </template>

      <!-- connection section -->

      <!-- connected -->
      <p class="text-sm font-semibold">
        {{ t('standalone.openvpn_tunnel.connection') }}
      </p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        {{
          _itemToShow.connected
            ? t('standalone.openvpn_tunnel.connected')
            : t('standalone.openvpn_tunnel.not_connected')
        }}
      </p>

      <!-- since -->
      <template v-if="_itemToShow.connected">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.since') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow.since ? new Date(_itemToShow.since * 1000).toLocaleString(locale) : '-' }}
        </p>
      </template>

      <!-- bytes_sent -->
      <template v-if="_itemToShow.connected">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.bytes_sent') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow.bytes_sent ? _itemToShow.bytes_sent : '-' }}
        </p>
      </template>

      <!-- bytes_received -->
      <template v-if="_itemToShow.connected">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.bytes_received') }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ _itemToShow.bytes_received ? _itemToShow.bytes_received : '-' }}
        </p>
      </template>

      <!-- certificates -->
      <template v-if="!isClientTunnel(_itemToShow!) && _itemToShow.certificates.server">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.server_cert_expiration') }}
        </p>
        <div class="space-y-1">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ new Date(_itemToShow.certificates.server * 1000).toLocaleString(locale) }}
          </p>
          <span
            v-if="getCertStatus(_itemToShow.certificates.server).show"
            class="flex items-center gap-2"
          >
            <FontAwesomeIcon
              :icon="getCertStatus(_itemToShow.certificates.server).icon"
              :class="['h-4 w-4', getCertStatus(_itemToShow.certificates.server).colorClass]"
              aria-hidden="true"
            />
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                t(
                  getCertStatus(_itemToShow.certificates.server).messageKey!,
                  getCertStatus(_itemToShow.certificates.server).messageParams!
                )
              }}
            </p>
          </span>
        </div>
      </template>
      <template v-if="_itemToShow.certificates.client">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.client_cert_expiration') }}
        </p>
        <div class="space-y-1">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ new Date(_itemToShow.certificates.client * 1000).toLocaleString(locale) }}
          </p>
          <span
            v-if="getCertStatus(_itemToShow.certificates.client).show"
            class="flex items-center gap-2"
          >
            <FontAwesomeIcon
              :icon="getCertStatus(_itemToShow.certificates.client).icon"
              :class="['h-4 w-4', getCertStatus(_itemToShow.certificates.client).colorClass]"
              aria-hidden="true"
            />
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                t(
                  getCertStatus(_itemToShow.certificates.client).messageKey!,
                  getCertStatus(_itemToShow.certificates.client).messageParams!
                )
              }}
            </p>
          </span>
        </div>
      </template>
      <template v-if="_itemToShow.certificates.CA">
        <p class="text-sm font-semibold">
          {{ t('standalone.openvpn_tunnel.ca_cert_expiration') }}
        </p>
        <div class="space-y-1">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ new Date(_itemToShow.certificates.CA * 1000).toLocaleString(locale) }}
          </p>
          <span
            v-if="getCertStatus(_itemToShow.certificates.CA).show"
            class="flex items-center gap-2"
          >
            <FontAwesomeIcon
              :icon="getCertStatus(_itemToShow.certificates.CA).icon"
              :class="['h-4 w-4', getCertStatus(_itemToShow.certificates.CA).colorClass]"
              aria-hidden="true"
            />
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                t(
                  getCertStatus(_itemToShow.certificates.CA).messageKey!,
                  getCertStatus(_itemToShow.certificates.CA).messageParams!
                )
              }}
            </p>
          </span>
        </div>
      </template>
    </div>
  </NeModal>
</template>
