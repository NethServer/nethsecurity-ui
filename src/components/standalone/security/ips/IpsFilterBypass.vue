<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeDropdown,
  type NeDropdownItem,
  NeEmptyState,
  NeInlineNotification,
  NePaginator,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  useItemPagination,
  useSort
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { faCircleInfo, faCirclePlus, faShield } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref } from 'vue'
import IpsCreateBypassDrawer from '@/components/standalone/security/ips/IpsCreateBypassDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import IpsEnabledBadge from '@/components/standalone/security/ips/IpsEnabledBadge.vue'
import IpsDeleteBypassModal from '@/components/standalone/security/ips/IpsDeleteBypassModal.vue'

export type Direction = 'src' | 'dst'
export type AddressType = 'ipv4' | 'ipv6'

export type Bypass = {
  direction: Direction
  protocol: AddressType
  ip: string
  description: string
}

type BypassResponse = {
  bypasses: Bypass[]
}

const changes = useUciPendingChangesStore()
const { t } = useI18n()

const creatingBypass = ref(false)

const bypasses = ref<Bypass[]>([])
const loading = ref(true)
const error = ref<Error>()

function listBypasses() {
  loading.value = true
  ubusCall('ns.snort', 'list-bypasses', {})
    .then((response: AxiosResponse<BypassResponse>) => {
      bypasses.value = response.data.bypasses
    })
    .catch((e: Error) => {
      error.value = e
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  listBypasses()
})

const filter = ref('')
const filteredByPasses = computed((): Bypass[] => {
  return bypasses.value.filter((byPass) => {
    return byPass.ip.includes(filter.value)
  })
})

const sortKey = ref<keyof Bypass>('ip')
const sortDescending = ref(false)
const { sortedItems } = useSort(filteredByPasses, sortKey, sortDescending, {})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(sortedItems, {
  itemsPerPage: pageSize
})

// FIXME: when types from library are fixed, use proper type
const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}

function savedBypass() {
  listBypasses()
  creatingBypass.value = false
  changes.getChanges()
}

function dropDownActions(bypass: Bypass): NeDropdownItem[] {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      danger: true,
      action: () => {
        bypassToDelete.value = bypass
      }
    }
  ]
}

const bypassToDelete = ref<Bypass>()

function handleDeleted() {
  // Being unable to give an ID to the bypasses, we just fetch again the list
  listBypasses()
  bypassToDelete.value = undefined
  changes.getChanges()
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.ips.filter_bypass_description') }}
      </p>
      <IpsEnabledBadge />
    </div>

    <NeInlineNotification
      v-if="error"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('standalone.ips.error_loading_bypasses')"
      kind="error"
    />
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else-if="bypasses.length > 0">
      <div class="flex flex-col flex-wrap justify-between gap-4 md:flex-row">
        <NeTextInput v-model.trim="filter" :placeholder="t('common.filter')" is-search />
        <NeButton
          kind="secondary"
          v-if="bypasses.length > 0"
          size="lg"
          @click="creatingBypass = true"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.ips.add_bypass') }}
        </NeButton>
      </div>
      <NeTable
        :ariaLabel="t('standalone.ips.title')"
        :skeleton-columns="7"
        :skeleton-rows="5"
        :sortDescending="sortDescending"
        :sortKey="sortKey"
        card-breakpoint="xl"
      >
        <NeTableHead>
          <NeTableHeadCell column-key="ip" sortable @sort="onSort">
            {{ t('standalone.ips.bypass_address') }}
          </NeTableHeadCell>
          <NeTableHeadCell column-key="direction" sortable @sort="onSort">
            {{ t('standalone.ips.bypass_direction') }}
          </NeTableHeadCell>
          <NeTableHeadCell>{{ t('standalone.ips.description') }}</NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-if="filteredByPasses.length < 1">
            <NeTableCell colspan="4">
              <NeEmptyState
                :description="t('common.try_changing_search_filters')"
                :icon="faCircleInfo"
                :title="t('standalone.ips.no_bypasses_found')"
                class="bg-white dark:bg-gray-950"
              >
                <NeButton kind="tertiary" @click="filter = ''">
                  {{ t('common.clear_filters') }}
                </NeButton>
              </NeEmptyState>
            </NeTableCell>
          </NeTableRow>
          <NeTableRow v-else v-for="item in paginatedItems" :key="`${item.ip}-${item.direction}`">
            <NeTableCell :data-label="t('standalone.ips.bypass_address')">
              {{ item.ip }}
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.ips.bypass_direction')">
              <template v-if="item.direction == 'src'">
                {{ t('standalone.ips.source') }}
              </template>
              <template v-else>
                {{ t('standalone.ips.destination') }}
              </template>
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.ips.description')">
              {{ item.description }}
            </NeTableCell>
            <NeTableCell :data-label="t('common.actions')">
              <div class="flex justify-end">
                <NeDropdown :items="dropDownActions(item)" :align-to-right="true" />
              </div>
            </NeTableCell>
          </NeTableRow>
        </NeTableBody>
        <template #paginator>
          <NePaginator
            :current-page="currentPage"
            :nav-pagination-label="t('ne_table.pagination')"
            :next-label="t('ne_table.go_to_next_page')"
            :page-size="pageSize"
            :page-size-label="t('ne_table.show')"
            :previous-label="t('ne_table.go_to_previous_page')"
            :range-of-total-label="t('ne_table.of')"
            :total-rows="bypasses.length"
            @selectPageSize="(size: number) => { pageSize = size }"
            @select-page="(page: number) => { currentPage = page }"
          />
        </template>
      </NeTable>
    </template>
    <NeEmptyState v-else :icon="faShield" :title="t('standalone.ips.no_filter_bypass')">
      <NeButton kind="primary" size="lg" @click="creatingBypass = true">
        <template #prefix>
          <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('standalone.ips.add_bypass') }}
      </NeButton>
    </NeEmptyState>
    <IpsCreateBypassDrawer
      :visible="creatingBypass"
      @close="creatingBypass = false"
      @save="savedBypass()"
    />
    <IpsDeleteBypassModal
      :bypass="bypassToDelete"
      @close="bypassToDelete = undefined"
      @deleted="handleDeleted()"
    />
  </div>
</template>
