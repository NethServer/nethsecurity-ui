<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeDropdown,
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
import type { BanIpLocalAddress } from '@/views/standalone/security/ThreatShieldView.vue'
import { ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  addressList: BanIpLocalAddress[]
  addressKind: 'block' | 'allow'
}>()

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.addressList, {
  itemsPerPage: pageSize
})

const emit = defineEmits<{
  delete: [item: BanIpLocalAddress]
  edit: [item: BanIpLocalAddress]
}>()

function getDropdownItems(item: BanIpLocalAddress) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('delete', item)
      }
    }
  ]
}
</script>

<template>
  <NeTable
    :ariaLabel="
      addressKind == 'block'
        ? t('standalone.threat_shield.blocked_addresses')
        : t('standalone.threat_shield.allowed_addresses')
    "
    class="z-10"
  >
    <NeTableHead>
      <NeTableHeadCell>
        {{
          addressKind == 'block'
            ? t('standalone.threat_shield.blocked_address')
            : t('standalone.threat_shield.allowed_address')
        }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.threat_shield.description') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
        <NeTableCell
          :data-label="
            addressKind == 'block'
              ? t('standalone.threat_shield.blocked_address')
              : t('standalone.threat_shield.allowed_address')
          "
        >
          {{ item.address }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.threat_shield.description')">
          {{ item.description ? item.description : '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-2.5 flex gap-2 md:justify-end xl:ml-0">
            <NeButton kind="tertiary" @click="emit('edit', item)">
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
        :total-rows="props.addressList.length"
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
