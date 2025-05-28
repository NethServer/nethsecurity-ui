<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import LeasesTable from './LeasesTable.vue'
import DeleteStaticLeaseModal from './DeleteStaticLeaseModal.vue'
import CreateOrEditStaticLeaseDrawer from './CreateOrEditStaticLeaseDrawer.vue'
import { computed, onMounted, ref } from 'vue'
import {
  type FilterOption,
  getAxiosErrorMessage,
  NeButton,
  NeDropdownFilter,
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCircleInfo, faCirclePlus } from '@fortawesome/free-solid-svg-icons'

export type StaticLease = {
  lease: string
  macaddr: string
  ipaddr: string
  hostname: string
  interface: string
  device: string
  description: string
  used: boolean
  matches: string[]
}
const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const textFilter = ref('')
const selectedInterface = ref<string[]>(['any'])
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref<StaticLease>()
const items = ref<StaticLease[]>([])
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const loading = ref(false)
const filteredItems = computed<StaticLease[]>(() => {
  let result =
    textFilter.value === '' ? items.value : applyFilterToStaticLeases(items.value, textFilter.value)
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

function applyFilterToStaticLeases(staticLeases: StaticLease[], textFilter: string): StaticLease[] {
  const lowerCaseFilter = textFilter.toLowerCase()
  return staticLeases.filter(
    (staticLease) =>
      staticLease.hostname.toLowerCase().includes(lowerCaseFilter) ||
      staticLease.ipaddr.toLowerCase().includes(lowerCaseFilter) ||
      staticLease.macaddr.toLowerCase().includes(lowerCaseFilter) ||
      staticLease.interface.toLowerCase().includes(lowerCaseFilter) ||
      staticLease.device.toLowerCase().includes(lowerCaseFilter) ||
      staticLease.description.toLowerCase().includes(lowerCaseFilter)
  )
}

function openCreateEditDrawer(itemToEdit?: StaticLease) {
  selectedItem.value = itemToEdit
  showCreateEditDrawer.value = true
}
function openDeleteModal(itemToDelete: StaticLease) {
  selectedItem.value = itemToDelete
  showDeleteModal.value = true
}
function closeDeleteModal() {
  showDeleteModal.value = false
  selectedItem.value = undefined
}
function closeCreateEditDrawer() {
  showCreateEditDrawer.value = false
  selectedItem.value = undefined
}
async function fetchStaticLeases(): Promise<StaticLease[]> {
  const staticLeasesResponse = await ubusCall('ns.dhcp', 'list-static-leases')
  return staticLeasesResponse.data.leases
}

async function fetchItems() {
  try {
    loading.value = true
    items.value = await fetchStaticLeases()
    uciChangesStore.getChanges()
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_fetch_static_leases')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}
const interfaceFilterOptions = computed(() => {
  // Collect all interface values, treating empty string as 'unknown'
  const interfaces = items.value.map((item) =>
    item.interface?.trim() !== '' ? item.interface : 'unknown'
  )
  // Get unique values
  let uniqueInterfaces = Array.from(new Set(interfaces))

  // Remove 'unknown' for sorting, then add it back after sorting if present
  const hasUnknown = uniqueInterfaces.includes('unknown')
  uniqueInterfaces = uniqueInterfaces.filter((i) => i !== 'unknown').sort()
  if (hasUnknown) uniqueInterfaces.push('unknown')

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

onMounted(() => {
  fetchItems()
})
// clear the textFilter
function clearFilters() {
  textFilter.value = ''
  selectedInterface.value = ['any']
}
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.dns_dhcp.static_leases_description') }}
      </p>
      <div class="ml-2 shrink-0">
        <NeButton v-if="items.length > 0" kind="secondary" @click="openCreateEditDrawer()">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.dns_dhcp.add_reservation') }}
        </NeButton>
      </div>
    </div>
    <div class="flex items-center gap-x-3">
      <NeTextInput
        v-model="textFilter"
        is-search
        class="max-w-xs"
        :placeholder="t('common.filter')"
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
        :title="t('standalone.dns_dhcp.no_reservation_configured')"
        :icon="faCircleInfo"
      >
        <NeButton kind="primary" @click="openCreateEditDrawer()">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.dns_dhcp.add_reservation') }}
        </NeButton>
      </NeEmptyState>
      <NeEmptyState
        v-else-if="filteredItems.length == 0"
        :title="t('standalone.dns_dhcp.no_reservation_found')"
        :description="t('standalone.dns_dhcp.filter_change_suggestion')"
        :icon="faCircleInfo"
      />
      <LeasesTable
        v-else
        :leases="filteredItems"
        :show-dynamic-leases="false"
        @lease-delete="openDeleteModal"
        @lease-edit="openCreateEditDrawer"
      />
    </template>
  </div>
  <CreateOrEditStaticLeaseDrawer
    :is-shown="showCreateEditDrawer"
    :item-to-edit="selectedItem"
    @close="closeCreateEditDrawer()"
    @add-edit-lease="fetchItems()"
  />
  <DeleteStaticLeaseModal
    :item-to-delete="selectedItem"
    :visible="showDeleteModal"
    @close="closeDeleteModal"
    @lease-deleted="fetchItems()"
  />
</template>
