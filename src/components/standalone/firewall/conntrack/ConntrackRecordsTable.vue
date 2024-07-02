<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import type { ConntrackRecord } from './ConntrackContent.vue'
import { ref } from 'vue'
import { byteFormat1024 } from '@nethesis/vue-components'
const { t } = useI18n()

const props = defineProps<{
  conntrackRecords: ConntrackRecord[]
}>()

const emit = defineEmits<{
  delete: [item: ConntrackRecord]
}>()

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.conntrackRecords, {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.dns_dhcp.scan_conntrackRecords')"
    cardBreakpoint="xl"
    :skeletonColumns="5"
    :skeletonRows="5"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.conntrack.source') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.destination') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.protocol') }}</NeTableHeadCell>
      <NeTableHeadCell
        >{{ t('standalone.conntrack.download') }} /
        {{ t('standalone.conntrack.upload') }}</NeTableHeadCell
      >
      <NeTableHeadCell>{{ t('standalone.conntrack.state') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.timeout') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.source_port">
        <NeTableCell :data-label="t('standalone.conntrack.source')">
          {{ item.source }}:{{ item.source_port }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.destination')">
          {{ item.destination }}:{{ item.destination_port }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.protocol')">
          {{ item.protocol.toUpperCase() }}
        </NeTableCell>
        <NeTableCell
          :data-label="`${t('standalone.conntrack.download')} / ${t(
            'standalone.conntrack.upload'
          )}`"
        >
          {{ byteFormat1024(item.source_stats.bytes) }} /
          {{ byteFormat1024(item.destination_stats.bytes) }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.state')">
          {{ item.state || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.timeout')">
          {{ item.timeout }} s
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="align-center -ml-2.5 flex xl:ml-0 xl:justify-end">
            <NeButton kind="tertiary" @click="emit('delete', item)">
              <template #prefix>
                <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('common.delete') }}
            </NeButton>
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.conntrackRecords.length"
        :page-size="pageSize"
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
</template>
