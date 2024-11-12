<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  formatDateLoc,
  byteFormat1024,
  useSort,
  NeSortDropdown
} from '@nethesis/vue-components'
import type { ConnectionsRecord } from './ConnectionsHistory.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ref, computed } from 'vue'
const { t } = useI18n()

const props = defineProps<{
  connectionsRecords: ConnectionsRecord[]
}>()

const pageSize = ref(10)

const sortKey = ref('startTime')
const sortDescending = ref(true)

function compareIpAddresses(ip1: string, ip2: string): number {
  const octets1 = ip1.split('.').map(Number)
  const octets2 = ip2.split('.').map(Number)

  for (let i = 0; i < 4; i++) {
    if (octets1[i] !== octets2[i]) {
      return octets1[i] - octets2[i]
    }
  }
  return 0
}

// Custom sorting functions
const sortFunctions = {
  endTime: (a: ConnectionsRecord, b: ConnectionsRecord) => {
    return (a.endTime ?? 0) - (b.endTime ?? 0)
  },
  duration: (a: ConnectionsRecord, b: ConnectionsRecord) => {
    return (a.duration ?? 0) - (b.duration ?? 0)
  },
  virtualIpAddress: (a: ConnectionsRecord, b: ConnectionsRecord) => {
    return compareIpAddresses(a.virtualIpAddress, b.virtualIpAddress)
  },
  remoteIpAddress: (a: ConnectionsRecord, b: ConnectionsRecord) => {
    return compareIpAddresses(a.remoteIpAddress, b.remoteIpAddress)
  }
}

const { sortedItems } = useSort(
  computed(() => props.connectionsRecords),
  sortKey,
  sortDescending,
  sortFunctions
)

const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}

const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
  itemsPerPage: pageSize
})

// Format duration in seconds to human readable format
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const pad = (num: number) => String(num).padStart(2, '0')

  return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`
}
</script>

<template>
  <NeSortDropdown
    v-model:sortKey="sortKey"
    v-model:sortDescending="sortDescending"
    :label="t('sort.sort')"
    :options="[
      { id: 'account', label: t('standalone.openvpn_rw.history.account') },
      { id: 'startTime', label: t('standalone.openvpn_rw.history.start_time') },
      { id: 'endTime', label: t('standalone.openvpn_rw.history.end_time') },
      { id: 'duration', label: t('standalone.openvpn_rw.history.duration') },
      { id: 'virtualIpAddress', label: t('standalone.openvpn_rw.history.virtual_ip_address') },
      { id: 'remoteIpAddress', label: t('standalone.openvpn_rw.history.remote_ip_address') },
      { id: 'bytesReceived', label: t('standalone.openvpn_rw.history.bytes_received') },
      { id: 'bytesSent', label: t('standalone.openvpn_rw.history.bytes_sent') }
    ]"
    :openMenuAriaLabel="t('ne_dropdown.open_menu')"
    :sortByLabel="t('sort.sort_by')"
    :sortDirectionLabel="t('sort.direction')"
    :ascendingLabel="t('sort.ascending')"
    :descendingLabel="t('sort.descending')"
    class="xl:hidden"
  />
  <NeTable
    :sortKey="sortKey"
    :sortDescending="sortDescending"
    :ariaLabel="t('standalone.openvpn_rw.history.connections_table')"
    cardBreakpoint="xl"
    :skeletonColumns="5"
    :skeletonRows="5"
  >
    <NeTableHead>
      <NeTableHeadCell sortable columnKey="account" @sort="onSort">{{
        t('standalone.openvpn_rw.history.account')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="startTime" @sort="onSort">{{
        t('standalone.openvpn_rw.history.start_time')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="endTime" @sort="onSort">{{
        t('standalone.openvpn_rw.history.end_time')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="duration" @sort="onSort">{{
        t('standalone.openvpn_rw.history.duration')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="virtualIpAddress" @sort="onSort">{{
        t('standalone.openvpn_rw.history.virtual_ip_address')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="remoteIpAddress" @sort="onSort">{{
        t('standalone.openvpn_rw.history.remote_ip_address')
      }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.openvpn_rw.history.received_sent') }}</NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.startTime">
        <NeTableCell :data-label="t('standalone.openvpn_rw.history.account')">
          {{ item.account }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_rw.history.start_time')">
          {{
            item?.startTime ? formatDateLoc(new Date(Number(item.startTime) * 1000), 'PPpp') : '-'
          }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_rw.history.end_time')">
          {{ item?.endTime ? formatDateLoc(new Date(Number(item.endTime) * 1000), 'PPpp') : '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_rw.history.duration')">
          {{ item?.duration ? formatDuration(item.duration) : '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_rw.history.virtual_ip_address')">
          {{ item?.virtualIpAddress ? item.virtualIpAddress : '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_rw.history.remote_ip_address')">
          {{ item?.remoteIpAddress ? item.remoteIpAddress : '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.openvpn_rw.history.received_sent')">
          <div :class="['flex', 'flex-row', 'items-center']">
            <FontAwesomeIcon
              :icon="['fas', 'arrow-down']"
              class="mr-2 h-4 w-4"
              aria-hidden="true"
            />
            {{ item?.bytesReceived ? byteFormat1024(item.bytesReceived) : '-' }} /
            {{ item?.bytesSent ? byteFormat1024(item.bytesSent) : '-' }}
            <FontAwesomeIcon :icon="['fas', 'arrow-up']" class="ml-2 h-4 w-4" aria-hidden="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.connectionsRecords.length"
        :page-size="pageSize"
        :nav-pagination-label="t('ne_table.pagination')"
        :next-label="t('ne_table.go_to_next_page')"
        :previous-label="t('ne_table.go_to_previous_page')"
        :range-of-total-label="t('ne_table.of')"
        :page-size-label="t('ne_table.show')"
        @select-page="
            (page: number) => {
              currentPage = page
            }"
        @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
      />
    </template>
  </NeTable>
</template>
