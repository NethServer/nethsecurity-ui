<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import ConntrackRecordsTable from '@/components/standalone/firewall/conntrack/ConntrackRecordsTable.vue'
import DeleteConntrackRecordModal from '@/components/standalone/firewall/conntrack/DeleteConntrackRecordModal.vue'
import {
  NeHeading,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeEmptyState,
  NeTextInput
} from '@nethesis/vue-components'
import { useNotificationsStore } from '@/stores/notifications'
import NeFilter, { type FilterOption } from '@/components/NeFilter.vue'

const notificationsStore = useNotificationsStore()

import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { onMounted, ref, computed } from 'vue'

const { t } = useI18n()

export type ConntrackRecord = {
  destination: string
  destination_port?: string
  destination_stats: {
    bytes: string
    packets: string
  }
  id: string
  protocol: string
  source: string
  source_port?: string
  source_stats: {
    bytes: string
    packets: string
  }
  state?: string
  timeout: string
}

const isLoading = ref(false)
const conntrackRecords = ref<ConntrackRecord[]>([])
const error = ref({
  notificationDescription: '',
  notificationDetails: '',
  notificationTitle: ''
})
const filter = ref('')
const protocolFilter = ref<string[]>([])
const showDeleteModal = ref(false)

const protocolFilterOptions: FilterOption[] = [
  { id: 'tcp', label: 'TCP' },
  { id: 'udp', label: 'UDP' },
  { id: 'icmp', label: 'ICMP' }
  // { id: 'test1', label: 'Test 1' },
  // { id: 'test2', label: 'Test 2' },
  // { id: 'test3', label: 'Test 3' },
  // { id: 'test4', label: 'Test 4' },
  // { id: 'test5', label: 'Test 5' },
  // { id: 'test6', label: 'Test 6' },
  // { id: 'test7', label: 'Test 7' },
  // { id: 'test8', label: 'Test 8' },
  // { id: 'test9', label: 'Test 9' },
  // { id: 'test10', label: 'Test 10' },
  // { id: 'test11', label: 'Test 11' },
  // { id: 'test12', label: 'Test 12' },
  // { id: 'test13', label: 'Test 13' },
  // { id: 'test14', label: 'Test 14' },
  // { id: 'test15', label: 'Test 15' },
  // { id: 'test16', label: 'Test 16' },
  // { id: 'test17', label: 'Test 17' },
  // { id: 'test18', label: 'Test 18' },
  // { id: 'test19', label: 'Test 19' },
  // { id: 'test20', label: 'Test 20' },
  // { id: 'test99999999', label: 'Test 99999999999912345' }
]

onMounted(() => {
  fetchConntrack()
})

const selectedItem = ref<ConntrackRecord>()

async function fetchConntrack() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  try {
    isLoading.value = true
    conntrackRecords.value = (await ubusCall('ns.conntrack', 'list')).data.data
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isLoading.value = false
  }
}
function applyFilterToConntrackRecords() {
  const lowerCaseFilter = filter.value.toLowerCase()
  const textFiltered = conntrackRecords.value.filter(
    (ConntrackRecord) =>
      ConntrackRecord.source.toLowerCase().includes(lowerCaseFilter) ||
      ConntrackRecord.destination.toLowerCase().includes(lowerCaseFilter) ||
      ConntrackRecord.protocol.toLowerCase().includes(lowerCaseFilter) ||
      (ConntrackRecord.state ?? '').toLowerCase().includes(lowerCaseFilter) ||
      (ConntrackRecord.source_port ?? '').toLowerCase().includes(lowerCaseFilter) ||
      (ConntrackRecord.destination_port ?? '').toLowerCase().includes(lowerCaseFilter)
  )

  return textFiltered.filter(
    (record) => !protocolFilter.value.length || protocolFilter.value.includes(record.protocol)
  )
}

function deleteAll() {
  selectedItem.value = undefined
  showDeleteModal.value = true
}

function openDeleteModal(itemToDelete: ConntrackRecord) {
  selectedItem.value = itemToDelete
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
}

const filteredItems = computed(() => {
  return applyFilterToConntrackRecords()
})

function onRecordDeleted() {
  if (selectedItem.value) {
    // show toast notification
    setTimeout(() => {
      notificationsStore.createNotification({
        title: t('standalone.conntrack.conntrack_record_removed'),
        kind: 'success'
      })
    }, 500)
  } else {
    // show toast notification
    setTimeout(() => {
      notificationsStore.createNotification({
        title: t('standalone.conntrack.conntrack_record_all_removed'),
        kind: 'success'
      })
    }, 500)
  }

  closeDeleteModal()
  fetchConntrack()
}
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.conntrack.title') }}</NeHeading>
  <div class="flex flex-col gap-y-6">
    <div class="mb-4 flex flex-row justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.conntrack.conntrack_description') }}
      </p>
      <div class="shrink-0">
        <NeButton
          v-if="conntrackRecords.length > 0"
          kind="tertiary"
          size="lg"
          @click="deleteAll()"
          class="ml-4 shrink-0"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'trash']" aria-hidden="true" />
          </template>
          {{ t('standalone.conntrack.delete_all') }}
        </NeButton>
        <NeButton kind="secondary" size="lg" @click="fetchConntrack()" class="ml-2 shrink-0">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'fa-refresh']" aria-hidden="true" />
          </template>
          {{ t('standalone.conntrack.refresh_page') }}</NeButton
        >
      </div>
    </div>
    <div class="flex items-center gap-4">
      <NeTextInput class="max-w-xs" :placeholder="t('common.filter')" v-model="filter" />
      <NeFilter
        v-model="protocolFilter"
        label="Protocol"
        kind="checkbox"
        :options="protocolFilterOptions"
        clearFilterLabel="Clear filter"
        openMenuAriaLabel="Open protocol filter"
      />
      <NeButton kind="tertiary" @click="filter = ''" :disabled="isLoading || !filter">
        {{ t('common.clear_filter') }}
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
        v-if="conntrackRecords.length == 0"
        :title="t('standalone.conntrack.no_connection_found')"
        :icon="['fas', 'chain']"
      >
        <NeButton kind="tertiary" @click="fetchConntrack">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'fa-refresh']" aria-hidden="true" /> </template
          >{{ t('standalone.conntrack.refresh_page') }}</NeButton
        >
      </NeEmptyState>
      <NeEmptyState
        v-else-if="filteredItems.length == 0"
        :title="t('standalone.conntrack.no_connection_found')"
        :description="t('standalone.conntrack.filter_change_suggestion')"
        :icon="['fas', 'chain']"
      >
        <NeButton kind="tertiary" @click="filter = ''"> {{ t('common.clear_filter') }}</NeButton>
      </NeEmptyState>
      <ConntrackRecordsTable
        v-if="filteredItems.length > 0"
        :conntrack-records="filteredItems"
        @delete="openDeleteModal"
      />
    </template>
  </div>
  <DeleteConntrackRecordModal
    :visible="showDeleteModal"
    @close="closeDeleteModal"
    @record-deleted="onRecordDeleted"
    :item-to-delete="selectedItem"
  />
</template>
