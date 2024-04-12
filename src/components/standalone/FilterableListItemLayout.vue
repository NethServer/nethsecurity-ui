<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts" generic="T">
import { computed, onMounted, type Ref } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeEmptyState,
  NeTextInput,
  getAxiosErrorMessage
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

const filter = ref('')
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref<T>() as Ref<T | undefined>

const filteredItems = computed<T[]>(() => {
  return filter.value === ''
    ? items.value
    : props.applyFilterToItemsFunction(items.value, filter.value)
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
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ description }}
      </p>
      <div class="ml-2 shrink-0">
        <NeButton
          kind="secondary"
          @click="openCreateEditDrawer()"
          v-if="!readonly && items.length > 0"
        >
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ addItemButtonLabel }}
        </NeButton>
      </div>
    </div>
    <NeTextInput class="max-w-xs" :placeholder="t('common.filter')" v-model="filter" />
    <NeInlineNotification
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationDescription"
    >
      <template #details v-if="error.notificationDetails">
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
    name="create-edit-item-drawer"
    :is-drawer-shown="showCreateEditDrawer"
    :item-to-edit="selectedItem"
    :close-drawer="closeCreateEditDrawer"
    :reload-items="reloadItems"
    v-if="!readonly"
  />
  <slot
    name="delete-item-modal"
    :is-modal-shown="showDeleteModal"
    :close-modal="closeDeleteModal"
    :item-to-delete="selectedItem"
    :reload-items="reloadItems"
    v-if="!readonly"
  />
</template>
