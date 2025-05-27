<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import LeasesTable from './LeasesTable.vue'
import { ref, computed, onMounted } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRouter } from 'vue-router'
import CreateOrEditStaticLeaseDrawer from './CreateOrEditStaticLeaseDrawer.vue'
import {
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput,
  getAxiosErrorMessage,
  type FilterOption,
  NeDropdownFilter
} from '@nethesis/vue-components'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
const { t } = useI18n()
const router = useRouter()
const selectedLease = ref<DynamicLease>()
const showCreateStaticLeaseDrawer = ref(false)
const uciChangesStore = useUciPendingChangesStore()
const textFilter = ref('')
const selectedInterface = ref<string[]>(['any'])
const items = ref<DynamicLease[]>([])
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const loading = ref(false)

export type DynamicLease = {
  macaddr: string
  ipaddr: string
  hostname: string
  interface: string
  device: string
  timestamp: string
}

function openCreateStaticLeaseDrawer(item: DynamicLease) {
  selectedLease.value = item
  showCreateStaticLeaseDrawer.value = true
}

const filteredItems = computed<DynamicLease[]>(() => {
  let result =
    textFilter.value === ''
      ? items.value
      : applyFilterToDynamicLeases(items.value, textFilter.value)
  // Use the first selected interface, default to 'any'
  const selected = selectedInterface.value[0] ?? 'any'
  if (selected !== 'any') {
    result = result.filter(
      (lease) =>
        (lease.interface && lease.interface.trim() !== '' ? lease.interface : 'unknown') ===
        selected
    )
  }
  return result
})

function formatTimestamp(ts: string): string {
  const num = Number(ts)
  if (!num) {
    return ''
  }
  const date = new Date(num * 1000)
  return date.toLocaleString()
}

function applyFilterToDynamicLeases(dynamicLeases: DynamicLease[], textFilter: string) {
  const lowerCaseFilter = textFilter.toLowerCase()
  return dynamicLeases.filter(
    (dynamicLease) =>
      dynamicLease.hostname.toLowerCase().includes(lowerCaseFilter) ||
      dynamicLease.ipaddr.toLowerCase().includes(lowerCaseFilter) ||
      dynamicLease.macaddr.toLowerCase().includes(lowerCaseFilter) ||
      dynamicLease.interface.toLowerCase().includes(lowerCaseFilter) ||
      dynamicLease.device.toLowerCase().includes(lowerCaseFilter) ||
      formatTimestamp(dynamicLease.timestamp).toLowerCase().includes(lowerCaseFilter)
  )
}

const interfaceFilterOptions = computed(() => {
  // Collect all interface values, treating empty string as 'unknown'
  const interfaces = items.value.map((item) =>
    item.interface?.trim() !== '' ? item.interface : 'unknown'
  )
  // Get unique values
  const uniqueInterfaces = Array.from(new Set(interfaces))
  // Build options array
  const options: FilterOption[] = [
    { id: 'any', label: t('common.any') },
    ...uniqueInterfaces.map((intf) => ({
      id: intf,
      label: intf === 'unknown' ? t('common.unknown') : intf
    }))
  ]
  return options
})

async function fetchDynamicLeases(): Promise<DynamicLease[]> {
  const dynamicLeasesResponse = await ubusCall('ns.dhcp', 'list-active-leases')
  return dynamicLeasesResponse.data.leases
}
async function fetchItems() {
  try {
    loading.value = true
    items.value = await fetchDynamicLeases()
    uciChangesStore.getChanges()
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_dynamic_leases')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}
onMounted(() => {
  fetchItems()
})

function clearFilters() {
  textFilter.value = ''
  selectedInterface.value = ['any']
}
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.dns_dhcp.dynamic_leases_description') }}
      </p>
    </div>
    <div class="flex items-center gap-x-3">
      <NeTextInput
        v-model="textFilter"
        class="max-w-xs"
        :placeholder="t('common.filter')"
        is-search
      />
      <NeDropdownFilter
        v-model="selectedInterface"
        kind="radio"
        :label="t('common.interface')"
        :options="interfaceFilterOptions"
        :clear-filter-label="t('ne_dropdown_filter.clear_filter')"
        :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
      />
      <NeButton kind="tertiary" @click="clearFilters">
        {{ t('common.clear_filters') }}
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
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else>
      <NeEmptyState
        v-if="items.length == 0"
        :title="t('standalone.dns_dhcp.no_dynamic_lease_found')"
        :icon="faCircleInfo"
        class="pb-2"
      />
      <NeEmptyState
        v-else-if="filteredItems.length == 0"
        :title="t('standalone.dns_dhcp.no_dynamic_lease_found')"
        :description="t('standalone.dns_dhcp.filter_change_suggestion')"
        :icon="faCircleInfo"
      />
      <LeasesTable
        v-else
        :leases="filteredItems"
        :show-dynamic-leases="true"
        @create-static-lease-from-dynamic="openCreateStaticLeaseDrawer"
      />
    </template>
  </div>
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
