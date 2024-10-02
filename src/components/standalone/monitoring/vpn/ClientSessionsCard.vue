<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeCard,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeEmptyState,
  formatDateLoc,
  getAxiosErrorMessage,
  sortByProperty
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'

export type ClientSession = {
  common_name: string
  virtual_ip_addr: string
  remote_ip_addr: string
  start_time: number
  duration: number
  bytes_received: number
  bytes_sent: number
}

const props = defineProps<{
  ovpnInstance: string
  day: string
}>()

const { t } = useI18n()

const clientSessions = ref<ClientSession[]>([])
const pageSize = ref(5)
const { currentPage, paginatedItems } = useItemPagination(() => clientSessions.value, {
  itemsPerPage: pageSize
})
const loading = ref(false)
const error = ref('')
const errorDescription = ref('')

onMounted(() => {
  getClientSessions()
})

async function getClientSessions() {
  loading.value = true
  error.value = ''
  errorDescription.value = ''

  try {
    const res = await ubusCall('ns.report', 'ovpnrw-clients-by-day', {
      instance: props.ovpnInstance,
      day: props.day
    })
    clientSessions.value = res.data.clients.sort(sortByProperty('start_time')).reverse()
  } catch (err: any) {
    console.error(err)
    error.value = t('error.cannot_retrieve_vpn_client_sessions')
    errorDescription.value = t(getAxiosErrorMessage(err))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NeCard :title="t('standalone.real_time_monitor.daily_connections')">
    <NeTable
      :ariaLabel="t('standalone.real_time_monitor.daily_connections')"
      cardBreakpoint="sm"
      class="mt-2"
    >
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.account') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.connected_since') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <!-- empty state -->
        <NeTableRow v-if="!clientSessions.length">
          <NeTableCell colspan="2">
            <NeEmptyState
              :title="t('standalone.real_time_monitor.no_sessions')"
              :icon="['fas', 'table']"
              class="bg-white dark:bg-gray-950"
            />
          </NeTableCell>
        </NeTableRow>
        <NeTableRow v-else v-for="(item, index) in paginatedItems" :key="index">
          <NeTableCell :data-label="t('standalone.real_time_monitor.account')">
            {{ item.common_name }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.real_time_monitor.connected_since')">
            {{ formatDateLoc(new Date(Number(item.start_time) * 1000), 'PPpp') || '-' }}
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="clientSessions.length"
          :page-size="pageSize"
          :page-sizes="[5, 10]"
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
  </NeCard>
</template>
