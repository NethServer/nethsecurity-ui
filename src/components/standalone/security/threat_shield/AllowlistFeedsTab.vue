<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  NeButton,
  NeDropdown,
  NeEmptyState,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  NeToggle,
  NeTooltip,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowRight,
  faCircleInfo,
  faCirclePlus,
  faMagnifyingGlass,
  faPenToSquare,
  faShield,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import { ubusCall } from '@/lib/standalone/ubus'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useNotificationsStore } from '@/stores/notifications'
import { useThreatShieldSettings } from '@/composables/useThreatShieldSettings'
import {
  ALLOWLIST_URLS_KEY,
  getMutationErrorKey,
  type AllowlistUrl
} from '@/composables/useThreatShieldCustomLists'
import CreateOrEditAllowlistUrlDrawer from './CreateOrEditAllowlistUrlDrawer.vue'

const { t } = useI18n()
const router = useRouter()
const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const {
  data: allowlistUrls,
  isPending,
  error: fetchError
} = useQuery({
  queryKey: ALLOWLIST_URLS_KEY,
  queryFn: ({ signal }) =>
    ubusCall<{ data: { data: AllowlistUrl[] } }>(
      'ns.threatshield',
      'list-allowlist-urls',
      {},
      { signal }
    ),
  select: (res) => res.data.data
})
const { data: settings, isPending: isSettingsPending } = useThreatShieldSettings()

const selectedItem = ref<AllowlistUrl>()
const showDrawer = ref(false)
const showDeleteModal = ref(false)
const filter = ref('')

const filteredAllowlistUrls = computed(() => {
  const text = filter.value.trim().toLowerCase()
  return (allowlistUrls.value ?? []).filter(
    (item) => !text || item.name.includes(text) || getDescription(item).toLowerCase().includes(text)
  )
})

const onSuccess = () =>
  Promise.all([queryClient.invalidateQueries({ queryKey: ALLOWLIST_URLS_KEY }), uci.getChanges()])

const toggleMutation = useMutation({
  mutationFn: (item: AllowlistUrl) =>
    ubusCall('ns.threatshield', 'edit-allowlist-url', {
      name: item.name,
      url: item.url,
      description: item.description,
      enabled: item.enabled
    }),
  onSuccess
})

const deleteMutation = useMutation({
  mutationFn: (name: string) => ubusCall('ns.threatshield', 'delete-allowlist-url', { name }),
  onSuccess
})

function getDescription(item: AllowlistUrl) {
  return item.builtin ? t('standalone.threat_shield.nethesis_allowlist') : item.description || '-'
}

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
  toggleMutation.mutate({ ...item, enabled: !item.enabled })
}

