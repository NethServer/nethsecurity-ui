<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script lang="ts">
// certificate expiry warning threshold in days
export const CERT_EXPIRY_WARNING_DAYS = 30

export interface CertificateStatusResult {
  show: boolean
  icon?: any
  colorClass?: string
  messageKey?: string
  messageParams?: Record<string, any>
}

export function getDaysUntilExpiry(expiryTimestamp: number): number {
  const secondsUntilExpiry = expiryTimestamp - Date.now() / 1000
  return Math.floor(secondsUntilExpiry / 86400)
}

export function shouldShowCertExpiryBadge(expiryTimestamp: number): boolean {
  const daysUntilExpiry = getDaysUntilExpiry(expiryTimestamp)
  return daysUntilExpiry < CERT_EXPIRY_WARNING_DAYS && daysUntilExpiry >= 0
}

export function isCertificatesExpired(expiryTimestamp: number): boolean {
  return expiryTimestamp <= Date.now() / 1000
}

export function getCertificateStatus(
  certificates: { [key: string]: number },
  isClientTunnel: boolean = false,
  tunnelDetailModal: boolean = false
): CertificateStatusResult {
  // Determine which certificate to check (client for client tunnels, server for server tunnels)
  const certToCheck = isClientTunnel ? certificates.client : certificates.server

  // If the certificate is not available, return no status to show
  if (!certToCheck) {
    return { show: false }
  }

  if (isCertificatesExpired(certToCheck)) {
    return {
      show: true,
      icon: faCircleExclamation,
      colorClass: 'text-red-700 dark:text-red-500',
      messageKey: tunnelDetailModal
        ? isClientTunnel
          ? 'standalone.openvpn_tunnel.client_cert_expired_complete_message'
          : 'standalone.openvpn_tunnel.cert_expired_complete_message'
        : isClientTunnel
          ? 'standalone.openvpn_tunnel.client_cert_expired_message'
          : 'standalone.openvpn_tunnel.cert_expired_message'
    }
  }

  if (shouldShowCertExpiryBadge(certToCheck)) {
    return {
      show: true,
      icon: faTriangleExclamation,
      colorClass: 'text-amber-700 dark:text-amber-500',
      messageKey: tunnelDetailModal
        ? isClientTunnel
          ? 'standalone.openvpn_tunnel.client_cert_expiring_complete_message'
          : 'standalone.openvpn_tunnel.cert_expiring_complete_message'
        : isClientTunnel
          ? 'standalone.openvpn_tunnel.client_cert_expiring_message'
          : 'standalone.openvpn_tunnel.cert_expiring_message',
      messageParams: {
        days: getDaysUntilExpiry(certToCheck)
      }
    }
  }
  return { show: false }
}
</script>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeDropdown,
  NeButton,
  NeTooltip,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell
} from '@nethesis/vue-components'
import type { ServerTunnel, ClientTunnel } from './TunnelManager.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faCircleArrowDown,
  faCircleCheck,
  faCircleXmark,
  faTrash,
  faMagnifyingGlassPlus,
  faRefresh,
  faCircleExclamation,
  faTriangleExclamation,
  faPenToSquare
} from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()

const props = defineProps<{
  tunnels: ServerTunnel[] | ClientTunnel[]
  isClientTunnel: boolean
}>()

const emit = defineEmits([
  'tunnel-delete',
  'tunnel-edit',
  'tunnel-toggle-enable',
  'tunnel-download',
  'tunnel-regenerate-certs',
  'tunnel-show-info'
])

function getDropdownItems(item: ServerTunnel | ClientTunnel) {
  const items = [
    {
      id: 'download',
      label: t('standalone.openvpn_tunnel.download'),
      icon: faCircleArrowDown,
      action: () => {
        emit('tunnel-download', item)
      }
    },
    {
      id: 'enable_disable',
      label: item.enabled
        ? t('standalone.openvpn_tunnel.disable')
        : t('standalone.openvpn_tunnel.enable'),
      icon: item.enabled ? faCircleXmark : faCircleCheck,
      action: () => {
        emit('tunnel-toggle-enable', item)
      }
    },
    ...(props.isClientTunnel
      ? []
      : [
          {
            id: 'regenerate_certs',
            label: t('standalone.openvpn_tunnel.regenerate_cert'),
            icon: faRefresh,
            action: () => {
              emit('tunnel-regenerate-certs', item)
            }
          }
        ]),
    {
      id: 'delete',
      label: t('common.delete'),
      icon: faTrash,
      danger: true,
      action: () => {
        emit('tunnel-delete', item)
      }
    }
  ]
  return items
}

function getCellClasses(item: ServerTunnel | ClientTunnel) {
  return !item.enabled ? ['text-gray-400', 'dark:text-gray-700'] : []
}

function checkIsClientTunnel(item: ServerTunnel | ClientTunnel): item is ClientTunnel {
  return 'remote_host' in item
}
</script>

