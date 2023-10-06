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
}

async function fetchDnsRecords(): Promise<DnsRecord[]> {
  const dnsRecordsResponse = await ubusCall('ns.dns', 'list-records')
  return dnsRecordsResponse.data.records
}

function applyFilterToDnsRecords(records: DnsRecord[], filter: string) {
  return records.filter(
    (dnsRecord) =>
      dnsRecord.record.includes(filter) ||
      dnsRecord.ip.includes(filter) ||
      dnsRecord.name.includes(filter) ||
      dnsRecord.description.includes(filter)
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
        :initial-item="itemToEdit"
        @close="closeDrawer()"
        @add-edit-record="reloadItems()"
      />
    </template>
  </FilterableListItemLayout>
</template>
