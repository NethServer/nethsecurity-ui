<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import IpsEnabledBadge from '@/components/standalone/security/ips/IpsEnabledBadge.vue'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
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
import { faCircleInfo, faCirclePlus, faShield } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import IpsSuppressAlertDrawer from '@/components/standalone/security/ips/IpsSuppressAlertDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import IpsRestoreSuppressedAlertModal from '@/components/standalone/security/ips/IpsRestoreSuppressedAlertModal.vue'
import IpsSnortDocLink from '@/components/standalone/security/ips/IpsSnortDocLink.vue'

export type Direction = 'by_src' | 'by_dst'

export type SuppressedAlert = {
  gid: string
  sid: string
  direction: Direction
  ip: string
  description: string
}

type Response = AxiosResponse<{
  alerts: SuppressedAlert[]
}>

const changes = useUciPendingChangesStore()
const { t } = useI18n()

const suppressedAlerts = ref<SuppressedAlert[]>([])
const loading = ref(true)
const error = ref<Error>()

function loadSuppressedAlerts() {
  loading.value = true
  ubusCall('ns.snort', 'list-suppressed-alerts', {})
    .then((response: Response) => {
      suppressedAlerts.value = response.data.alerts
    })
    .catch((reason: Error) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  loadSuppressedAlerts()
})

const filter = ref('')
const filteredAlerts = computed((): SuppressedAlert[] => {
  return suppressedAlerts.value.filter((alert) => {
    return Object.values(alert).some((value) => {
      return value.toLowerCase().includes(filter.value.toLowerCase())
    })
  })
})

const sortKey = ref<keyof SuppressedAlert>('sid')
const sortDescending = ref(false)
const { sortedItems } = useSort(filteredAlerts, sortKey, sortDescending, {})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(sortedItems, {
  itemsPerPage: pageSize
})

const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}

const suppressingAlert = ref(false)
function handleSuppress() {
  changes.getChanges()
  loadSuppressedAlerts()
  suppressingAlert.value = false
}

function dropDownActions(suppressedAlert: SuppressedAlert): NeDropdownItem[] {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      danger: true,
      action: () => {
        suppressionToDelete.value = suppressedAlert
      }
    }
  ]
}
const suppressionToDelete = ref<SuppressedAlert>()
function handleDeleted() {
  loadSuppressedAlerts()
  suppressionToDelete.value = undefined
  changes.getChanges()
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.ips.suppressed_alerts_description') }}
      </p>
      <IpsEnabledBadge />
    </div>

    <NeInlineNotification
      v-if="error"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('standalone.ips.error_loading_suppressed_alerts')"
      kind="error"
    />
    <NeSkeleton v-if="loading" size="lg" :lines="10" />
    <template v-else-if="suppressedAlerts.length > 0">
      <div class="flex flex-col flex-wrap justify-between gap-4 md:flex-row">
        <NeTextInput v-model.trim="filter" :placeholder="t('common.filter')" is-search />
        <NeButton kind="secondary" size="lg" @click="suppressingAlert = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.ips.add_bypass') }}
        </NeButton>
      </div>
      <NeTable
        :ariaLabel="t('standalone.ips.suppressed_alerts_tab')"
        :skeleton-columns="7"
        :skeleton-rows="5"
        :sortDescending="sortDescending"
        :sortKey="sortKey"
        card-breakpoint="xl"
      >
        <NeTableHead>
          <NeTableHeadCell column-key="description" sortable @sort="onSort">
            {{ t('standalone.ips.description') }}
          </NeTableHeadCell>
          <NeTableHeadCell column-key="sid" sortable @sort="onSort">
            {{ t('standalone.ips.table_id_description') }}
          </NeTableHeadCell>
          <NeTableHeadCell column-key="direction" sortable @sort="onSort">
            {{ t('standalone.ips.direction') }}
          </NeTableHeadCell>
          <NeTableHeadCell column-key="ip" sortable @sort="onSort">
            {{ t('standalone.ips.address') }}
          </NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-if="filteredAlerts.length < 1">
            <NeTableCell colspan="5">
              <NeEmptyState
                :description="t('common.try_changing_search_filters')"
                :icon="faCircleInfo"
                :title="t('standalone.ips.no_suppressed_alerts_found')"
                class="bg-white dark:bg-gray-950"
              >
                <NeButton kind="tertiary" @click="filter = ''">
                  {{ t('common.clear_filters') }}
                </NeButton>
              </NeEmptyState>
            </NeTableCell>
          </NeTableRow>
          <NeTableRow v-else v-for="item in paginatedItems" :key="`${item.ip}-${item.direction}`">
            <NeTableCell :data-label="t('standalone.ips.description')">
              {{ item.description }}
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.ips.table_id_description')">
              <IpsSnortDocLink :gid="item.gid" :sid="item.sid" />
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.ips.direction')">
              <template v-if="item.direction == 'by_src'">
                {{ t('standalone.ips.source') }}
              </template>
              <template v-else>
                {{ t('standalone.ips.destination') }}
              </template>
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.ips.address')">
              {{ item.ip }}
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
            :total-rows="suppressedAlerts.length"
            @selectPageSize="(size: number) => { pageSize = size }"
            @select-page="(page: number) => { currentPage = page }"
          />
        </template>
      </NeTable>
    </template>
    <NeEmptyState v-else :icon="faShield" :title="t('standalone.ips.no_suppressed_alerts')">
      <NeButton kind="primary" size="lg" @click="suppressingAlert = true">
        <template #prefix>
          <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('standalone.ips.add_suppressed_alert') }}
      </NeButton>
    </NeEmptyState>
  </div>
  <IpsSuppressAlertDrawer
    @suppress="handleSuppress()"
    :visible="suppressingAlert"
    @close="suppressingAlert = false"
  />
  <IpsRestoreSuppressedAlertModal
    :alert="suppressionToDelete"
    @close="suppressionToDelete = undefined"
    @restored="handleDeleted()"
  />
</template>
