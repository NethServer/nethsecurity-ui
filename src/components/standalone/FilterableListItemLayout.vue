<script setup lang="ts" generic="T">
import { getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, type Ref } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeTextInput,
  NeInlineNotification,
  NeSkeleton
} from '@nethserver/vue-tailwind-lib'

const props = defineProps<{
  fetchItemsFunction: () => Promise<T[]>
  applyFilterToItemsFunction: (itemsToFilter: T[], filter: string) => T[]
  readonly: boolean
  addItemButtonLabel?: string
  fetchErrorNotificationTitle: string
  description: string
  noItemsFoundMessage: string
  noFilteredItemsFoundMessage: string
}>()
const emit = defineEmits(['reload-items'])

const { t } = useI18n()

const loading = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: ''
})
const items = ref<T[]>([]) as Ref<T[]>

const filter = ref('')
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref<T | null>(null) as Ref<T | null>

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
  }
}

function openCreateEditDrawer(itemToEdit: T | null) {
  selectedItem.value = itemToEdit
  showCreateEditDrawer.value = true
}

function closeCreateEditDrawer() {
  selectedItem.value = null
  showCreateEditDrawer.value = false
}

function openDeleteModal(itemToDelete: T) {
  selectedItem.value = itemToDelete
  showDeleteModal.value = true
}

function closeDeleteModal() {
  selectedItem.value = null
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
      <div>
        <NeButton kind="secondary" @click="openCreateEditDrawer(null)" v-if="!readonly">
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
    />
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else>
      <div
        v-if="items.length == 0"
        class="flex flex-col items-center justify-center rounded-md bg-gray-200 p-10 dark:bg-gray-800"
      >
        <p class="text-sm">
          <strong>{{ noItemsFoundMessage }}</strong>
        </p>
        <NeButton v-if="!readonly" kind="primary" @click="openCreateEditDrawer(null)" class="mt-4"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ addItemButtonLabel }}</NeButton
        >
      </div>
      <div
        v-else-if="filteredItems.length == 0"
        class="flex flex-col items-center justify-center rounded-md bg-gray-200 p-10 dark:bg-gray-800"
      >
        <p class="text-sm">
          <strong>{{ noFilteredItemsFoundMessage }}</strong>
        </p>
        <p class="mt-4 text-sm">
          {{ t('standalone.port_forward.filter_change_suggestion') }}
        </p>
      </div>
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
