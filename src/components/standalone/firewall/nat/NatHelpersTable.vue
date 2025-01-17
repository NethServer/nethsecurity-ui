<!--
  Copyright (C) 2024 Nethesis S.r.l.
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
  NeTooltip,
  NeEmptyState
} from '@nethesis/vue-components'
import { ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NatHelper } from '@/stores/standalone/firewall'

const props = defineProps({
  filteredNatHelpers: {
    type: Array as PropType<NatHelper[]>,
    required: true
  },
  totalNatHelpers: {
    type: Number,
    required: true
  },
  loading: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['reloadNatHelpers', 'editNatHelper', 'clearFilters'])

const { t } = useI18n()
const pageSize = ref(25)
const { currentPage, paginatedItems } = useItemPagination(() => props.filteredNatHelpers, {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.nat_helpers.title')"
    cardBreakpoint="xl"
    :loading="loading"
    :skeletonColumns="4"
    :skeletonRows="7"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.nat_helpers.module') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.nat_helpers.status') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.nat_helpers.loaded_on_kernel') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <!-- empty state -->
      <NeTableRow v-if="!props.totalNatHelpers">
        <NeTableCell colspan="4">
          <NeEmptyState
            :title="t('ne_table.no_items')"
            :icon="['fas', 'table']"
            class="bg-white dark:bg-gray-950"
          />
        </NeTableCell>
      </NeTableRow>
      <!-- no nat helper matching filter -->
      <NeTableRow v-else-if="!props.filteredNatHelpers.length">
        <NeTableCell colspan="4">
          <NeEmptyState
            :title="t('standalone.nat_helpers.no_nat_helpers_found')"
            :description="t('common.try_changing_search_filters')"
            :icon="['fas', 'circle-info']"
            class="bg-white dark:bg-gray-950"
          >
            <NeButton kind="tertiary" @click="emit('clearFilters')">
              {{ t('common.clear_filters') }}</NeButton
            >
          </NeEmptyState>
        </NeTableCell>
      </NeTableRow>
      <NeTableRow v-else v-for="(item, index) in paginatedItems" :key="index">
        <NeTableCell :data-label="t('standalone.nat_helpers.module')">
          {{ item.name }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.nat_helpers.status')">
          <div class="flex items-center gap-2">
            <font-awesome-icon
              :icon="['fas', item.enabled ? 'circle-check' : 'circle-xmark']"
              :class="['h-4 w-4', { 'text-green-600 dark:text-green-400': item.enabled }]"
              aria-hidden="true"
            />
            {{ item.enabled ? t('common.enabled') : t('common.disabled') }}
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.nat_helpers.loaded_on_kernel')">
          <div class="flex items-center gap-2">
            <span>
              {{
                item.loaded
                  ? t('standalone.nat_helpers.loaded')
                  : t('standalone.nat_helpers.not_loaded')
              }}
            </span>
            <!-- module enabled but not loaded warning -->
            <NeTooltip v-if="item.enabled && !item.loaded">
              <template #trigger>
                <font-awesome-icon
                  :icon="['fas', 'triangle-exclamation']"
                  class="h-4 w-4 text-amber-500"
                />
              </template>
              <template #content>
                <p>
                  {{ t('standalone.nat_helpers.enabled_but_not_loaded_tooltip') }}
                </p>
              </template>
            </NeTooltip>
            <!-- module disabled but loaded warning -->
            <NeTooltip v-else-if="!item.enabled && item.loaded">
              <template #content>
                <p>
                  {{ t('standalone.nat_helpers.disabled_but_loaded_tooltip') }}
                </p>
              </template>
            </NeTooltip>
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-2.5 flex xl:ml-0 xl:justify-end">
            <NeButton kind="tertiary" @click="emit('editNatHelper', item)">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'pen-to-square']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('common.edit') }}
            </NeButton>
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.filteredNatHelpers.length"
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
