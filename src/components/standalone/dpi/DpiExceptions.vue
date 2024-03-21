<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeSkeleton,
  NeButton,
  NeEmptyState,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import DeleteDpiExceptionModal from './DeleteDpiExceptionModal.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import DpiExceptionCard from './DpiExceptionCard.vue'
import CreateOrDeleteDpiExceptionDrawer from './CreateOrDeleteDpiExceptionDrawer.vue'

export type DpiException = {
  'config-name': string
  enabled: true
  criteria: string
  description: string
}

const { t } = useI18n()

const uciChangesStore = useUciPendingChangesStore()

const loading = ref(false)
const exceptions = ref<DpiException[]>([])
const selectedException = ref<DpiException | null>(null)
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)

const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

function openCreateEditDrawer(itemToEdit: DpiException | null) {
  selectedException.value = itemToEdit
  showCreateEditDrawer.value = true
}

function openDeleteModal(itemToDelete: DpiException) {
  selectedException.value = itemToDelete
  showDeleteModal.value = true
}

async function fetchDpiExceptions() {
  try {
    loading.value = true
    exceptions.value = (await ubusCall('ns.dpi', 'list-exemptions')).data.values
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_dpi_exceptions')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value = false
  }
}

async function reloadExceptions() {
  await fetchDpiExceptions()
  await uciChangesStore.getChanges()
}

onMounted(() => {
  fetchDpiExceptions()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.dpi.exceptions_description') }}
      </p>
      <template v-if="exceptions.length > 0">
        <div class="ml-2 flex shrink-0 flex-col gap-x-0 gap-y-2 sm:flex-row sm:gap-x-2 sm:gap-y-0">
          <NeButton kind="secondary" @click="openCreateEditDrawer(null)">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-plus']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.dpi.add_exception') }}
          </NeButton>
        </div>
      </template>
    </div>
    <NeInlineNotification
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationTitle"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else-if="!error.notificationTitle">
      <NeEmptyState
        v-if="exceptions.length == 0"
        :title="t('standalone.dpi.no_exception_found')"
        :icon="['fas', 'circle-info']"
        ><NeButton kind="primary" @click="openCreateEditDrawer(null)"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.dpi.add_exception') }}</NeButton
        ></NeEmptyState
      >
      <div v-else class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 2xl:grid-cols-3">
        <DpiExceptionCard
          v-for="(exception, index) in exceptions"
          :key="index"
          :exception="exception"
          @delete="openDeleteModal"
          @edit="openCreateEditDrawer"
        />
      </div>
    </template>
  </div>
  <DeleteDpiExceptionModal
    :visible="showDeleteModal"
    :item-to-delete="selectedException"
    @close="showDeleteModal = false"
    @dpi-exception-deleted="reloadExceptions()"
  />
  <CreateOrDeleteDpiExceptionDrawer
    :is-shown="showCreateEditDrawer"
    :item-to-edit="selectedException"
    @close="showCreateEditDrawer = false"
    @add-edit-exception="reloadExceptions()"
  />
</template>
