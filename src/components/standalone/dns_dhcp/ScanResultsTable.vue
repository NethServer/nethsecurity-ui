<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import { ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ScanResult } from './ScanNetwork.vue'

const props = defineProps({
  results: {
    type: Array as PropType<ScanResult[]>,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['addIpReservation', 'addDnsRecord'])

const { t } = useI18n()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.results, {
  itemsPerPage: pageSize
})

function getKebabMenuItems(scanResult: ScanResult) {
  return [
    {
      id: 'addIpReservation',
      label: t('standalone.dns_dhcp.add_reservation'),
      icon: 'circle-plus',
      iconStyle: 'fas',
      action: () => emit('addIpReservation', scanResult)
    },
    {
      id: 'addDnsRecord',
      label: t('standalone.dns_dhcp.add_dns_record'),
      icon: 'circle-plus',
      iconStyle: 'fas',
      action: () => emit('addDnsRecord', scanResult)
    }
  ]
}
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.dns_dhcp.scan_results')"
    cardBreakpoint="xl"
    :loading="loading"
    :skeletonColumns="5"
    :skeletonRows="5"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.ip_address') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.mac_address') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.hostname') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.description') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.ip">
        <NeTableCell :data-label="t('standalone.dns_dhcp.ip_address')">
          {{ item.ip || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.mac_address')">
          {{ item.mac || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.hostname')">
          {{ item.hostname || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.description')">
          {{ item.description || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="flex justify-end">
            <NeDropdown :items="getKebabMenuItems(item)" :alignToRight="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.results.length"
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
