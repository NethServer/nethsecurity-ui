<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeButton,
  NeEmptyState,
  NeDropdown
} from '@nethesis/vue-components'
import { ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DnsBlockedDomain } from '@/stores/standalone/threatShield'
import { faCircleInfo, faPenToSquare } from '@fortawesome/free-solid-svg-icons'

const props = defineProps({
  filteredDomains: {
    type: Array as PropType<DnsBlockedDomain[]>,
    required: true
  },
  loading: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['reloadData', 'editDomain', 'deleteDomain', 'clearFilter'])

const { t } = useI18n()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.filteredDomains, {
  itemsPerPage: pageSize
})

function getKebabMenuItems(domain: DnsBlockedDomain) {
  return [
    {
      id: 'deleteHostSet',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      danger: true,
      action: () => emit('deleteDomain', domain),
      disabled: false
    }
  ]
}
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.threat_shield_dns.blocked_domains')"
    cardBreakpoint="lg"
    :loading="loading"
    :skeletonColumns="3"
    :skeletonRows="6"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.threat_shield_dns.domain') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.threat_shield_dns.description') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <!-- no domains matching filter -->
      <NeTableRow v-if="!props.filteredDomains.length">
        <NeTableCell colspan="3">
          <NeEmptyState
            :title="t('standalone.threat_shield_dns.no_domain_found')"
            :description="t('common.try_changing_search_filter')"
            :icon="faCircleInfo"
            class="bg-white dark:bg-gray-950"
          >
            <NeButton kind="tertiary" @click="emit('clearFilter')">
              {{ t('common.clear_filter') }}</NeButton
            >
          </NeEmptyState>
        </NeTableCell>
      </NeTableRow>
      <NeTableRow v-else v-for="(item, index) in paginatedItems" :key="index">
        <NeTableCell :data-label="t('standalone.threat_shield_dns.domain')">
          {{ item.address }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.threat_shield_dns.description')">
          {{ item.description || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-2.5 flex gap-2 xl:ml-0 xl:justify-end">
            <NeButton kind="tertiary" @click="emit('editDomain', item)">
              <template #prefix>
                <font-awesome-icon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('common.edit') }}
            </NeButton>
            <!-- kebab menu -->
            <NeDropdown :items="getKebabMenuItems(item)" :alignToRight="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.filteredDomains.length"
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
