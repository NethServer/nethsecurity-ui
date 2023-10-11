<script setup lang="ts">
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useI18n } from 'vue-i18n'
import FilterableListItemLayout from '../FilterableListItemLayout.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import LeasesTable from './LeasesTable.vue'
import DeleteStaticLeaseModal from './DeleteStaticLeaseModal.vue'
import CreateOrEditStaticLeaseDrawer from './CreateOrEditStaticLeaseDrawer.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

export type StaticLease = {
  lease: string
  macaddr: string
  ipaddr: string
  hostname: string
  interface: string
  device: string
  description: string
}

async function fetchStaticLeases(): Promise<StaticLease[]> {
  const staticLeasesResponse = await ubusCall('ns.dhcp', 'list-static-leases')
  return staticLeasesResponse.data.leases
}

function applyFilterToStaticLeases(staticLeases: StaticLease[], filter: string) {
  return staticLeases.filter(
    (staticLease) =>
      staticLease.hostname.includes(filter) ||
      staticLease.ipaddr.includes(filter) ||
      staticLease.macaddr.includes(filter) ||
      staticLease.interface.includes(filter)
  )
}

async function getUciChanges() {
  await uciChangesStore.getChanges()
}
</script>

<template>
  <FilterableListItemLayout
    :fetch-items-function="fetchStaticLeases"
    :add-item-button-label="t('standalone.dns_dhcp.add_reservation')"
    :fetch-error-notification-title="t('error.cannot_retrieve_reservations')"
    :apply-filter-to-items-function="applyFilterToStaticLeases"
    :readonly="false"
    :no-items-found-message="t('standalone.dns_dhcp.no_reservation_configured')"
    :no-filtered-items-found-message="t('standalone.dns_dhcp.no_reservation_found')"
    :no-filtered-items-found-description="t('standalone.dns_dhcp.filter_change_suggestion')"
    :description="t('standalone.dns_dhcp.static_leases_description')"
    @reload-items="getUciChanges()"
  >
    <template #item-list-view="{ items, openDeleteModal, openEditItemDrawer }">
      <LeasesTable
        :leases="items"
        :show-dynamic-leases="false"
        @lease-delete="openDeleteModal"
        @lease-edit="openEditItemDrawer"
      />
    </template>
    <template #delete-item-modal="{ isModalShown, closeModal, itemToDelete, reloadItems }">
      <DeleteStaticLeaseModal
        :item-to-delete="itemToDelete"
        :visible="isModalShown"
        @close="closeModal"
        @lease-deleted="reloadItems"
      />
    </template>
    <template #create-edit-item-drawer="{ isDrawerShown, itemToEdit, closeDrawer, reloadItems }">
      <CreateOrEditStaticLeaseDrawer
        :is-shown="isDrawerShown"
        :item-to-edit="itemToEdit"
        @close="closeDrawer()"
        @add-edit-lease="reloadItems()"
      />
    </template>
  </FilterableListItemLayout>
</template>
