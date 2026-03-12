<!--
  Copyright (C) 2026 Nethesis S.r.l.
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
  formatDateLoc,
  byteFormat1024,
  NeSortDropdown,
  NeEmptyState,
  NeButton
} from '@nethesis/vue-components'
import type { ConnectionsRecord } from './ConnectionsHistory.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { SortEvent } from '@nethesis/vue-components'
import { faArrowDown, faArrowUp, faTable } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()

const props = defineProps<{
  connectionsRecords: ConnectionsRecord[]
  currentPage: number
  totalRows: number
  pageSize: number
  sortKey: string
  sortDescending: boolean
}>()

const emit = defineEmits<{
  (e: 'select-page', page: number): void
  (e: 'select-page-size', size: number): void
  (e: 'sort', payload: { key: string; descending: boolean }): void
  (e: 'clear-filters'): void
}>()

function onSort(payload: SortEvent) {
  emit('sort', { key: payload.key, descending: payload.descending })
}

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
    v-if="props.connectionsRecords.length > 0"
    :sort-key="props.sortKey"
    :sort-descending="props.sortDescending"
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
    :open-menu-aria-label="t('ne_dropdown.open_menu')"
    :sort-by-label="t('sort.sort_by')"
    :sort-direction-label="t('sort.direction')"
    :ascending-label="t('sort.ascending')"
    :descending-label="t('sort.descending')"
    class="xl:hidden"
    @sort="onSort"
  />
  <NeTable
    :sort-key="props.sortKey"
    :sort-descending="props.sortDescending"
    :aria-label="t('standalone.openvpn_rw.history.connections_table')"
    card-breakpoint="xl"
    :skeleton-columns="5"
    :skeleton-rows="5"
  >
    <NeTableHead>
      <NeTableHeadCell
        :sortable="props.connectionsRecords.length > 0"
        column-key="account"
        @sort="onSort"
        >{{ t('standalone.openvpn_rw.history.account') }}</NeTableHeadCell
      >
      <NeTableHeadCell
        :sortable="props.connectionsRecords.length > 0"
        column-key="startTime"
        @sort="onSort"
        >{{ t('standalone.openvpn_rw.history.start_time') }}</NeTableHeadCell
      >
      <NeTableHeadCell
        :sortable="props.connectionsRecords.length > 0"
        column-key="endTime"
        @sort="onSort"
        >{{ t('standalone.openvpn_rw.history.end_time') }}</NeTableHeadCell
      >
      <NeTableHeadCell
        :sortable="props.connectionsRecords.length > 0"
        column-key="duration"
        @sort="onSort"
        >{{ t('standalone.openvpn_rw.history.duration') }}</NeTableHeadCell
      >
      <NeTableHeadCell
        :sortable="props.connectionsRecords.length > 0"
        column-key="virtualIpAddress"
        @sort="onSort"
        >{{ t('standalone.openvpn_rw.history.virtual_ip_address') }}</NeTableHeadCell
      >
      <NeTableHeadCell
        :sortable="props.connectionsRecords.length > 0"
        column-key="remoteIpAddress"
        @sort="onSort"
        >{{ t('standalone.openvpn_rw.history.remote_ip_address') }}</NeTableHeadCell
      >
      <NeTableHeadCell>{{ t('standalone.openvpn_rw.history.received_sent') }}</NeTableHeadCell>
    </NeTableHead>
    <NeTableBody v-if="props.connectionsRecords.length > 0">
      <NeTableRow v-for="item in props.connectionsRecords" :key="item.startTime">
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
            <FontAwesomeIcon :icon="faArrowDown" class="mr-2 h-4 w-4" aria-hidden="true" />
            {{ item?.bytesReceived ? byteFormat1024(item.bytesReceived) : '-' }} /
            {{ item?.bytesSent ? byteFormat1024(item.bytesSent) : '-' }}
            <FontAwesomeIcon :icon="faArrowUp" class="ml-2 h-4 w-4" aria-hidden="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <NeTableBody v-else>
      <NeTableRow>
        <NeTableCell colspan="10">
          <NeEmptyState
            class="bg-white dark:bg-gray-950"
            :description="t('standalone.openvpn_rw.history.no_connections_found_description')"
            :icon="faTable"
            :title="t('standalone.openvpn_rw.history.no_connections_found')"
          >
            <NeButton @click="emit('clear-filters')">
              {{ t('common.clear_filters') }}
            </NeButton>
          </NeEmptyState>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="totalRows"
        :page-size="pageSize"
        :nav-pagination-label="t('ne_table.pagination')"
        :next-label="t('ne_table.go_to_next_page')"
        :previous-label="t('ne_table.go_to_previous_page')"
        :range-of-total-label="t('ne_table.of')"
        :page-size-label="t('ne_table.show')"
        @select-page="(page: number) => emit('select-page', page)"
        @select-page-size="(size: number) => emit('select-page-size', size)"
      />
    </template>
  </NeTable>
</template>