function deleteItem() {
  if (selectedItem.value) {
    deleteMutation.mutate(selectedItem.value.name, {
      onSuccess: () => {
        showDeleteModal.value = false
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield.custom_feed_deleted')
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
    <NeSkeleton v-if="isPending || isSettingsPending" :lines="8" size="lg" />
    <div v-else class="flex flex-col gap-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <p class="max-w-2xl text-sm font-normal text-tertiary-neutral">
          {{ t('standalone.threat_shield.allowlist_feeds_description') }}
        </p>
        <NeButton
          v-if="settings?.enabled !== false"
          kind="primary"
          class="shrink-0 self-start"
          @click="openDrawer()"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" /> </template
          >{{ t('standalone.threat_shield.create_custom_feed') }}</NeButton
        >
      </div>
      <NeInlineNotification
        v-if="fetchError"
        kind="error"
        :title="t('error.cannot_retrieve_allowlist_urls')"
        :description="t(getAxiosErrorMessage(fetchError))"
      />
      <NeEmptyState
        v-else-if="settings && !settings.enabled"
        :title="t('standalone.threat_shield.threat_shield_disabled')"
        :description="t('standalone.threat_shield.threat_shield_disabled_description')"
        :icon="faShield"
        class="pb-8"
        ><NeButton
          kind="primary"
          @click="
            router.push(`${getStandaloneRoutePrefix()}/security/threat-shield-ip?tab=settings`)
          "
          ><template #prefix>
            <FontAwesomeIcon :icon="faArrowRight" class="h-4 w-4" aria-hidden="true" /> </template
          >{{ t('standalone.threat_shield.go_to_settings') }}</NeButton
        ></NeEmptyState
      >
      <template v-else>
        <NeInlineNotification
          v-if="toggleMutation.error.value"
          kind="error"
          :title="t('error.cannot_edit_custom_feed')"
          :description="t(getMutationErrorKey(toggleMutation.error.value, 'name'))"
        />
        <NeTextInput
          v-model="filter"
          class="sm:max-w-sm"
          :placeholder="t('standalone.threat_shield.filter_allowlists')"
          is-search
          :clear-search-label="t('ne_dropdown_filter.clear_search')"
        />
        <NeEmptyState
          v-if="filteredAllowlistUrls.length == 0"
          :title="t('standalone.threat_shield.no_allowlists_found')"
          :description="t('common.try_different_or_fewer_words')"
          :icon="faMagnifyingGlass"
          ><NeButton kind="tertiary" @click="filter = ''">{{
            t('common.clear_filter')
          }}</NeButton></NeEmptyState
        >
        <NeTable
          v-else
          :aria-label="t('standalone.threat_shield.allowlist_feeds')"
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
            <NeTableRow v-for="item in filteredAllowlistUrls" :key="item.name">
              <NeTableCell :data-label="t('standalone.threat_shield.name')">
                <div v-if="item.builtin" class="flex items-center gap-2">
                  {{ item.name }}
                  <NeTooltip>
                    <template #trigger>
                      <button
                        type="button"
                        class="inline-flex rounded-sm focus:ring-2 focus:ring-primary-500 focus:outline-hidden dark:focus:ring-primary-300"
                        :aria-label="
                          item.enabled
                            ? t('standalone.threat_shield.nethesis_allowlist_tooltip')
                            : t('standalone.threat_shield.nethesis_allowlist_unavailable_tooltip')
                        "
                      >
                        <FontAwesomeIcon
                          :icon="faCircleInfo"
                          class="size-4 text-indigo-500 dark:text-indigo-300"
                          aria-hidden="true"
                        />
                      </button>
                    </template>
                    <template #content>
                      {{
                        item.enabled
                          ? t('standalone.threat_shield.nethesis_allowlist_tooltip')
                          : t('standalone.threat_shield.nethesis_allowlist_unavailable_tooltip')
                      }}
                    </template>
                  </NeTooltip>
                </div>
                <template v-else>{{ item.name }}</template>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.threat_shield.description')">
                {{ getDescription(item) }}
              </NeTableCell>
              <NeTableCell :data-label="t('common.status')">
                <!-- the built-in list follows the subscription and cannot be switched -->
                <NeToggle
                  :model-value="item.enabled"
                  :disabled="item.builtin || toggleMutation.isPending.value"
                  :label="item.enabled ? t('common.enabled') : t('common.disabled')"
                  @update:model-value="onToggle(item)"
                />
              </NeTableCell>
              <NeTableCell :data-label="t('common.actions')">
                <div
                  v-if="!item.builtin"
                  class="-ml-2.5 flex gap-2 md:justify-end xl:-my-2 xl:ml-0"
                >
                  <NeButton kind="tertiary" @click="openDrawer(item)">
                    <template #prefix>
                      <FontAwesomeIcon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
                    </template>
                    {{ t('common.edit') }}
                  </NeButton>
                  <NeDropdown
                    :items="getDropdownItems(item)"
                    :align-to-right="true"
                    :open-menu-aria-label="t('ne_dropdown.open_menu')"
                  />
                </div>
              </NeTableCell>
            </NeTableRow>
          </NeTableBody>
        </NeTable>
      </template>
    </div>
    <CreateOrEditAllowlistUrlDrawer
      :is-shown="showDrawer"
      :item-to-edit="selectedItem"
      @close="showDrawer = false"
      @saved="
        notificationsStore.createNotification({
          kind: 'success',
          title: selectedItem
            ? t('standalone.threat_shield.custom_feed_updated')
            : t('standalone.threat_shield.custom_feed_created')
        })
      "
    />
    <NeModal
      :visible="showDeleteModal"
      kind="warning"
      primary-button-kind="danger"
      :title="t('standalone.threat_shield.delete_custom_feed')"
      :primary-label="t('common.delete')"
      :cancel-label="t('common.cancel')"
      :primary-button-disabled="deleteMutation.isPending.value"
      :primary-button-loading="deleteMutation.isPending.value"
      :close-aria-label="t('common.close')"
      @primary-click="deleteItem()"
      @close="showDeleteModal = false"
    >
      {{
        t('standalone.threat_shield.delete_custom_feed_message', {
          name: selectedItem?.name ?? ''
        })
      }}
      <NeInlineNotification
        v-if="deleteMutation.error.value"
        kind="error"
        :title="t('error.cannot_delete_custom_feed')"
        :description="t(getMutationErrorKey(deleteMutation.error.value, 'name'))"
        class="mt-4"
      />
    </NeModal>
  </div>
</template>
