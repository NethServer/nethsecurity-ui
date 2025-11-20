<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  NeSortDropdown,
  useItemPagination,
  useSort,
  type NeDropdownItem,
  type SortEvent
} from '@nethesis/vue-components'
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ScanResult } from './ScanNetwork.vue'
import { faCirclePlus, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { ipv4ToInt } from '@/lib/ipUtils.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps({
  results: {
    type: Array as PropType<ScanResult[]>,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  searchTerm: {
    type: String,
    default: ''
  },
  showPaginator: {
    type: Boolean,
    default: true
  },
  interfaceName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['addIpReservation', 'addDnsRecord'])

const { t } = useI18n()

const sortKey = ref<keyof ScanResult>('ip')
const sortDescending = ref(false)

const filteredResults = computed(() => {
  let filtered = props.results

  if (props.searchTerm) {
    const search = props.searchTerm.toLowerCase()
    filtered = filtered.filter((item) => {
      const reservationText = getReservationSearchText(item.reservation)
      return (
        item.ip?.toLowerCase().includes(search) ||
        item.mac?.toLowerCase().includes(search) ||
        item.hostname?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        reservationText.includes(search)
      )
    })
  }

  return filtered
})

const { sortedItems } = useSort(() => filteredResults.value, sortKey, sortDescending, {
  ip: (a, b) => ipv4ToInt(a.ip) - ipv4ToInt(b.ip),
  reservation: (a, b) => {
    // null (error) = 0, false (not reserved) = 1, true (reserved) = 2
    const aValue = a.reservation === null ? 0 : a.reservation ? 2 : 1
    const bValue = b.reservation === null ? 0 : b.reservation ? 2 : 1

    return aValue - bValue
  }
})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
  itemsPerPage: pageSize
})

const onSort = (payload: SortEvent) => {
  sortKey.value = payload.key as keyof ScanResult
  sortDescending.value = payload.descending
}

function getReservationSearchText(reservation: boolean | null | undefined): string {
  if (reservation === null || reservation === undefined) {
    return '-'
  }
  if (reservation) {
    return t('standalone.dns_dhcp.scan_network_reservation_ip_reserved').toLowerCase()
  } else {
    return t('standalone.dns_dhcp.scan_network_reservation_ip_not_reserved').toLowerCase()
  }
}

function getKebabMenuItems(scanResult: ScanResult): NeDropdownItem[] {
  const options: NeDropdownItem[] = []

  // Add "Add IP Reservation" only if there's no error and no existing reservation
  if (scanResult.reservation === false) {
    options.push({
      id: 'addIpReservation',
      label: t('standalone.dns_dhcp.add_reservation'),
      icon: faCirclePlus,
      action: () => emit('addIpReservation', scanResult)
    })
  }

  // Always add "Add DNS Record"
  options.push({
    id: 'addDnsRecord',
    label: t('standalone.dns_dhcp.add_dns_record'),
    icon: faCirclePlus,
    action: () => emit('addDnsRecord', scanResult)
  })

  return options
}
</script>

<template>
  <NeSortDropdown
    v-model:sort-key="sortKey"
    v-model:sort-descending="sortDescending"
    :label="t('sort.sort')"
    :options="[
      { id: 'ip', label: t('standalone.dns_dhcp.ip_address') },
      { id: 'hostname', label: t('standalone.dns_dhcp.hostname') },
      { id: 'description', label: t('standalone.dns_dhcp.description') },
      { id: 'reservation', label: t('standalone.dns_dhcp.scan_network_reservation') }
    ]"
    :open-menu-aria-label="t('ne_dropdown.open_menu')"
    :sort-by-label="t('sort.sort_by')"
    :sort-direction-label="t('sort.direction')"
    :ascending-label="t('sort.ascending')"
    :descending-label="t('sort.descending')"
    class="mb-2 xl:hidden"
  />
  <p
    v-if="interfaceName"
    class="z-0 -mb-1 table max-w-md rounded-ss-md rounded-se-md bg-indigo-300 p-2 text-sm dark:bg-indigo-800"
  >
    {{ t('standalone.dns_dhcp.interface_name', { name: interfaceName }) }}
  </p>
  <NeTable
    :sort-key="sortKey"
    :sort-descending="sortDescending"
    :aria-label="t('standalone.dns_dhcp.scan_results')"
    card-breakpoint="xl"
    :loading="loading"
    :skeleton-columns="6"
    :skeleton-rows="5"
  >
    <NeTableHead>
      <NeTableHeadCell column-key="ip" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.ip_address') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.dns_dhcp.mac_address') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="hostname" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.hostname') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="description" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.description') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="reservation" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.scan_network_reservation') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.ip">
        <NeTableCell :data-label="t('standalone.dns_dhcp.ip_address')">
          {{ item.ip || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.mac_address')">
          {{ item.mac || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.hostname')">
          {{ item.hostname || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.description')">
          {{ item.description || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.scan_network_reservation')">
          <span class="flex items-center gap-2">
            <template v-if="item.reservation === null">
              <span>-</span>
            </template>
            <template v-else-if="item.reservation === true">
              <FontAwesomeIcon :icon="faCircleCheck" class="text-green-700 dark:text-green-500" />
              <span>{{ t('standalone.dns_dhcp.scan_network_reservation_ip_reserved') }}</span>
            </template>
            <template v-else>
              <FontAwesomeIcon :icon="faCircleXmark" />
              <span>{{ t('standalone.dns_dhcp.scan_network_reservation_ip_not_reserved') }}</span>
            </template>
          </span>
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="flex justify-end">
            <NeDropdown :items="getKebabMenuItems(item)" :align-to-right="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template v-if="showPaginator" #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="sortedItems.length"
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
