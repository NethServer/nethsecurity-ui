<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import UserConnectionsTable from './UserConnectionsTable.vue'
import { downloadFile, deleteFile } from '@/lib/standalone/fileUpload'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeEmptyState,
  NeTextInput,
  NeDropdownFilter,
  type FilterOption
} from '@nethesis/vue-components'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { ref, computed, watch } from 'vue'
import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { useRouteQuery } from '@vueuse/router'
import { refDebounced } from '@vueuse/core'
import { faClockRotateLeft } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()

export type ConnectionsRecord = {
  account: string
  bytesReceived?: number
  bytesSent?: number
  duration?: number
  endTime?: number
  remoteIpAddress: string
  startTime?: number
  virtualIpAddress: string
}

type ConnectionsHistoryResponse = {
  data: {
    connections: ConnectionsRecord[]
    current_page: number
    last_page: number
    per_page: number
    results: number
    total: number
    filters: {
      accounts: string[]
    }
  }
}

const props = defineProps<{
  instance: string
}>()

type RangeFilterOption = 'all' | 'last_3_months' | 'last_month' | 'last_week' | 'today'

const timeRangeFilterOptions: FilterOption[] = [
  { id: 'today', label: t('standalone.openvpn_rw.history.today') },
  { id: 'last_week', label: t('standalone.openvpn_rw.history.last_week') },
  { id: 'last_month', label: t('standalone.openvpn_rw.history.last_month') },
  { id: 'last_3_months', label: t('standalone.openvpn_rw.history.last_3_months') },
  { id: 'all', label: t('standalone.openvpn_rw.history.all') }
]

// route-persisted filters
const textFilter = useRouteQuery('q', '')
const textFilterDebounced = refDebounced(textFilter, 500)

const timeRangeFilter = useRouteQuery<string, RangeFilterOption[]>('time_range', 'all', {
  transform: {
    get: (val) => (val ? ([val] as RangeFilterOption[]) : ['all']),
    set: (val) => val[0] ?? 'all'
  }
})

const accountsFilter = useRouteQuery<string, string[]>('accounts', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})

const currentPage = ref(1)
const perPage = ref(10)

type SortableKeys =
  | 'account'
  | 'startTime'
  | 'endTime'
  | 'duration'
  | 'virtualIpAddress'
  | 'remoteIpAddress'
  | 'bytesReceived'
  | 'bytesSent'
const sortKey = useRouteQuery<SortableKeys>('sort', 'startTime')
const sortDescending = useRouteQuery<string, boolean>('descending', 'true', {
  transform: {
    get: (val) => val == 'true',
    set: (val) => val.toString()
  }
})

// reset page when filters change
watch(textFilterDebounced, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
})

watch(timeRangeFilter, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
})

watch(accountsFilter, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
})

watch(perPage, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
})

const { data, isError, error, isPending, isSuccess } = useQuery({
  queryKey: [
    'ovpnrw',
    'connection-history',
    textFilterDebounced,
    timeRangeFilter,
    accountsFilter,
    perPage,
    currentPage,
    sortKey,
    sortDescending
  ],
  queryFn: async () =>
    ubusCall<ConnectionsHistoryResponse>('ns.ovpnrw', 'connection-history', {
      instance: props.instance,
      q: textFilterDebounced.value.toLowerCase(),
      time_range: timeRangeFilter.value[0],
      accounts: accountsFilter.value,
      page: currentPage.value,
      per_page: perPage.value,
      sort_by: sortKey.value,
      desc: sortDescending.value
    }),
  placeholderData: keepPreviousData,
  select: (res) => res.data,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  refetchInterval: false,
  retry: false
})

watch(data, (newData) => {
  if (newData != undefined && currentPage.value > newData.last_page) {
    currentPage.value = newData.last_page
  }
})

const accountFilterOptions = computed<FilterOption[]>(() => {
  return (
    data.value?.filters.accounts.map((account) => ({
      id: account,
      label: account
    })) ?? []
  )
})

// clean error object
function cleanError() {
  downloadError.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
}

// clear filters
function clearFilters() {
  textFilter.value = ''
  timeRangeFilter.value = ['all']
  accountsFilter.value = []
}

