<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTitle, NeButton, NeSkeleton, NeInlineNotification } from '@nethesis/vue-components'
import { getAxiosErrorMessage, NeTextInput, NeEmptyState } from '@nethserver/vue-tailwind-lib'
import PortForwardTable from '@/components/standalone/firewall/PortForwardTable.vue'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import CreateOrEditPortForwardDrawer from '@/components/standalone/firewall/CreateOrEditPortForwardDrawer.vue'
import DeletePortForwardModal from '@/components/standalone/firewall/DeletePortForwardModal.vue'
import { computed } from 'vue'

const { t } = useI18n()

export type PortForward = {
  dest_ip: string
  protocol: string[]
  source_port: string
  source_port_name: string
  destination_port: string
  name: string
  wan: string
  enabled: boolean
  id: string
  restrict: string[]
  log: boolean
  reflection: boolean
  reflection_zone: string[]
  dest: string
}

export type CreateEditPortForwardPayload = {
  dest_ip: string
  proto: string[]
  src_dport: string
  dest_port: string
  name: string
  src_dip: string
  enabled: '0' | '1'
  id?: string
  restrict: string[]
  log: '0' | '1'
  reflection: '0' | '1'
  reflection_zone: string[]
  dest: string
}

const uciChangesStore = useUciPendingChangesStore()

const loading = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const portForwards = ref<Record<string, PortForward[]>>({})
const filter = ref('')
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref<PortForward | null>(null)

const filteredPortForwards = computed<Record<string, PortForward[]>>(() => {
  return filter.value == ''
    ? portForwards.value
    : Object.fromEntries(
        Object.entries(portForwards.value)
          .map(([k, v]) => [
            k,
            v.filter(
              (el) =>
                el.name.includes(filter.value) ||
                el.source_port.includes(filter.value) ||
                el.destination_port.includes(filter.value) ||
                el.protocol.filter((prot) => prot.includes(filter.value)).length > 0 ||
                el.wan.includes(filter.value) ||
                el.restrict.filter((rs) => rs.includes(filter.value)).length > 0
            )
          ])
          .filter(([, v]) => v.length > 0)
      )
})

function cleanError() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
}

async function fetchPortForwards() {
  try {
    cleanError()
    loading.value = true
    const response = await ubusCall('ns.redirects', 'list-redirects')
    portForwards.value = response.data.redirects
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.generic_error')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function reloadPortForwards() {
  await uciChangesStore.getChanges()
  await fetchPortForwards()
}

async function toggleEnablePortForward(item: PortForward) {
  try {
    cleanError()
    await ubusCall('ns.redirects', item.enabled ? 'disable-redirect' : 'enable-redirect', {
      id: item.id
    })
    await reloadPortForwards()
  } catch (err: any) {
    error.value.notificationTitle = t(
      item.enabled ? 'error.cannot_disable_port_forward' : 'error.cannot_enable_port_forward'
    )
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function duplicatePortForward(item: PortForward) {
  try {
    cleanError()
    let payload: CreateEditPortForwardPayload = {
      dest_ip: item.dest_ip,
      proto: item.protocol,
      src_dport: item.source_port,
      src_dip: item.wan,
      dest_port: item.destination_port,
      name: `${item.name} (${t('standalone.port_forward.copy')})`,
      enabled: item.enabled ? '1' : '0',
      log: item.log ? '1' : '0',
      restrict: item.restrict,
      reflection: item.reflection ? '1' : '0',
      reflection_zone: item.reflection_zone,
      dest: item.dest
    }
    await ubusCall('ns.redirects', 'add-redirect', payload)
    await reloadPortForwards()
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_duplicate_port_forward')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

function openCreateEditDrawer(itemToEdit: PortForward | null) {
  selectedItem.value = itemToEdit
  showCreateEditDrawer.value = true
}

function closeCreateEditDrawer() {
  selectedItem.value = null
  showCreateEditDrawer.value = false
}

function openDeleteModal(itemToEdit: PortForward) {
  selectedItem.value = itemToEdit
  showDeleteModal.value = true
}

function closeDeleteModal() {
  selectedItem.value = null
  showDeleteModal.value = false
}

onMounted(() => {
  fetchPortForwards()
})
</script>

<template>
  <NeTitle>{{ t('standalone.port_forward.title') }}</NeTitle>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.port_forward.description') }}
      </p>
      <div class="ml-2 shrink-0">
        <NeButton
          kind="secondary"
          @click="openCreateEditDrawer(null)"
          v-if="Object.keys(portForwards).length > 0"
        >
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.port_forward.add_port_forward') }}
        </NeButton>
      </div>
    </div>
    <NeTextInput
      class="max-w-xs"
      :placeholder="t('standalone.port_forward.filter')"
      v-model="filter"
    />
    <NeInlineNotification
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationDescription"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else>
      <NeEmptyState
        :title="t('standalone.port_forward.no_port_forward_found')"
        :icon="['fas', 'circle-info']"
        v-if="Object.keys(portForwards).length == 0"
        ><NeButton kind="primary" @click="openCreateEditDrawer(null)"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.port_forward.add_port_forward') }}</NeButton
        ></NeEmptyState
      >
      <NeEmptyState
        :title="t('standalone.port_forward.no_port_forward_found')"
        :description="t('standalone.port_forward.filter_change_suggestion')"
        :icon="['fas', 'circle-info']"
        v-else-if="Object.keys(filteredPortForwards).length == 0"
      />
      <PortForwardTable
        v-else
        v-for="(portForward, key) in filteredPortForwards"
        :key="key"
        :port-forwards="portForward"
        :header="key"
        @port-forward-delete="openDeleteModal"
        @port-forward-duplicate="duplicatePortForward"
        @port-forward-edit="openCreateEditDrawer"
        @port-forward-toggle-enable="toggleEnablePortForward"
      />
    </template>
  </div>
  <CreateOrEditPortForwardDrawer
    :is-shown="showCreateEditDrawer"
    :initial-item="selectedItem"
    @close="closeCreateEditDrawer()"
    @add-edit-port-forward="reloadPortForwards()"
  />
  <DeletePortForwardModal
    :visible="showDeleteModal"
    @close="closeDeleteModal()"
    @port-forward-deleted="reloadPortForwards()"
    :item-to-delete="selectedItem"
  />
</template>
