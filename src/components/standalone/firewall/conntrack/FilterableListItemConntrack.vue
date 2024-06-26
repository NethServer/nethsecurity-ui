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
  fetchErrorNotificationTitle: string
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
const showDeleteModal = ref(false)
const showDeleteModalAll = ref(false)
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

function delete_all() {
  selectedItem.value = { id: 'all' } as T
  showDeleteModal.value = true
}

function closeDeleteModalAll() {
  showDeleteModalAll.value = false
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
        {{ t('standalone.conntrack.conntrack_description') }}
      </p>
      <div class="ml-2 shrink-0">
        <NeButton
          v-if="items.length > 0"
          kind="secondary"
          size="lg"
          @click="delete_all()"
          class="mr-4 shrink-0"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'trash']" aria-hidden="true" />
          </template>
          {{ t('standalone.conntrack.delete_all') }}
        </NeButton>
        <NeButton kind="secondary" size="lg" @click="reloadItems()" class="shrink-0">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'fa-refresh']" aria-hidden="true" />
          </template>
          {{ t('standalone.conntrack.refresh_page') }}</NeButton
        >
      </div>
    </div>
    <div class="mb-5 flex items-center gap-4">
      <NeTextInput class="max-w-xs" :placeholder="t('common.filter')" v-model="filter" />
      <NeButton kind="tertiary" @click="filter = ''" :disabled="loading || !filter">
        {{ t('common.clear_filter') }}
      </NeButton>
    </div>
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
      <NeEmptyState v-if="items.length == 0" :title="noItemsFoundMessage" :icon="['fas', 'chain']">
        <NeButton kind="tertiary" @click="reloadItems">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'fa-refresh']" aria-hidden="true" /> </template
          >{{ t('standalone.conntrack.refresh_page') }}</NeButton
        >
      </NeEmptyState>
      <NeEmptyState
        v-else-if="filteredItems.length == 0"
        :title="noFilteredItemsFoundMessage"
        :description="noFilteredItemsFoundDescription"
        :icon="['fas', 'chain']"
      >
        <NeButton kind="tertiary" @click="filter = ''"> {{ t('common.clear_filter') }}</NeButton>
      </NeEmptyState>
      <slot
        v-else
        name="item-list-view"
        :items="filteredItems"
        :open-delete-modal="openDeleteModal"
      />
    </template>
  </div>
  <slot
    name="delete-item-modal"
    :is-modal-shown="showDeleteModal"
    :close-modal="closeDeleteModal"
    :item-to-delete="selectedItem"
    :reload-items="reloadItems"
  />
  <slot
    name="delete-item-all-modal"
    :is-delete-all-modal-shown="showDeleteModalAll"
    :close-modal="closeDeleteModalAll"
    :reload-items="reloadItems"
    :item-to-delete="selectedItem"
  />
</template>
