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
  useItemPagination,
  NeSortDropdown,
  type SortEvent,
  NeBadge,
  NeAvatar
} from '@nethesis/vue-components'
import type {
  RWAuthenticationMode,
  RWAccount
} from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import { ref, computed } from 'vue'
import {
  faArrowsRotate,
  faCircleArrowDown,
  faCircleCheck,
  faCircleXmark,
  faCircleInfo,
  faTrash,
  faPenToSquare,
  faXmark,
  faTriangleExclamation,
  faCircleExclamation
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

const sortKey = ref<'name' | 'connected'>('connected')
const sortDescending = ref(false)

const usersData = computed(() => props.users)

// custom sorted items that keeps disabled items always at the end when sorting by connection status
const sortedItems = computed(() => {
  const items = [...usersData.value]

  if (sortKey.value === 'connected') {
    // separate enabled and disabled items
    const enabledItems = items.filter((item) => item.openvpn_enabled !== '0')
    const disabledItems = items.filter((item) => item.openvpn_enabled === '0')

    // check if all enabled items have the same connection status
    const allConnected = enabledItems.every((item) => item.connected === true)
    const allNotConnected = enabledItems.every((item) => item.connected === false)
    const allSameStatus = allConnected || allNotConnected

    // only sort if items have different connection statuses
    if (!allSameStatus) {
      enabledItems.sort((a, b) => {
        const aConnected = a.connected ? 1 : 0
        const bConnected = b.connected ? 1 : 0
        return bConnected - aConnected
      })

      // apply descending if needed
      if (sortDescending.value) {
        enabledItems.reverse()
      }
    }

    return [...enabledItems, ...disabledItems]
  } else {
    // for 'name' sorting, use standard sort
    items.sort((a, b) => a.name.localeCompare(b.name))

    if (sortDescending.value) {
      items.reverse()
    }

    return items
  }
})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
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

const onSort = (payload: SortEvent) => {
  sortKey.value = payload.key as 'name' | 'connected'
  sortDescending.value = payload.descending
}

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
</script>

<template>
  <NeSortDropdown
    v-model:sort-key="sortKey"
    v-model:sort-descending="sortDescending"
    :label="t('sort.sort')"
    :options="[
      { id: 'connected', label: t('standalone.openvpn_rw.connection') },
      { id: 'name', label: t('standalone.openvpn_rw.user') }
    ]"
    :open-menu-aria-label="t('ne_dropdown.open_menu')"
    :sort-by-label="t('sort.sort_by')"
    :sort-direction-label="t('sort.direction')"
    :ascending-label="t('sort.ascending')"
    :descending-label="t('sort.descending')"
    class="lg:hidden"
  />
  <NeTable
    :sort-key="sortKey"
    :sort-descending="sortDescending"
    :aria-label="t('standalone.openvpn_rw.roadwarrior_accounts')"
    card-breakpoint="xl"
  >
    <NeTableHead>
      <NeTableHeadCell sortable column-key="name" @sort="onSort">
        {{ t('standalone.openvpn_rw.user') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.openvpn_rw.certificate_expiration') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.openvpn_rw.reserved_ip') }}
      </NeTableHeadCell>
      <NeTableHeadCell sortable column-key="connected" @sort="onSort">
        {{ t('standalone.openvpn_rw.connection') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.id">
        <!-- user -->
        <NeTableCell :data-label="t('standalone.openvpn_rw.user')">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <NeAvatar :squared="false" alt="Avatar" size="sm" />
              <div>
                <p v-if="item.description" :class="[getCellClasses(item)]">
                  {{ item.description }}
                </p>
                <p :class="[getCellClasses(item)]">
                  {{ item.name }}
                </p>
              </div>
              <div class="flex items-center gap-2 self-start">
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
                    <FontAwesomeIcon :icon="faTriangleExclamation" class="h-4 w-4 text-amber-500" />
                  </template>
                  <template #content>
                    <div class="text-center">
                      <p>{{ t('standalone.openvpn_rw.password_not_configured') }}</p>
                      <RouterLink
                        class="text-primary-500 dark:text-primary-800"
                        to="/standalone/users-objects/users-database"
                      >
                        {{ t('standalone.openvpn_rw.edit_user_database') }}
                      </RouterLink>
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
              <NeBadge
                v-if="item.openvpn_enabled === '0'"
                :icon="faXmark"
                :text="t('common.disabled')"
                kind="secondary"
              />
            </div>
            <NeTooltip v-if="item.connected" interactive placement="bottom">
              <template #trigger>
                <NeButton class="ml-8" kind="tertiary" size="sm">
                  {{ t('standalone.openvpn_rw.more_info') }}
                </NeButton>
              </template>
              <template #content>
                <div>
                  <div class="px-2 py-1">
                    <div class="py-1">
                      <span class="mr-2 inline-block font-semibold">
                        {{ t('standalone.openvpn_rw.virtual_ip') }}:
                      </span>
                      <span class="text-gray-300 dark:text-gray-500"
                        >{{ item.virtual_address }}
                      </span>
                    </div>
                    <div class="py-1">
                      <span class="mr-2 inline-block font-semibold">
                        {{ t('standalone.openvpn_rw.remote_ip') }}:
                      </span>
                      <span class="text-gray-300 dark:text-gray-500">{{ item.real_address }}</span>
                    </div>
                    <div class="py-1">
                      <span class="mr-2 inline-block font-semibold">
                        {{ t('standalone.openvpn_rw.started') }}:
                      </span>
                      <span class="text-gray-300 dark:text-gray-500">
                        {{
                          `${new Date((item.since as number) * 1000).toLocaleDateString()} ${new Date(
                            (item.since as number) * 1000
                          ).toLocaleTimeString()}`
                        }}
                      </span>
                    </div>
                    <div class="py-1 align-top">
                      <span class="mr-2 inline-block align-top font-semibold">
                        {{ t('standalone.openvpn_rw.traffic') }}:
                      </span>
                      <span class="inline-block align-top text-gray-300 dark:text-gray-500">
                        {{ parseInt(item.bytes_sent as string) / 1000 }} KB
                        {{ t('standalone.openvpn_rw.sent') }}<br />{{
                          parseInt(item.bytes_received as string) / 1000
                        }}
                        KB {{ t('standalone.openvpn_rw.received') }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>
            </NeTooltip>
          </div>
        </NeTableCell>
        <!-- expiration -->
        <NeTableCell :data-label="t('standalone.openvpn_rw.expiration')">
          <div class="flex items-start gap-3">
            <p :class="[getCellClasses(item)]">
              {{
                item.expiration
                  ? new Date((item.expiration as number) * 1000).toLocaleDateString()
                  : '-'
              }}
            </p>
            <!-- certificate expiring soon warning -->
            <NeTooltip
              v-if="item.expiration && isCertificateExpiringSoon(Number(item.expiration))"
              class
              interactive
            >
              <template #trigger>
                <FontAwesomeIcon
                  :icon="faTriangleExclamation"
                  class="size-4 text-amber-700 dark:text-amber-500"
                  aria-hidden="true"
                />
              </template>
              <template #content>
                <div class="text-center">
                  <p>
                    {{
                      t('standalone.openvpn_rw.certificate_expiring_tooltip', {
                        days: getDaysUntilExpiry(Number(item.expiration))
                      })
                    }}
                  </p>
                </div>
              </template>
            </NeTooltip>
            <!-- certificate expired warning -->
            <NeTooltip v-if="item.expired" interactive>
              <template #trigger>
                <FontAwesomeIcon
                  :icon="faCircleExclamation"
                  class="h-4 w-4 text-red-700 dark:text-red-500"
                  aria-hidden="true"
                />
              </template>
              <template #content>
                <div class="text-left">
                  <p>{{ t('standalone.openvpn_rw.certificate_expired_tooltip') }}</p>
                  <p
                    class="cursor-pointer text-primary-500 dark:text-primary-800"
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
          <div
            v-if="item.valid === false || item.openvpn_enabled === '0'"
            :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]"
          >
            <p>-</p>
          </div>
          <div v-else :class="['flex', 'flex-row', 'items-center', getCellClasses(item)]">
            <FontAwesomeIcon
              :icon="item.connected ? faCircleCheck : faCircleXmark"
              :class="[
                'mr-2',
                'h-5',
                'w-5',
                item.openvpn_enabled === '1'
                  ? item.connected
                    ? 'text-green-700 dark:text-green-500'
                    : 'text-red-700 dark:text-red-500'
                  : ''
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