// download all history from csv file
const downloadError = ref({
  notificationDescription: '',
  notificationDetails: '',
  notificationTitle: ''
})

async function downloadAllHistory() {
  cleanError()
  try {
    const res = await ubusCall('ns.ovpnrw', 'connection-history-csv', {
      instance: props.instance,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' // get the timezone of the browser
    })
    if (res?.data?.csv_path) {
      //remove prefix /var/run/ns-api-server/downloads/
      res.data.csv_path = res.data.csv_path.replace('/var/run/ns-api-server/downloads/', '')
      const file = await downloadFile(res.data.csv_path)
      const fileURL = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = fileURL
      link.download = res.data.csv_path.replace('.csv', '') + '-' + Date.now().toString() + '.csv'
      link.click()
      await deleteFile(res.data.csv_path)
    }
  } catch (exception: any) {
    downloadError.value.notificationTitle = t(
      'standalone.openvpn_rw.history.cannot_download_history'
    )
    downloadError.value.notificationDescription = t(getAxiosErrorMessage(exception))
    downloadError.value.notificationDetails = exception.toString()
  }
}
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="mb-4 flex flex-row justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.openvpn_rw.history.connection_history_description') }}
      </p>
      <div class="shrink-0">
        <NeButton
          v-if="isSuccess && data!.results > 0"
          kind="secondary"
          size="lg"
          class="ml-4 shrink-0"
          @click="downloadAllHistory()"
        >
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'fa-circle-arrow-down']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('standalone.openvpn_rw.history.download_history') }}
        </NeButton>
      </div>
    </div>
    <div v-if="data?.total !== 0" class="flex items-center gap-4">
      <NeTextInput
        v-model="textFilter"
        class="max-w-xs"
        :is-search="true"
        :placeholder="t('common.filter')"
      />
      <NeDropdownFilter
        v-model="timeRangeFilter"
        kind="radio"
        :label="t('standalone.openvpn_rw.history.time_range')"
        :options="timeRangeFilterOptions"
        :clear-search-label="t('ne_dropdown_filter.clear_search')"
        :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
        :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
        :no-options-label="t('ne_dropdown_filter.no_options')"
        :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
      />
      <NeDropdownFilter
        v-model="accountsFilter"
        kind="checkbox"
        :label="t('standalone.openvpn_rw.history.accounts')"
        :options="accountFilterOptions"
        :clear-search-label="t('ne_dropdown_filter.clear_search')"
        :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
        :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
        :show-options-filter="true"
        :no-options-label="t('ne_dropdown_filter.no_options')"
        :options-filter-placeholder="t('standalone.openvpn_rw.history.filter_accounts')"
        :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
      />
      <NeButton kind="tertiary" :disabled="isPending" @click="clearFilters">
        {{ t('standalone.openvpn_rw.history.reset_filters') }}
      </NeButton>
    </div>
    <NeInlineNotification
      v-if="downloadError.notificationDescription"
      kind="error"
      :title="downloadError.notificationTitle"
      :description="downloadError.notificationDescription"
    >
      <template v-if="downloadError.notificationDetails" #details>
        {{ downloadError.notificationDetails }}
      </template>
    </NeInlineNotification>
    <NeInlineNotification
      v-if="isError"
      kind="error"
      :title="t('error.cannot_retrieve_ovpn_rw_connection_history')"
      :description="t(getAxiosErrorMessage(error))"
    />
    <NeSkeleton v-if="isPending" :lines="10" size="lg" />
    <UserConnectionsTable
      v-if="isSuccess && data!.total > 0"
      :connections-records="data!.connections"
      :current-page="currentPage"
      :total-rows="data!.results"
      :page-size="perPage"
      :sort-key="sortKey"
      :sort-descending="sortDescending"
      @select-page="
        (page: number) => {
          currentPage = page
        }
      "
      @select-page-size="
        (size: number) => {
          perPage = size
        }
      "
      @sort="
        ({ key, descending }: { key: string; descending: boolean }) => {
          sortKey = key as typeof sortKey
          sortDescending = descending
        }
      "
      @clear-filters="clearFilters"
    />
    <NeEmptyState
      v-if="data?.total === 0"
      :title="t('standalone.openvpn_rw.history.no_connections_found')"
      :icon="faClockRotateLeft"
    />
  </div>
</template>
