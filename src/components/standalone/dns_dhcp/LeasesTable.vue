<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeDropdown } from '@nethesis/vue-components'
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
import type { StaticLease } from './StaticLeases.vue'
import type { DynamicLease } from './DynamicLeases.vue'
import { ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  leases: StaticLease[] | DynamicLease[]
  showDynamicLeases: boolean
}>()

const emit = defineEmits(['lease-delete', 'lease-edit', 'create-static-lease-from-dynamic'])

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.leases, {
  itemsPerPage: pageSize
})

function getDropdownItems(item: StaticLease) {
  return !props.showDynamicLeases
    ? [
        {
          id: 'delete',
          label: t('common.delete'),
          iconStyle: 'fas',
          icon: 'trash',
          danger: true,
          action: () => {
            emit('lease-delete', item)
          }
        }
      ]
    : [
        {
          id: 'create-static-lease',
          label: t('standalone.dns_dhcp.add_reservation'),
          iconStyle: 'fas',
          icon: 'circle-plus',
          action: () => {
            emit('create-static-lease-from-dynamic', item)
          }
        }
      ]
}
</script>

<template>
  <NeTable :ariaLabel="t('standalone.dns_dhcp.tabs.static_leases')" cardBreakpoint="xl">
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.hostname') }}</NeTableHeadCell>
      <NeTableHeadCell v-if="!showDynamicLeases">{{
        t('standalone.dns_dhcp.reservation_name')
      }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.interface') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.ip_address') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.mac_address') }}</NeTableHeadCell>
      <NeTableHeadCell v-if="showDynamicLeases">{{
        t('standalone.dns_dhcp.lease_expiration')
      }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
        <NeTableCell :data-label="t('standalone.dns_dhcp.hostname')">
          {{ item.hostname }}
        </NeTableCell>
        <NeTableCell
          v-if="!showDynamicLeases"
          :data-label="t('standalone.dns_dhcp.reservation_name')"
        >
          {{ item.description ? item.description : '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.interface')">
          <p v-if="!item.interface && !item.device">-</p>
          <p v-else>{{ item.interface }} ({{ item.device }})</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.ip_address')">
          {{ item.ipaddr }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.mac_address')">
          {{ item.macaddr }}
        </NeTableCell>
        <NeTableCell
          v-if="showDynamicLeases"
          :data-label="t('standalone.dns_dhcp.lease_expiration')"
        >
          {{ new Date(Number.parseInt(item.timestamp) * 1000).toLocaleDateString() }}
          {{ new Date(Number.parseInt(item.timestamp) * 1000).toLocaleTimeString() }}
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="align-center -ml-2.5 flex gap-2 xl:ml-0 xl:justify-end">
            <NeButton v-if="!showDynamicLeases" kind="tertiary" @click="emit('lease-edit', item)">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'pen-to-square']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('common.edit') }}
            </NeButton>
            <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.leases.length"
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
