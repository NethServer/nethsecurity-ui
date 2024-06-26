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
import { ref, withDefaults, defineProps } from 'vue'
const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    conntrackRecords: ConntrackRecord[]
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits(['record-delete'])

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.conntrackRecords, {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.dns_dhcp.scan_conntrackRecords')"
    cardBreakpoint="xl"
    :loading="loading"
    :skeletonColumns="5"
    :skeletonRows="5"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.conntrack.source') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.destination') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.protocol') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.statistics') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.state') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.timeout') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.source">
        <NeTableCell :data-label="t('standalone.conntrack.source')">
          {{ item.source }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.destination')">
          {{ item.destination }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.protocol')">
          {{ item.protocol }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.statistics')">
          {{ item.statistics }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.state')">
          {{ item.state || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.timeout')">
          {{ item.timeout }}
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="align-center flex justify-end">
            <NeButton kind="tertiary" @click="emit('record-delete', item)">
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
