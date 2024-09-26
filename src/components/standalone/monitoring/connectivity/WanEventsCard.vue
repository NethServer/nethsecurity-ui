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
  formatDateLoc
} from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WanEvent } from '../ConnectivityMonitor.vue'

const props = defineProps<{
  wan: string
  wanEvents: WanEvent[]
}>()

const { t } = useI18n()

const pageSize = ref(5)
const { currentPage, paginatedItems } = useItemPagination(() => props.wanEvents, {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeCard
    :title="
      t('standalone.real_time_monitor.wan_name_events', {
        name: props.wan
      })
    "
  >
    <NeTable
      :ariaLabel="
        t('standalone.real_time_monitor.wan_name_events', {
          name: props.wan
        })
      "
      cardBreakpoint="sm"
      class="mt-2"
    >
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.timestamp') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.event') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="item in paginatedItems" :key="item.time">
          <NeTableCell :data-label="t('standalone.real_time_monitor.timestamp')">
            {{ formatDateLoc(new Date(Number(item.time) * 1000), 'PPpp') || '-' }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.real_time_monitor.event')">
            <div class="flex items-center gap-2">
              <font-awesome-icon
                :icon="['fas', item.status ? 'circle-check' : 'circle-xmark']"
                :class="[
                  'h-4 w-4',
                  item.status
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-rose-600 dark:text-rose-400'
                ]"
                aria-hidden="true"
              />
              {{
                item.status
                  ? t('standalone.real_time_monitor.online')
                  : t('standalone.real_time_monitor.offline')
              }}
            </div>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="wanEvents.length"
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
