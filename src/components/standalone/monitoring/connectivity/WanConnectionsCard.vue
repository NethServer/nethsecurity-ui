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
  useItemPagination
} from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Wan } from '../ConnectivityMonitor.vue'

const props = defineProps<{
  wanConnections: Wan[]
}>()

const { t } = useI18n()

const pageSize = ref(5)
const { currentPage, paginatedItems } = useItemPagination(() => props.wanConnections, {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeCard :title="t('standalone.real_time_monitor.wans')">
    <NeTable :ariaLabel="t('standalone.real_time_monitor.wans')" cardBreakpoint="sm" class="mt-2">
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.interface') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.device') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('common.status') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('common.ip_address') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
          <NeTableCell :data-label="t('standalone.real_time_monitor.interface')">
            {{ item.iface }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.real_time_monitor.device')">
            {{ item.device }}
          </NeTableCell>
          <NeTableCell :data-label="t('common.status')">
            <div class="flex items-center gap-2">
              <font-awesome-icon
                :icon="['fas', item.status == 'online' ? 'circle-check' : 'circle-xmark']"
                :class="[
                  'h-4 w-4',
                  item.status == 'online'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-rose-600 dark:text-rose-400'
                ]"
                aria-hidden="true"
              />
              {{
                item.status == 'online'
                  ? t('standalone.real_time_monitor.online')
                  : t('standalone.real_time_monitor.offline')
              }}
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('common.ip_address')">
            <span v-if="item.ip4Addresses.length || item.ip6Addresses.length">
              {{ (item.ip4Addresses || []).concat(item.ip6Addresses || []).join(', ') }}
            </span>
            <span v-else>-</span>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="wanConnections.length"
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
