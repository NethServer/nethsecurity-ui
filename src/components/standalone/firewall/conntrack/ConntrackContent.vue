<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useI18n } from 'vue-i18n'
import FilterableListItemConntrack from '@/components/standalone//firewall/conntrack/FilterableListItemConntrack.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import ConntrackRecordsTable from '@/components/standalone/firewall/conntrack/ConntrackRecordsTable.vue'
import DeleteConntrackRecordModal from '@/components/standalone/firewall/conntrack/DeleteConntrackRecordModal.vue'
import { NeHeading } from '@nethesis/vue-components'
import { byteFormat1024 } from '@nethesis/vue-components'
import { onMounted } from 'vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

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
  statistics?: string
}

onMounted(() => {
 fetchConntrack()
})

async function fetchConntrack(): Promise<ConntrackRecord[]> {
  const ConntrackRecordsResponse = await ubusCall('ns.conntrack', 'list')
  // Function to update source and destination properties
  ConntrackRecordsResponse.data = updateConntrackRecords(ConntrackRecordsResponse.data.data)

  return ConntrackRecordsResponse.data
}

function updateConntrackRecords(records: ConntrackRecord[]) {
  return records.map((record) => {
    // translate the source and destination with the port
    if (record.source_port) {
      record.source = record.source + ':' + record.source_port
    }
    if (record.destination_port) {
      record.destination = record.destination + ':' + record.destination_port
    }
    // translate the timeout
    if (record.timeout) {
      record.timeout = record.timeout + 's'
    }
    // translate statistics download and upload
    record.statistics =
      byteFormat1024(record.source_stats.bytes) +
      ' / ' +
      byteFormat1024(record.destination_stats.bytes)
    // translate the protocol
    if (record.protocol) {
      record.protocol = record.protocol.toUpperCase()
    }
    return record
  })
}

function applyFilterToConntrackRecords(records: ConntrackRecord[], filter: string) {
  const lowerCaseFilter = filter.toLowerCase()
  return records.filter(
    (ConntrackRecord) =>
      ConntrackRecord.source.toLowerCase().includes(lowerCaseFilter) ||
      ConntrackRecord.destination.toLowerCase().includes(lowerCaseFilter) ||
      ConntrackRecord.protocol.toLowerCase().includes(lowerCaseFilter) ||
      (ConntrackRecord.state ?? '').toLowerCase().includes(lowerCaseFilter) ||
      (ConntrackRecord.source_port ?? '').toLowerCase().includes(lowerCaseFilter) ||
      (ConntrackRecord.destination_port ?? '').toLowerCase().includes(lowerCaseFilter)
  )
}

async function getUciChanges() {
  await uciChangesStore.getChanges()
}
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.conntrack.title') }}</NeHeading>
  <FilterableListItemConntrack
    :fetch-items-function="fetchConntrack"
    :fetch-error-notification-title="t('error.cannot_retrieve_conntrack_records')"
    :apply-filter-to-items-function="applyFilterToConntrackRecords"
    :no-items-found-message="t('standalone.conntrack.no_connection_found')"
    :no-filtered-items-found-message="t('standalone.conntrack.no_connection_found')"
    :no-filtered-items-found-description="t('standalone.conntrack.filter_change_suggestion')"
    @reload-items="getUciChanges()"
  >
    <template #item-list-view="{ items, openDeleteModal }">
      <ConntrackRecordsTable :conntrack-records="items" @record-delete="openDeleteModal" />
    </template>
    <template #delete-item-modal="{ isModalShown, closeModal, itemToDelete, reloadItems }">
      <DeleteConntrackRecordModal
        :visible="isModalShown"
        @close="closeModal()"
        @record-deleted="reloadItems()"
        :item-to-delete="itemToDelete"
      />
    </template>
  </FilterableListItemConntrack>
</template>
