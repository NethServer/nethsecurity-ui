<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeCard,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeEmptyState
} from '@nethesis/vue-components'
import { kbpsFormat } from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { type TopItem } from '@/composables/useTopTalkers'

const props = defineProps<{
  topProtocols: TopItem[]
  loading: boolean
  error: string
  errorDescription: string
}>()

const { t } = useI18n()

const pageSize = ref(5)
const { currentPage, paginatedItems } = useItemPagination(() => props.topProtocols, {
  itemsPerPage: pageSize
})

function formatTraffic(value: number) {
  return kbpsFormat((value / 1000) * 8)
}
</script>

<template>
  <NeCard
    :title="t('standalone.real_time_monitor.protocols')"
    :skeletonLines="5"
    :errorTitle="error"
    :errorDescription="errorDescription"
  >
    <NeTable
      :ariaLabel="t('standalone.real_time_monitor.protocols')"
      cardBreakpoint="sm"
      class="mt-2"
    >
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.protocol') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.traffic') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-if="!paginatedItems.length">
          <NeTableCell colspan="9">
            <NeEmptyState
              :title="t('common.no_data_available')"
              :icon="['fas', 'table']"
              class="bg-white dark:bg-gray-950"
            />
          </NeTableCell>
        </NeTableRow>
        <NeTableRow v-else v-for="(item, index) in paginatedItems" :key="index">
          <NeTableCell :data-label="t('standalone.real_time_monitor.protocol')">
            {{ item.name }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.real_time_monitor.traffic')">
            {{ formatTraffic(item.value) }}
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="props.topProtocols.length"
          :page-size="pageSize"
          :page-sizes="[5, 10]"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :page-size-label="t('ne_table.show')"
          @select-page="
            (page: number) => {
              currentPage = page
            }"
          @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
        />
      </template>
    </NeTable>
  </NeCard>
</template>
