<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts" generic="T extends { device?: string }">
import { computed, onMounted, watch, type Ref } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeEmptyState,
  NeTextInput,
  getAxiosErrorMessage,
  type FilterOption,
  NeDropdownFilter
} from '@nethesis/vue-components'

const props = defineProps<{
  fetchItemsFunction: () => Promise<T[]>
  applyFilterToItemsFunction: (itemsToFilter: T[], filter: string) => T[]
  readonly: boolean
  addItemButtonLabel?: string
  fetchErrorNotificationTitle: string
  description: string
  noItemsFoundMessage: string
  noFilteredItemsFoundMessage: string
  noFilteredItemsFoundDescription?: string
  sortByDevice?: boolean
}>()
const emit = defineEmits(['reload-items'])

const { t } = useI18n()

const loading = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const items = ref<T[]>([]) as Ref<T[]>
const sortByDevice = ref(props.sortByDevice ?? false)
const filter = ref('')
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const deviceFilter = ref<string[]>(['all'])
const selectedItem = ref<T>() as Ref<T | undefined>
const devices = ref<string[]>([])
const deviceFilterOptions = ref<FilterOption[]>([])

// filter the table items based on the filter value
const filteredItems = computed<T[]>(() => {
  let result =
    filter.value === '' ? items.value : props.applyFilterToItemsFunction(items.value, filter.value)

  // Transform deviceFilter.value to a string
  const deviceFilterValue = Object.values(deviceFilter.value)[0]

  // Apply deviceFilter if it's not 'all'
  if (deviceFilterValue !== 'all') {
    result = result.filter((item) => item.device === deviceFilterValue)
  }
  return result
})

async function fetchItems() {
  try {
    loading.value = true
    items.value = await props.fetchItemsFunction()
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = props.fetchErrorNotificationTitle
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

// Watch the items array and update devices with unique values
watch(items, (newItems) => {
  const uniqueDevices = new Set(
    newItems.map((item) => {
      return item.device || '-' // Use '-' as a fallback for missing devices
    })
  )
  devices.value = Array.from(uniqueDevices).sort() // Update devices with unique, sorted values
})

// Watch the devices array and update deviceFilterOptions
watch(devices, (newDevices) => {
  deviceFilterOptions.value = [
    {
      id: 'all',
      label: t('common.any')
    },
    ...newDevices.map((device) => ({
      id: device,
      label: device === '-' ? t('common.unknown') : device
    }))
  ]
})

function openCreateEditDrawer(itemToEdit?: T) {
  selectedItem.value = itemToEdit
  showCreateEditDrawer.value = true
}

function closeCreateEditDrawer() {
  showCreateEditDrawer.value = false
}

function openDeleteModal(itemToDelete: T) {
  selectedItem.value = itemToDelete
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
}

async function reloadItems() {
  await fetchItems()
  emit('reload-items')
}

onMounted(() => {
  fetchItems()
})
// clear the filter
function clearFilters() {
  filter.value = ''
  deviceFilter.value = ['all']
}
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ description }}
      </p>
      <div class="ml-2 shrink-0">
        <NeButton
          v-if="!readonly && items.length > 0"
          kind="secondary"
          @click="openCreateEditDrawer()"
        >
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ addItemButtonLabel }}
        </NeButton>
      </div>
    </div>
    <div class="flex flex-row gap-x-3">
      <NeTextInput v-model="filter" class="max-w-xs" :placeholder="t('common.filter')" />
      {{ deviceFilter }}
      <NeDropdownFilter
        v-if="sortByDevice"
        v-model="deviceFilter"
        kind="radio"
        :label="t('standalone.dns_dhcp.device')"
        :options="deviceFilterOptions"
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
        :title="noItemsFoundMessage"
        :icon="['fas', 'circle-info']"
        :class="[readonly ? 'pb-2' : '']"
        ><NeButton v-if="!readonly" kind="primary" @click="openCreateEditDrawer()"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ addItemButtonLabel }}</NeButton
        ></NeEmptyState
      >
      <NeEmptyState
        v-else-if="filteredItems.length == 0"
        :title="noFilteredItemsFoundMessage"
        :description="noFilteredItemsFoundDescription"
        :icon="['fas', 'circle-info']"
      />
      <slot
        v-else
        name="item-list-view"
        :items="filteredItems"
        :open-delete-modal="openDeleteModal"
        :open-edit-item-drawer="openCreateEditDrawer"
      />
    </template>
  </div>
  <slot
    v-if="!readonly"
    name="create-edit-item-drawer"
    :is-drawer-shown="showCreateEditDrawer"
    :item-to-edit="selectedItem"
    :close-drawer="closeCreateEditDrawer"
    :reload-items="reloadItems"
  />
  <slot
    v-if="!readonly"
    name="delete-item-modal"
    :is-modal-shown="showDeleteModal"
    :close-modal="closeDeleteModal"
    :item-to-delete="selectedItem"
    :reload-items="reloadItems"
  />
</template>
