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

interface Tunnel {
  id: string
  name: string
  type: string
  connected: boolean
}

const props = defineProps<{
  tunnels: Tunnel[]
  tunnelDevices: Record<string, string>
}>()

const { t } = useI18n()

const pageSize = ref(5)
const { currentPage, paginatedItems } = useItemPagination(() => props.tunnels, {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeCard :title="t('standalone.real_time_monitor.configured_tunnels')">
    <NeTable
      :ariaLabel="t('standalone.real_time_monitor.configured_tunnels')"
      cardBreakpoint="sm"
      class="mt-2"
    >
      <NeTableHead>
        <NeTableHeadCell>{{ t('common.name') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('common.type') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.device') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('common.status') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
          <NeTableCell :data-label="t('common.name')">
            {{ item.name }}
          </NeTableCell>
          <NeTableCell :data-label="t('common.type')">
            {{ t(`standalone.real_time_monitor.tunnel_${item.type}`) }}
          </NeTableCell>
          <NeTableCell :data-label="t('common.device')">
            {{ props.tunnelDevices[item.id] ? props.tunnelDevices[item.id] : '-' }}
          </NeTableCell>
          <NeTableCell :data-label="t('common.status')">
            <div class="flex items-center gap-2">
              <font-awesome-icon
                :icon="['fas', item.connected ? 'circle-check' : 'circle-xmark']"
                :class="[
                  'h-4 w-4',
                  item.connected
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-rose-600 dark:text-rose-400'
                ]"
                aria-hidden="true"
              />
              {{
                item.connected
                  ? t('standalone.openvpn_tunnel.connected')
                  : t('standalone.openvpn_tunnel.not_connected')
              }}
            </div>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="props.tunnels.length"
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
