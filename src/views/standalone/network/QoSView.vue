<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeTitle,
  NeButton,
  NeInlineNotification,
  NeSkeleton,
  NeEmptyState,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { onMounted } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import QoSInterfaceTable from '@/components/standalone/qos/QoSInterfaceTable.vue'
import DeleteQoSInterfaceModal from '@/components/standalone/qos/DeleteQoSInterfaceModal.vue'
import CreateOrEditQoSInterfaceDrawer from '@/components/standalone/qos/CreateOrEditQoSInterfaceDrawer.vue'

export type QoSInterface = {
  interface: string
  device: string
  disabled: boolean
  upload: number
  download: number
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const fetchError = ref(false)
const qosInterfaces = ref<QoSInterface[]>([])
const selectedInterface = ref<QoSInterface>()
const loading = ref(false)
const showDeleteInterfaceModal = ref(false)
const showCreateOrEditInterfaceDrawer = ref(false)

function openCreateEditInterfaceDrawer(itemToEdit?: QoSInterface) {
  selectedInterface.value = itemToEdit
  showCreateOrEditInterfaceDrawer.value = true
}

function openDeleteInterfaceModal(itemToDelete: QoSInterface) {
  selectedInterface.value = itemToDelete
  showDeleteInterfaceModal.value = true
}

async function fetchInterfaces() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  try {
    loading.value = true
    qosInterfaces.value = (await ubusCall('ns.qos', 'list')).data.rules
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_qos_interfaces')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

async function toggleInterfaceEnable(qosInterface: QoSInterface) {
  try {
    await ubusCall('ns.qos', 'set-disabled', {
      interface: qosInterface.interface,
      disabled: !qosInterface.disabled
    })
    await refreshInterfaces()
  } catch (err: any) {
    error.value.notificationTitle = qosInterface.disabled
      ? t('error.cannot_enable_qos_interface')
      : t('error.cannot_disable_qos_interface')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function refreshInterfaces() {
  await uciChangesStore.getChanges()
  fetchInterfaces()
}

onMounted(() => {
  fetchInterfaces()
})
</script>

<template>
  <NeTitle>{{ t('standalone.qos.title') }}</NeTitle>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.users_database.users_description') }}
      </p>
      <NeButton
        kind="secondary"
        @click="
          () => {
            openCreateEditInterfaceDrawer()
          }
        "
        v-if="qosInterfaces.length > 0"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'circle-plus']"
            class="h-4 w-4"
            aria-hidden="true"
          /> </template
        >{{ t('standalone.qos.add_qos_interface') }}</NeButton
      >
    </div>
    <NeInlineNotification
      v-if="error.notificationDescription"
      :title="t('error.cannot_retrieve_users')"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else-if="!fetchError">
      <NeEmptyState
        v-if="qosInterfaces.length == 0"
        :title="t('standalone.qos.no_interface_found')"
        :icon="['fas', 'chart-simple']"
        ><NeButton kind="secondary" @click="() => {}"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.qos.add_qos_interface') }}</NeButton
        ></NeEmptyState
      >
      <QoSInterfaceTable
        v-else
        :qos-interfaces="qosInterfaces"
        @edit="openCreateEditInterfaceDrawer"
        @delete="openDeleteInterfaceModal"
        @enable-disable="toggleInterfaceEnable"
      />
    </template>
  </div>
  <DeleteQoSInterfaceModal
    :visible="showDeleteInterfaceModal"
    :item-to-delete="selectedInterface"
    @close="showDeleteInterfaceModal = false"
    @qos-interface-deleted="refreshInterfaces"
  />
  <CreateOrEditQoSInterfaceDrawer
    :is-shown="showCreateOrEditInterfaceDrawer"
    :item-to-edit="selectedInterface"
    @close="showCreateOrEditInterfaceDrawer = false"
    @add-edit-qos-interface="refreshInterfaces"
  />
</template>