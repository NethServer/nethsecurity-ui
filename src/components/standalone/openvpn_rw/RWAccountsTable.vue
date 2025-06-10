<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

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
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import type {
  RWAuthenticationMode,
  RWAccount
} from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import { ref } from 'vue'
import {
  faArrowsRotate,
  faCircleArrowDown,
  faCircleCheck,
  faCircleXmark,
  faCircleInfo,
  faTrash,
  faPenToSquare
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { t } = useI18n()

const props = defineProps<{
  users: RWAccount[]
  authenticationMode: RWAuthenticationMode
}>()

const emit = defineEmits<{
  delete: [item: RWAccount]
  edit: [item: RWAccount]
  enableDisable: [item: RWAccount]
  downloadConfiguration: [item: RWAccount]
  downloadCertificate: [item: RWAccount]
  downloadQrCode: [item: RWAccount]
  regenerateCertificate: [item: RWAccount]
}>()

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.users, {
  itemsPerPage: pageSize
})

function getDropdownItems(item: RWAccount) {
  return [
    {
      id: 'download_configuration',
      label: t('standalone.openvpn_rw.download_configuration'),
      icon: faCircleArrowDown,
      danger: false,
      action: () => {
        emit('downloadConfiguration', item)
      }
    },
    {
      id: 'download_certificate',
      label: t('standalone.openvpn_rw.download_certificate'),
      icon: faCircleArrowDown,
      danger: false,
      action: () => {
        emit('downloadCertificate', item)
      }
    },
    ...(props.authenticationMode === 'username_otp_certificate'
      ? [
          {
            id: 'download_qr_code',
            label: t('standalone.openvpn_rw.download_qr_code'),
            icon: faCircleArrowDown,
            danger: false,
            action: () => {
              emit('downloadQrCode', item)
            }
          }
        ]
      : []),
    {
      id: 'enable_disable',
      label: item.openvpn_enabled === '1' ? t('common.disable') : t('common.enable'),
      icon: item.openvpn_enabled === '1' ? faCircleXmark : faCircleCheck,
      action: () => {
        emit('enableDisable', item)
      }
    },
    {
      id: 'regenerate_certificate',
      label: t('standalone.openvpn_rw.regenerate_certificate'),
      icon: faArrowsRotate,
      danger: false,
      action: () => {
        emit('regenerateCertificate', item)
      }
    },
    {
      id: 'delete',
      label: t('common.delete'),
      icon: faTrash,
      danger: true,
      action: () => {
        emit('delete', item)
      }
    }
  ]
}

function getCellClasses(item: RWAccount) {
  return item.openvpn_enabled === '0' ? ['opacity-50'] : []
}
</script>

