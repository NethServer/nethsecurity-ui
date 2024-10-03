<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useI18n } from 'vue-i18n'
import FilterableListItemLayout from '../FilterableListItemLayout.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import DnsRecordsTable from './DnsRecordsTable.vue'
import CreateOrEditDnsRecordDrawer from './CreateOrEditDnsRecordDrawer.vue'
import DeleteDnsRecordModal from './DeleteDnsRecordModal.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

export type DnsRecord = {
  record: string
  ip: string
  name: string
  description: string
  wildcard: boolean
  used: boolean
  matches: string[]
}

async function fetchDnsRecords(): Promise<DnsRecord[]> {
  const dnsRecordsResponse = await ubusCall('ns.dns', 'list-records')
  return dnsRecordsResponse.data.records
}

function applyFilterToDnsRecords(records: DnsRecord[], filter: string) {
  const lowerCaseFilter = filter.toLowerCase()
  return records.filter(
    (dnsRecord) =>
      dnsRecord.record.toLowerCase().includes(lowerCaseFilter) ||
      dnsRecord.ip.toLowerCase().includes(lowerCaseFilter) ||
      dnsRecord.name.toLowerCase().includes(lowerCaseFilter) ||
      dnsRecord.description.toLowerCase().includes(lowerCaseFilter)
  )
}

async function getUciChanges() {
  await uciChangesStore.getChanges()
}
</script>

<template>
  <FilterableListItemLayout
    :fetch-items-function="fetchDnsRecords"
    :add-item-button-label="t('standalone.dns_dhcp.add_dns_record')"
    :fetch-error-notification-title="t('error.cannot_retrieve_dns_records')"
    :apply-filter-to-items-function="applyFilterToDnsRecords"
    :readonly="false"
    :no-items-found-message="t('standalone.dns_dhcp.no_dns_record_configured')"
    :no-filtered-items-found-message="t('standalone.dns_dhcp.no_dns_record_found')"
    :no-filtered-items-found-description="t('standalone.dns_dhcp.filter_change_suggestion')"
    :description="t('standalone.dns_dhcp.dns_records_description')"
    @reload-items="getUciChanges()"
  >
    <template #item-list-view="{ items, openDeleteModal, openEditItemDrawer }">
      <DnsRecordsTable
        :dns-records="items"
        @record-delete="openDeleteModal"
        @record-edit="openEditItemDrawer"
      />
    </template>
    <template #delete-item-modal="{ isModalShown, closeModal, itemToDelete, reloadItems }">
      <DeleteDnsRecordModal
        :visible="isModalShown"
        @close="closeModal()"
        @record-deleted="reloadItems()"
        :item-to-delete="itemToDelete"
      />
    </template>
    <template #create-edit-item-drawer="{ isDrawerShown, itemToEdit, closeDrawer, reloadItems }">
      <CreateOrEditDnsRecordDrawer
        :is-shown="isDrawerShown"
        :item-to-edit="itemToEdit"
        @close="closeDrawer()"
        @add-edit-record="reloadItems()"
      />
    </template>
  </FilterableListItemLayout>
</template>
