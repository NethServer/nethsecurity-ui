<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FilterableListItemLayout from '../FilterableListItemLayout.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import LeasesTable from './LeasesTable.vue'
import { ref } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRouter } from 'vue-router'
import CreateOrEditStaticLeaseDrawer from './CreateOrEditStaticLeaseDrawer.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const router = useRouter()

export type DynamicLease = {
  macaddr: string
  ipaddr: string
  hostname: string
  interface: string
  device: string
  timestamp: string
}

const selectedLease = ref<DynamicLease>()
const showCreateStaticLeaseDrawer = ref(false)

function openCreateStaticLeaseDrawer(item: DynamicLease) {
  selectedLease.value = item
  showCreateStaticLeaseDrawer.value = true
}

async function fetchDynamicLeases(): Promise<DynamicLease[]> {
  const dynamicLeasesResponse = await ubusCall('ns.dhcp', 'list-active-leases')
  return dynamicLeasesResponse.data.leases
}

function applyFilterToDynamicLeases(dynamicLeases: DynamicLease[], filter: string) {
  const lowerCaseFilter = filter.toLowerCase()
  return dynamicLeases.filter(
    (dynamicLease) =>
      dynamicLease.hostname.toLowerCase().includes(lowerCaseFilter) ||
      dynamicLease.ipaddr.toLowerCase().includes(lowerCaseFilter) ||
      dynamicLease.macaddr.toLowerCase().includes(lowerCaseFilter) ||
      dynamicLease.interface.toLowerCase().includes(lowerCaseFilter)
  )
}
</script>

<template>
  <FilterableListItemLayout
    :fetch-items-function="fetchDynamicLeases"
    :fetch-error-notification-title="t('error.cannot_retrieve_dynamic_leases')"
    :apply-filter-to-items-function="applyFilterToDynamicLeases"
    :readonly="true"
    :no-items-found-message="t('standalone.dns_dhcp.no_dynamic_lease_found')"
    :no-filtered-items-found-message="t('standalone.dns_dhcp.no_dynamic_lease_found')"
    :no-filtered-items-found-description="t('standalone.dns_dhcp.filter_change_suggestion')"
    :description="t('standalone.dns_dhcp.dynamic_leases_description')"
  >
    <template #item-list-view="{ items }">
      <LeasesTable
        :leases="items"
        :show-dynamic-leases="true"
        @create-static-lease-from-dynamic="openCreateStaticLeaseDrawer"
      />
    </template>
  </FilterableListItemLayout>
  <CreateOrEditStaticLeaseDrawer
    :is-shown="showCreateStaticLeaseDrawer"
    :import-dynamic-lease="selectedLease"
    @close="showCreateStaticLeaseDrawer = false"
    @add-edit-lease="
      () => {
        showCreateStaticLeaseDrawer = false
        uciChangesStore.getChanges()
        router.push(`${getStandaloneRoutePrefix()}/network/dns-dhcp?tab=static-leases`)
      }
    "
  />
</template>
