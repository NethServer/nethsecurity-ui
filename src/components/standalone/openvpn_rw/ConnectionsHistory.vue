<!--
  Copyright (C) 2024 Nethesis S.r.l.
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
import { onMounted, ref, computed, watch } from 'vue'

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

const isLoading = ref(false)
const connectionsRecords = ref<ConnectionsRecord[]>([])
const error = ref({
  notificationDescription: '',
  notificationDetails: '',
  notificationTitle: ''
})
const textFilter = ref('')

const props = defineProps<{
  instance: string
}>()

// filter time range to populate NeDropdownFilter timeRangeFilter options
const timeRangeFilter = ref<('all' | 'last_3_months' | 'last_month' | 'last_week' | 'today')[]>([
  'today'
])
const timeRangeFilterOptions = ref<FilterOption[]>([
  {
    id: 'today',
    label: t('standalone.openvpn_rw.history.today')
  },
  {
    id: 'last_week',
    label: t('standalone.openvpn_rw.history.last_week')
  },
  {
    id: 'last_month',
    label: t('standalone.openvpn_rw.history.last_month')
  },
  {
    id: 'last_3_months',
    label: t('standalone.openvpn_rw.history.last_3_months')
  },
  {
    id: 'all',
    label: t('standalone.openvpn_rw.history.all')
  }
])

// filter accounts to populate NeDropdownFilter accountsFilter options
const accountsFilter = ref<Array<any>>([])

// Computed property to get unique accounts within the selected time range
const uniqueAccounts = computed(() => {
  const filteredRecords = applyFilterToConntrackRecords(
    connectionsRecords.value,
    '',
    timeRangeFilter.value[0],
    []
  )
  return Array.from(new Set(filteredRecords.map((record) => record.account))).sort((a, b) =>
    a.localeCompare(b)
  )
})

const accountFilterOptions = computed<FilterOption[]>(() => {
  return uniqueAccounts.value.map((account) => ({
    id: account,
    label: account
  }))
})

// filter items based on timeRange and accountsFilter
function applyFilterToConntrackRecords(
  records: ConnectionsRecord[],
  textFilter: string,
  timeRange: string,
  accountsFilter: string[]
) {
  const lowerCaseFilter = textFilter.toLowerCase()
  const now = new Date()
  let startDate: Date | null = null

  if (timeRange === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (timeRange === 'last_week') {
    startDate = new Date(now)
    startDate.setDate(now.getDate() - 7)
  } else if (timeRange === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  } else if (timeRange === 'last_3_months') {
    startDate = new Date(now)
    startDate.setMonth(now.getMonth() - 3)
    startDate.setDate(1) // Set to the start of the month
  } else if (timeRange === 'all') {
    startDate = null
  }

  return records.filter((connectionsRecord: ConnectionsRecord) => {
    // Assuming startTime is in seconds, convert to ms
    const recordDate = connectionsRecord.startTime
      ? new Date(connectionsRecord.startTime * 1000)
      : new Date(0)

    const matchesTextFilter =
      connectionsRecord.account.toLowerCase().includes(lowerCaseFilter) ||
      connectionsRecord.remoteIpAddress.toLowerCase().includes(lowerCaseFilter) ||
      connectionsRecord.virtualIpAddress.toLowerCase().includes(lowerCaseFilter)

    const matchesTimeRangeFilter = startDate ? recordDate >= startDate : true

    const matchesAccountFilter =
      accountsFilter.length === 0 || accountsFilter.includes(connectionsRecord.account)

    return matchesTextFilter && matchesTimeRangeFilter && matchesAccountFilter
  })
}

// filter items
const filteredItems = computed(() => {
  if (
    ['all', 'today', 'last_week', 'last_month', 'last_3_months'].includes(timeRangeFilter.value[0])
  ) {
    return applyFilterToConntrackRecords(
      connectionsRecords.value,
      textFilter.value,
      timeRangeFilter.value[0],
      accountsFilter.value
    )
  } else {
    return connectionsRecords.value
  }
})

// clean error object
function cleanError() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
}

// clear filters
function clearFilters() {
  textFilter.value = ''
  timeRangeFilter.value = ['today']
  accountsFilter.value = []
}

