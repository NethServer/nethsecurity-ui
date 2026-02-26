<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeDropdown, NeTooltip } from '@nethesis/vue-components'
import type { RWServer } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import {
  faPenToSquare,
  faServer,
  faTrash,
  faUserGroup,
  faTriangleExclamation,
  faCircleExclamation,
  faArrowRotateRight,
  faRefresh
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { t, locale } = useI18n()

defineProps<{
  server: RWServer
  connectedClients: number
}>()

const emit = defineEmits([
  'delete-server',
  'edit-server',
  'renew-server-certificate',
  'regenerate-all-certificates'
])

// certificates expiration warning
const CERT_EXPIRY_WARNING_DAYS = 30

function getDaysUntilExpiry(expiryTimestamp: number): number {
  const secondsUntilExpiry = expiryTimestamp - Date.now() / 1000
  return Math.floor(secondsUntilExpiry / 86400)
}

function isCertificateExpiringSoon(expiryTimestamp: number): boolean {
  const daysUntilExpiry = getDaysUntilExpiry(expiryTimestamp)
  return daysUntilExpiry < CERT_EXPIRY_WARNING_DAYS && daysUntilExpiry >= 0
}

function isCertificatesExpired(expiryTimestamp: number): boolean {
  return expiryTimestamp <= Date.now() / 1000
}
</script>

<template>
  <div class="flex w-full flex-col gap-6 2xl:flex-row">
    <div
      class="flex grow flex-row items-center justify-between rounded-md border-l-4 border-indigo-400 bg-gray-100 p-2 sm:rounded-lg sm:shadow dark:border-indigo-500 dark:bg-gray-800"
    >
      <div class="ml-4 flex flex-row items-center">
        <div class="mr-5 rounded-full bg-gray-900 text-gray-300 dark:bg-gray-50 dark:text-gray-600">
          <FontAwesomeIcon :icon="faServer" aria-hidden="true" class="m-2 h-4 w-4" />
        </div>
        <p>{{ server.ns_description }}</p>
      </div>
      <div
        class="mr-10 ml-4 grow border-l border-gray-800 py-3 pl-4 text-sm md:ml-8 md:pl-8 dark:border-gray-600"
      >
        <div class="grid grid-cols-1 items-center gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p class="mb-2 font-semibold">{{ t('standalone.openvpn_rw.status') }}</p>
            <div :class="['flex', 'flex-row', 'items-center']">
              <font-awesome-icon
                :icon="['fas', server.enabled == '1' ? 'circle-check' : 'circle-xmark']"
                :class="[
                  'mr-2',
                  'h-4',
                  'w-4',
                  server.enabled == '1'
                    ? 'text-green-700 dark:text-green-500'
                    : 'text-red-700 dark:text-red-500'
                ]"
                aria-hidden="true"
              />
              <p>
                {{ server.enabled === '1' ? t('common.enabled') : t('common.disabled') }}
              </p>
            </div>
          </div>
          <div>
            <p class="mb-2 font-semibold">{{ t('standalone.openvpn_rw.database') }}</p>
            <p>
              {{
                server.ns_user_db === 'main'
                  ? t('standalone.openvpn_rw.local_database')
                  : server.ns_user_db
              }}
            </p>
          </div>
          <div>
            <p class="mb-2 font-semibold">{{ t('standalone.openvpn_rw.authentication_mode') }}</p>
            <p>{{ t(`standalone.openvpn_rw.${server.ns_auth_mode}`) }}</p>
          </div>
          <div>
            <p class="mb-2 font-semibold">
              {{ t('standalone.openvpn_rw.certificates_expiration') }}
            </p>
            <!-- Server certificate row -->
            <div class="mb-2 flex flex-row items-center gap-x-2">
              <p>
                Server
                {{
                  server.certificates.server
                    ? new Date(server.certificates.server * 1000).toLocaleString(locale)
                    : '-'
                }}
              </p>
              <!-- certificate expiring soon warning -->
              <NeTooltip
                v-if="
                  server.certificates.server &&
                  isCertificateExpiringSoon(server.certificates.server)
                "
                interactive
              >
                <template #trigger>
                  <FontAwesomeIcon
                    :icon="faTriangleExclamation"
                    :class="['h-4 w-4 text-amber-700 dark:text-amber-500']"
                    aria-hidden="true"
                  />
                </template>
                <template #content>
                  <div class="text-center">
                    <p>
                      {{
                        t('standalone.openvpn_rw.certificate_expiring_tooltip', {
                          days: getDaysUntilExpiry(server.certificates.server)
                        })
                      }}
                    </p>
                  </div>
                </template>
              </NeTooltip>
              <!-- certificate expired warning -->
              <NeTooltip
                v-if="
                  server.certificates.server && isCertificatesExpired(server.certificates.server)
                "
                interactive
              >
                <template #trigger>
                  <FontAwesomeIcon
                    :icon="faCircleExclamation"
                    :class="['h-4 w-4 text-red-700 dark:text-red-500']"
                    aria-hidden="true"
                  />
                </template>
                <template #content>
                  <div class="text-center">
                    <p>{{ t('standalone.openvpn_rw.certificate_expired_tooltip') }}</p>
                  </div>
                </template>
              </NeTooltip>
            </div>
            <!-- CA certificate row -->
            <div class="flex flex-row items-center gap-x-2">
              <p>
                CA
                {{
                  server.certificates.CA
                    ? new Date(server.certificates.CA * 1000).toLocaleString(locale)
                    : '-'
                }}
              </p>
              <!-- certificate expiring soon warning -->
              <NeTooltip
                v-if="server.certificates.CA && isCertificateExpiringSoon(server.certificates.CA)"
                interactive
              >
                <template #trigger>
                  <FontAwesomeIcon
                    :icon="faTriangleExclamation"
                    :class="['h-4 w-4 text-amber-700 dark:text-amber-500']"
                    aria-hidden="true"
                  />
                </template>
                <template #content>
                  <div class="text-center">
                    <p>
                      {{
                        t('standalone.openvpn_rw.certificate_expiring_tooltip', {
                          days: getDaysUntilExpiry(server.certificates.CA)
                        })
                      }}
                    </p>
                  </div>
                </template>
              </NeTooltip>
              <!-- certificate expired warning -->
              <NeTooltip
                v-if="server.certificates.CA && isCertificatesExpired(server.certificates.CA)"
                interactive
              >
                <template #trigger>
                  <FontAwesomeIcon
                    :icon="faCircleExclamation"
                    :class="['h-4 w-4 text-red-700 dark:text-red-500']"
                    aria-hidden="true"
                  />
                </template>
                <template #content>
                  <div class="text-center">
                    <p>{{ t('standalone.openvpn_rw.certificate_expired_tooltip') }}</p>
                  </div>
                </template>
              </NeTooltip>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-row items-center">
        <NeDropdown
          :items="[
            {
              id: 'edit',
              label: t('standalone.openvpn_rw.edit_server'),
              icon: faPenToSquare,
              action: () => {
                emit('edit-server')
              }
            },
            {
              id: 'renew_server_certificate',
              label: t('standalone.openvpn_rw.renew_server_certificate'),
              icon: faArrowRotateRight,
              action: () => {
                emit('renew-server-certificate')
              }
            },
            {
              id: 'regenerate_all_certificates',
              label: t('standalone.openvpn_rw.regenerate_all_certificates'),
              icon: faRefresh,
              action: () => {
                emit('regenerate-all-certificates')
              }
            },
            {
              id: 'delete',
              label: t('common.delete'),
              icon: faTrash,
              danger: true,
              action: () => {
                emit('delete-server')
              }
            }
          ]"
          :align-to-right="true"
        />
      </div>
    </div>

    <div
      class="flex flex-row items-center justify-between rounded-md bg-gray-100 p-5 sm:rounded-lg sm:shadow dark:bg-gray-800"
    >
      <div class="flex flex-row items-center">
        <div class="mr-5 rounded-full bg-gray-900 text-gray-300 dark:bg-gray-50 dark:text-gray-600">
          <FontAwesomeIcon :icon="faUserGroup" aria-hidden="true" class="m-2 h-4 w-4" />
        </div>
        <p class="mx-2">{{ t('standalone.openvpn_rw.connected_clients') }}</p>
      </div>
      <p class="ml-4 text-3xl">{{ connectedClients }}</p>
    </div>
  </div>
</template>
