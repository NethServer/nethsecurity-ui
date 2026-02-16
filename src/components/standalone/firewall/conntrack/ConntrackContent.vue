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
const notificationsStore = useNotificationsStore()

import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { onMounted, ref, computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faChain, faRefresh, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useRouteQuery } from '@vueuse/router'

const { t } = useI18n()

export type ConntrackLabels = 'netify-block' | 'netify-analyzed'

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
  labels?: ConntrackLabels[]
}

const isLoading = ref(false)
const conntrackRecords = ref<ConntrackRecord[]>([])
const error = ref({
  notificationDescription: '',
  notificationDetails: '',
  notificationTitle: ''
})
const filter = useRouteQuery('filter', '')
const showDeleteModal = ref(false)

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

function matchString(value: string | undefined, filter: string) {
  if (!value) {
    return false
  }
  return value?.toLowerCase().includes(filter.toLowerCase())
}

const filters: Array<(a: ConntrackRecord) => boolean> = [
  (record: ConntrackRecord) => matchString(record.source, filter.value),
  (record: ConntrackRecord) => matchString(record.destination, filter.value),
  (record: ConntrackRecord) => matchString(record.protocol, filter.value),
  (record: ConntrackRecord) => matchString(record.state, filter.value),
  (record: ConntrackRecord) => matchString(record.source_port, filter.value),
  (record: ConntrackRecord) => matchString(record.destination_port, filter.value),
  (record: ConntrackRecord) => matchString(record.id, filter.value),
  (record: ConntrackRecord) =>
    record.labels?.some((label) => matchString(label, filter.value)) ?? false
]

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
  return filter.value === ''
    ? conntrackRecords.value
    : conntrackRecords.value.filter((record) => filters.some((filter) => filter(record)))
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
    <div class="flex flex-wrap items-start gap-8">
      <p class="mr-auto max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.conntrack.conntrack_description') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <NeButton v-if="conntrackRecords.length > 0" kind="tertiary" size="lg" @click="deleteAll()">
          <template #prefix>
            <FontAwesomeIcon :icon="faTrash" aria-hidden="true" />
          </template>
          {{ t('standalone.conntrack.delete_all') }}
        </NeButton>
        <NeButton kind="secondary" size="lg" @click="fetchConntrack()">
          <template #prefix>
            <FontAwesomeIcon :icon="faRefresh" aria-hidden="true" />
          </template>
          {{ t('standalone.conntrack.refresh_page') }}
        </NeButton>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <NeTextInput v-model="filter" class="max-w-xs" :placeholder="t('common.filter')" />
      <NeButton kind="tertiary" :disabled="isLoading || !filter" @click="filter = ''">
        {{ t('common.clear_filter') }}
      </NeButton>
    </div>
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <NeSkeleton v-if="isLoading" :lines="10" size="lg" />
    <template v-else>
      <NeEmptyState
        v-if="conntrackRecords.length == 0"
        :title="t('standalone.conntrack.no_connection_found')"
        :icon="faChain"
      >
        <NeButton kind="tertiary" @click="fetchConntrack">
          <template #prefix>
            <FontAwesomeIcon :icon="faRefresh" aria-hidden="true" />
          </template>
          {{ t('standalone.conntrack.refresh_page') }}
        </NeButton>
      </NeEmptyState>
      <NeEmptyState
        v-else-if="filteredItems.length == 0"
        :title="t('standalone.conntrack.no_connection_found')"
        :description="t('standalone.conntrack.filter_change_suggestion')"
        :icon="faChain"
      >
        <NeButton kind="tertiary" @click="filter = ''">{{ t('common.clear_filter') }}</NeButton>
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
    :item-to-delete="selectedItem"
    @close="closeDeleteModal"
    @record-deleted="onRecordDeleted"
  />
</template>