<template>
  <NeTable v-if="tunnels" card-breakpoint="xl" :skeleton-columns="6" :skeleton-rows="5">
    <NeTableHead>
      <NeTableHeadCell column-key="name">
        {{ t('standalone.openvpn_tunnel.name') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="port">
        {{ t('standalone.openvpn_tunnel.port') }}
      </NeTableHeadCell>
      <NeTableHeadCell v-if="!props.isClientTunnel" column-key="local_networks">
        {{ t('standalone.openvpn_tunnel.local_networks') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="remote_networks">
        {{ t('standalone.openvpn_tunnel.remote_networks') }}
      </NeTableHeadCell>
      <NeTableHeadCell v-if="props.isClientTunnel" column-key="remote_hosts">
        {{ t('standalone.openvpn_tunnel.remote_hosts') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="topology">
        {{ t('standalone.openvpn_tunnel.topology') }}
      </NeTableHeadCell>
      <NeTableHeadCell v-if="!props.isClientTunnel" column-key="vpn_network">
        {{ t('standalone.openvpn_tunnel.vpn_network') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="status">
        {{ t('standalone.openvpn_tunnel.status') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="connection">
        {{ t('standalone.openvpn_tunnel.connection') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="menu">
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in tunnels" :key="item.ns_name">
        <NeTableCell :data-label="t('standalone.openvpn_tunnel.name')">
          <span class="flex items-center gap-3">
            <NeButton
              size="sm"
              kind="tertiary"
              class="h-8 w-8 shrink-0 p-0"
              :disabled="!item.enabled"
              @click="emit('tunnel-show-info', item)"
            >
              <FontAwesomeIcon
                :icon="faMagnifyingGlassPlus"
                class="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            </NeButton>
            <p :class="[...getCellClasses(item)]">{{ item.ns_name }}</p>
            <NeTooltip
              v-if="
                item.certificates &&
                getCertificateStatus(item.certificates, checkIsClientTunnel(item)).show
              "
              interactive
            >
              <template #trigger>
                <FontAwesomeIcon
                  :icon="getCertificateStatus(item.certificates, checkIsClientTunnel(item)).icon"
                  :class="[
                    'h-4 w-4',
                    getCertificateStatus(item.certificates, checkIsClientTunnel(item)).colorClass
                  ]"
                  aria-hidden="true"
                />
              </template>
              <template #content>
                <p class="text-center">
                  {{
                    t(
                      getCertificateStatus(item.certificates, checkIsClientTunnel(item)).messageKey!
                    )
                  }}
                </p>
              </template>
            </NeTooltip>
          </span>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_tunnel.port')">
          <p :class="[...getCellClasses(item)]">{{ item.port }}</p>
        </NeTableCell>
        <NeTableCell
          v-if="!checkIsClientTunnel(item)"
          :data-label="t('standalone.openvpn_tunnel.local_networks')"
        >
          <template v-if="item.local_network.length > 0">
            <p
              v-for="(local, idx) in item.local_network.slice(0, 2)"
              :key="local"
              :class="[...getCellClasses(item)]"
            >
              {{ local }}{{ item.local_network.length > 2 && idx == 1 ? '...' : '' }}
            </p>
          </template>
          <p v-else :class="[...getCellClasses(item)]">-</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_tunnel.remote_networks')">
          <template v-if="item.remote_network.length > 0">
            <p
              v-for="(remote, idx) in item.remote_network.slice(0, 2)"
              :key="remote"
              :class="[...getCellClasses(item)]"
            >
              {{ remote }}{{ item.remote_network.length > 2 && idx == 1 ? '...' : '' }}
            </p>
          </template>
          <p v-else :class="[...getCellClasses(item)]">-</p>
        </NeTableCell>
        <NeTableCell
          v-if="checkIsClientTunnel(item)"
          :data-label="t('standalone.openvpn_tunnel.remote_hosts')"
        >
          <template v-if="item.remote_host.length > 0">
            <p
              v-for="(remoteHost, idx) in item.remote_host.slice(0, 2)"
              :key="remoteHost"
              :class="[...getCellClasses(item)]"
            >
              {{ remoteHost }}{{ item.remote_host.length > 2 && idx == 1 ? '...' : '' }}
            </p>
          </template>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_tunnel.topology')">
          <p :class="[...getCellClasses(item)]">
            {{
              item.topology === 'subnet'
                ? t('standalone.openvpn_tunnel.subnet')
                : t('standalone.openvpn_tunnel.p2p')
            }}
          </p>
        </NeTableCell>
        <NeTableCell
          v-if="!checkIsClientTunnel(item)"
          :data-label="t('standalone.openvpn_tunnel.vpn_network')"
        >
          <p :class="[...getCellClasses(item)]">{{ item.vpn_network }}</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_tunnel.status')">
          <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
            <FontAwesomeIcon
              :icon="item.enabled ? faCircleCheck : faCircleXmark"
              :class="[
                'mr-2',
                'h-5',
                'w-5',
                item.enabled ? 'text-green-700 dark:text-green-500' : ''
              ]"
              aria-hidden="true"
            />
            <p>
              {{
                item.enabled
                  ? t('standalone.openvpn_tunnel.enabled')
                  : t('standalone.openvpn_tunnel.disabled')
              }}
            </p>
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_tunnel.connection')">
          <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
            <FontAwesomeIcon
              :icon="item.connected ? faCircleCheck : faCircleXmark"
              :class="[
                'mr-2',
                'h-5',
                'w-5',
                item.connected && item.enabled
                  ? 'text-green-700 dark:text-green-500'
                  : item.enabled
                    ? 'text-red-700 dark:text-red-500'
                    : ''
              ]"
              aria-hidden="true"
            />
            <p>
              {{
                item.connected
                  ? t('standalone.openvpn_tunnel.connected')
                  : t('standalone.openvpn_tunnel.not_connected')
              }}
            </p>
          </div>
        </NeTableCell>
        <NeTableCell>
          <div class="align-center flex justify-end">
            <NeButton kind="tertiary" @click="emit('tunnel-edit', item)">
              <template #prefix>
                <FontAwesomeIcon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('common.edit') }}
            </NeButton>
            <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
  </NeTable>
</template>