// download all history from csv file
async function downloadAllHistory() {
  cleanError()
  try {
    let res = await ubusCall('ns.ovpnrw', 'connection-history-csv', {
      instance: props.instance,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' // get the timezone of the browser
    })
    if (res?.data?.csv_path) {
      //remove prefix /var/run/ns-api-server/downloads/
      res.data.csv_path = res.data.csv_path.replace('/var/run/ns-api-server/downloads/', '')
      const file = await downloadFile(res.data.csv_path)
      const fileURL = URL.createObjectURL(file)
      let link = document.createElement('a')
      link.href = fileURL
      link.download = res.data.csv_path.replace('.csv', '') + '-' + Date.now().toString() + '.csv'
      link.click()

      await deleteFile(res.data.csv_path)
    }
  } catch (exception: any) {
    error.value.notificationTitle = t('standalone.openvpn_rw.history.cannot_download_history')
    error.value.notificationDescription = t(getAxiosErrorMessage(exception))
    error.value.notificationDetails = exception.toString()
  }
}

// fetch connection history
async function fetchConnectionHistory() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  try {
    isLoading.value = true
    connectionsRecords.value = (
      await ubusCall('ns.ovpnrw', 'connection-history', {
        instance: props.instance,
        time_interval: 'all'
      })
    ).data
  } catch (err: any) {
    error.value.notificationTitle = t('standalone.openvpn_rw.history.cannot_fetch_history')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isLoading.value = false
  }
}

// fetch connection history on component mount
onMounted(() => {
  fetchConnectionHistory()
})

// when timeRangeFilter changes, reset to [] accountsFilter
watch(timeRangeFilter, () => {
  accountsFilter.value = []
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="mb-4 flex flex-row justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.openvpn_rw.history.connection_history_description') }}
      </p>
      <div class="shrink-0">
        <NeButton
          v-if="connectionsRecords.length > 0"
          kind="secondary"
          size="lg"
          @click="downloadAllHistory()"
          class="ml-4 shrink-0"
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
    <div v-if="connectionsRecords.length > 0" class="flex items-center gap-4">
      <NeTextInput
        class="max-w-xs"
        :isSearch="true"
        :placeholder="t('common.filter')"
        v-model="textFilter"
      />
      <NeDropdownFilter
        v-model="timeRangeFilter"
        kind="radio"
        :label="t('standalone.openvpn_rw.history.time_range')"
        :options="timeRangeFilterOptions"
        :clearFilterLabel="t('ne_dropdown_filter.clear_selection')"
        :openMenuAriaLabel="t('ne_dropdown_filter.open_filter')"
      />
      <NeDropdownFilter
        v-model="accountsFilter"
        kind="checkbox"
        :label="t('standalone.openvpn_rw.history.accounts')"
        :options="accountFilterOptions"
        :clearFilterLabel="t('ne_dropdown_filter.clear_selection')"
        :openMenuAriaLabel="t('ne_dropdown_filter.open_filter')"
        :showOptionsFilter="true"
        :noOptionsLabel="t('ne_dropdown_filter.no_options')"
        :optionsFilterPlaceholder="t('standalone.openvpn_rw.history.filter_accounts')"
        :moreOptionsHiddenLabel="t('ne_dropdown_filter.more_options_hidden')"
      />
      <NeButton kind="tertiary" @click="clearFilters" :disabled="isLoading">
        {{ t('standalone.openvpn_rw.history.reset_filters') }}
      </NeButton>
    </div>
    <NeInlineNotification
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationDescription"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <NeSkeleton v-if="isLoading" :lines="10" size="lg" />
    <template v-else>
      <NeEmptyState
        v-if="connectionsRecords.length == 0"
        :title="t('standalone.openvpn_rw.history.no_connections_found')"
        :icon="['fas', 'clock-rotate-left']"
      >
      </NeEmptyState>
      <NeEmptyState
        v-else-if="filteredItems.length == 0"
        :title="t('standalone.openvpn_rw.history.no_connections_found')"
        :description="t('standalone.openvpn_rw.history.filter_change_suggestion')"
        :icon="['fas', 'clock-rotate-left']"
      >
      </NeEmptyState>
      <UserConnectionsTable v-if="filteredItems.length > 0" :connectionsRecords="filteredItems" />
    </template>
  </div>
</template>
