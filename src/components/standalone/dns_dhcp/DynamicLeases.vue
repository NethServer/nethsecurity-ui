<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import FilterableListItemLayout from '../FilterableListItemLayout.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import LeasesTable from './LeasesTable.vue'

const { t } = useI18n()

export type DynamicLease = {
  macaddr: string
  ipaddr: string
  hostname: string
  interface: string
  device: string
  timestamp: string
}

async function fetchDynamicLeases(): Promise<DynamicLease[]> {
  const dynamicLeasesResponse = await ubusCall('ns.dhcp', 'list-active-leases')
  return dynamicLeasesResponse.data.leases
}

function applyFilterToDynamicLeases(dynamicLeases: DynamicLease[], filter: string) {
  return dynamicLeases.filter(
    (dynamicLease) =>
      dynamicLease.hostname.includes(filter) ||
      dynamicLease.ipaddr.includes(filter) ||
      dynamicLease.macaddr.includes(filter) ||
      dynamicLease.interface.includes(filter)
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
      <LeasesTable :leases="items" :show-dynamic-leases="true" />
    </template>
  </FilterableListItemLayout>
</template>
