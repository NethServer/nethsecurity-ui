<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeDropdown,
  NeHeading,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeToggle,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useNotificationsStore } from '@/stores/notifications'
import {
  ALLOWLIST_URLS_KEY,
  getMutationErrorKey,
  useAllowlistUrls,
  type AllowlistUrl
} from '@/composables/useThreatShieldCustomLists'
import CreateOrEditAllowlistUrlDrawer from './CreateOrEditAllowlistUrlDrawer.vue'

const { t } = useI18n()
const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const { data: allowlistUrls, isPending, error: fetchError } = useAllowlistUrls()

const selectedItem = ref<AllowlistUrl>()
const showDrawer = ref(false)
const showDeleteModal = ref(false)
const showDisableNethesisModal = ref(false)

const onSuccess = () =>
  Promise.all([queryClient.invalidateQueries({ queryKey: ALLOWLIST_URLS_KEY }), uci.getChanges()])

const toggleMutation = useMutation({
  mutationFn: (item: AllowlistUrl) =>
    ubusCall(
      'ns.threatshield',
      'edit-allowlist-url',
      // the builtin list accepts only the enabled flag
      item.builtin
        ? { name: item.name, enabled: item.enabled }
        : { name: item.name, url: item.url, description: item.description, enabled: item.enabled }
    ),
  onSuccess
})

const deleteMutation = useMutation({
  mutationFn: (name: string) => ubusCall('ns.threatshield', 'delete-allowlist-url', { name }),
  onSuccess
})

function openDrawer(item?: AllowlistUrl) {
  selectedItem.value = item
  showDrawer.value = true
}

function openDeleteModal(item: AllowlistUrl) {
  selectedItem.value = item
  deleteMutation.reset()
  showDeleteModal.value = true
}

function onToggle(item: AllowlistUrl) {
  if (item.builtin && item.enabled) {
    selectedItem.value = item
    showDisableNethesisModal.value = true
    return
  }
  toggleMutation.mutate({ ...item, enabled: !item.enabled })
}

function disableNethesis() {
  if (selectedItem.value) {
    toggleMutation.mutate(
      { ...selectedItem.value, enabled: false },
      { onSettled: () => (showDisableNethesisModal.value = false) }
    )
  }
}

function cancelDisableNethesis() {
  // the request is already running, ignore the close
  if (!toggleMutation.isPending.value) {
    showDisableNethesisModal.value = false
  }
}

function deleteItem() {
  if (selectedItem.value) {
    deleteMutation.mutate(selectedItem.value.name, {
      onSuccess: () => {
        showDeleteModal.value = false
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield.allowlist_url_deleted')
        })
      }
    })
  }
}

function getDropdownItems(item: AllowlistUrl) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: faTrash,
      danger: true,
      action: () => openDeleteModal(item)
    }
  ]
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-y-6">
      <div class="flex flex-row items-start justify-between gap-4">
        <div>
          <NeHeading tag="h5" class="mb-2">{{
            t('standalone.threat_shield.remote_allowlists')
          }}</NeHeading>
          <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.threat_shield.remote_allowlists_description') }}
          </p>
        </div>
        <NeButton kind="primary" class="shrink-0" @click="openDrawer()">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" /> </template
          >{{ t('standalone.threat_shield.add_allowlist_url') }}</NeButton
        >
      </div>
      <NeInlineNotification
        v-if="fetchError"
        kind="error"
        :title="t('error.cannot_retrieve_allowlist_urls')"
        :description="t(getAxiosErrorMessage(fetchError))"
      />
      <NeInlineNotification
        v-if="toggleMutation.error.value"
        kind="error"
        :title="t('error.cannot_edit_allowlist_url')"
        :description="t(getMutationErrorKey(toggleMutation.error.value, 'name'))"
      />
      <NeSkeleton v-if="isPending" :lines="4" size="lg" />
      <NeTable
        v-else-if="allowlistUrls?.length"
        :aria-label="t('standalone.threat_shield.remote_allowlists')"
        card-breakpoint="xl"
      >
        <NeTableHead>
          <NeTableHeadCell>{{ t('standalone.threat_shield.name') }}</NeTableHeadCell>
          <NeTableHeadCell>{{ t('standalone.threat_shield.description') }}</NeTableHeadCell>
          <NeTableHeadCell>{{ t('common.status') }}</NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-for="item in allowlistUrls" :key="item.name">
            <NeTableCell :data-label="t('standalone.threat_shield.name')">
              {{ item.builtin ? t('standalone.threat_shield.nethesis_allowlist') : item.name }}
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.threat_shield.description')">
              {{
                item.builtin
                  ? t('standalone.threat_shield.nethesis_allowlist_description')
                  : item.description || '-'
              }}
            </NeTableCell>
            <NeTableCell :data-label="t('common.status')">
              <NeToggle
                :model-value="item.enabled"
                :disabled="toggleMutation.isPending.value"
                :label="item.enabled ? t('common.enabled') : t('common.disabled')"
                @update:model-value="onToggle(item)"
              />
            </NeTableCell>
            <NeTableCell :data-label="t('common.actions')">
              <div v-if="!item.builtin" class="-ml-2.5 flex gap-2 md:justify-end xl:ml-0">
                <NeButton kind="tertiary" @click="openDrawer(item)">
                  <template #prefix>
                    <FontAwesomeIcon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
                  </template>
                  {{ t('common.edit') }}
                </NeButton>
                <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
              </div>
            </NeTableCell>
          </NeTableRow>
        </NeTableBody>
      </NeTable>
    </div>
    <CreateOrEditAllowlistUrlDrawer
      :is-shown="showDrawer"
      :item-to-edit="selectedItem"
      @close="showDrawer = false"
      @saved="
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield.allowlist_url_saved')
        })
      "
    />
    <NeModal
      :visible="showDeleteModal"
      kind="warning"
      primary-button-kind="danger"
      :title="t('standalone.threat_shield.delete_allowlist_url')"
      :primary-label="t('common.delete')"
      :cancel-label="t('common.cancel')"
      :primary-button-disabled="deleteMutation.isPending.value"
      :primary-button-loading="deleteMutation.isPending.value"
      :close-aria-label="t('common.close')"
      @primary-click="deleteItem()"
      @close="showDeleteModal = false"
    >
      {{
        t('standalone.threat_shield.delete_allowlist_url_message', {
          name: selectedItem?.name ?? ''
        })
      }}
      <NeInlineNotification
        v-if="deleteMutation.error.value"
        kind="error"
        :title="t('error.cannot_delete_allowlist_url')"
        :description="t(getMutationErrorKey(deleteMutation.error.value, 'name'))"
        class="mt-4"
      />
    </NeModal>
    <NeModal
      :visible="showDisableNethesisModal"
      kind="warning"
      :title="t('standalone.threat_shield.disable_nethesis_allowlist')"
      :primary-label="t('common.disable')"
      :cancel-label="t('common.cancel')"
      :primary-button-disabled="toggleMutation.isPending.value"
      :primary-button-loading="toggleMutation.isPending.value"
      :close-aria-label="t('common.close')"
      @primary-click="disableNethesis()"
      @close="cancelDisableNethesis()"
    >
      {{ t('standalone.threat_shield.disable_nethesis_allowlist_message') }}
    </NeModal>
  </div>
</template>