<template>
  <NeTable :aria-label="t('standalone.openvpn_rw.roadwarrior_accounts')" card-breakpoint="xl">
    <NeTableHead>
      <NeTableHeadCell>
        {{ t('standalone.openvpn_rw.username') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.openvpn_rw.expiration') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.openvpn_rw.reserved_ip') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.openvpn_rw.connection') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.id">
        <!-- username -->
        <NeTableCell :data-label="t('standalone.openvpn_rw.username')">
          <div class="flex flex-row gap-x-3">
            <p :class="[getCellClasses(item)]">
              {{ item.name }}
            </p>
            <!-- password not configured warning -->
            <NeTooltip
              v-if="
                item.local &&
                !item.password &&
                (authenticationMode === 'username_password' ||
                  authenticationMode === 'username_password_certificate')
              "
              interactive
            >
              <template #trigger>
                <font-awesome-icon
                  :icon="['fas', 'triangle-exclamation']"
                  class="h-4 w-4 text-amber-500"
                />
              </template>
              <template #content>
                <div class="text-center">
                  <p>{{ t('standalone.openvpn_rw.password_not_configured') }}</p>
                  <router-link
                    class="text-primary-500 dark:text-primary-800"
                    to="/standalone/users-objects/users-database"
                    >{{ t('standalone.openvpn_rw.edit_user_database') }}</router-link
                  >
                </div>
              </template>
            </NeTooltip>
            <NeTooltip v-if="item.valid === false">
              <template #trigger>
                <FontAwesomeIcon
                  :icon="faCircleInfo"
                  class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
                />
              </template>
              <template #content>
                <div class="text-center">
                  <p>{{ t('standalone.openvpn_rw.user_not_valid') }}</p>
                </div>
              </template>
            </NeTooltip>
          </div>
          <!-- more info button -->
          <NeTooltip v-if="item.connected" interactive placement="bottom">
            <template #trigger>
              <NeButton size="sm" kind="tertiary" class="-mx-2">{{
                t('standalone.openvpn_rw.more_info')
              }}</NeButton>
            </template>
            <template #content>
              <div>
                <div class="px-2 py-1">
                  <div class="py-1">
                    <span class="mr-2 inline-block font-semibold"
                      >{{ t('standalone.openvpn_rw.virtual_ip') }}:</span
                    >
                    <span class="text-gray-300 dark:text-gray-500">{{ item.virtual_address }}</span>
                  </div>
                  <div class="py-1">
                    <span class="mr-2 inline-block font-semibold"
                      >{{ t('standalone.openvpn_rw.remote_ip') }}:</span
                    >
                    <span class="text-gray-300 dark:text-gray-500">{{ item.real_address }}</span>
                  </div>
                  <div class="py-1">
                    <span class="mr-2 inline-block font-semibold"
                      >{{ t('standalone.openvpn_rw.started') }}:</span
                    >
                    <span class="text-gray-300 dark:text-gray-500">{{
                      `${new Date((item.since as number) * 1000).toLocaleDateString()} ${new Date(
                        (item.since as number) * 1000
                      ).toLocaleTimeString()}`
                    }}</span>
                  </div>
                  <div class="py-1 align-top">
                    <span class="mr-2 inline-block align-top font-semibold"
                      >{{ t('standalone.openvpn_rw.traffic') }}:</span
                    >
                    <span class="inline-block align-top text-gray-300 dark:text-gray-500"
                      >{{ parseInt(item.bytes_sent as string) / 1000 }} KB
                      {{ t('standalone.openvpn_rw.sent') }}<br />{{
                        parseInt(item.bytes_received as string) / 1000
                      }}
                      KB {{ t('standalone.openvpn_rw.received') }}</span
                    >
                  </div>
                </div>
              </div>
            </template>
          </NeTooltip>
        </NeTableCell>
        <!-- expiration -->
        <NeTableCell :data-label="t('standalone.openvpn_rw.expiration')">
          <div class="flex flex-row gap-x-3">
            <p :class="[getCellClasses(item)]">
              {{
                item.expiration
                  ? new Date((item.expiration as number) * 1000).toLocaleDateString()
                  : '-'
              }}
            </p>
            <!-- certificate expired warning -->
            <NeTooltip v-if="item.expired" interactive>
              <template #trigger>
                <font-awesome-icon
                  :icon="['fas', 'triangle-exclamation']"
                  class="h-4 w-4 text-amber-500"
                />
              </template>
              <template #content>
                <div class="text-center">
                  <p>{{ t('standalone.openvpn_rw.this_certificate_expired') }}</p>
                  <p
                    class="text-primary-500 dark:text-primary-800 cursor-pointer"
                    @click="emit('regenerateCertificate', item)"
                  >
                    {{ t('standalone.openvpn_rw.renew_certificate') }}
                  </p>
                </div>
              </template>
            </NeTooltip>
          </div>
        </NeTableCell>
        <!-- reserved ip -->
        <NeTableCell :data-label="t('standalone.openvpn_rw.reserved_ip')">
          <p :class="[getCellClasses(item)]">
            {{ item.openvpn_ipaddr ? item.openvpn_ipaddr : '-' }}
          </p>
        </NeTableCell>
        <!-- connection -->
        <NeTableCell :data-label="t('standalone.openvpn_rw.connection')">
          <div v-if="item.valid === false" class="flex flex-row items-center">
            <p>-</p>
          </div>
          <div v-else :class="['flex', 'flex-row', 'items-center', getCellClasses(item)]">
            <font-awesome-icon
              :icon="['fas', item.connected ? 'circle-check' : 'circle-xmark']"
              :class="[
                'mr-2',
                'h-5',
                'w-5',
                item.connected ? 'text-green-600 dark:text-green-400' : ''
              ]"
              aria-hidden="true"
            />
            <p>
              {{
                item.connected
                  ? t('standalone.openvpn_rw.connected')
                  : t('standalone.openvpn_rw.not_connected')
              }}
            </p>
          </div>
        </NeTableCell>
        <!-- actions -->
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
            <template v-if="item.valid !== false">
              <NeButton kind="tertiary" @click="emit('edit', item)">
                <template #prefix>
                  <FontAwesomeIcon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
                </template>
                {{ t('common.edit') }}
              </NeButton>
              <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
            </template>
            <template v-else>
              <NeButton kind="tertiary" @click="emit('delete', item)">
                <template #prefix>
                  <FontAwesomeIcon :icon="faTrash" class="h-4 w-4" aria-hidden="true" />
                </template>
                {{ t('common.delete') }}
              </NeButton>
              <span class="w-6"></span>
            </template>
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.users?.length"
        :page-size="pageSize"
        :nav-pagination-label="t('ne_table.pagination')"
        :next-label="t('ne_table.go_to_next_page')"
        :previous-label="t('ne_table.go_to_previous_page')"
        :range-of-total-label="t('ne_table.of')"
        :page-size-label="t('ne_table.show')"
        @select-page="
          (page: number) => {
            currentPage = page
          }
        "
        @select-page-size="
          (size: number) => {
            pageSize = size
          }
        "
      />
    </template>
  </NeTable>
</template>
