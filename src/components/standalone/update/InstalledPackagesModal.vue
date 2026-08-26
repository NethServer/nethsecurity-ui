<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeModal,
  NePaginator,
  NeSortDropdown,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  useItemPagination,
  useSort,
  type SortEvent
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus'
import { faBoxOpen } from '@fortawesome/free-solid-svg-icons'

export type InstalledPackage = {
  name: string
  version: string
  description: string
}

type InstalledPackagesResponse = {
  data: {
    packages: InstalledPackage[]
  }
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const searchTerm = ref('')
const sortKey = ref<keyof InstalledPackage>('name')
const sortDescending = ref(false)
const pageSize = ref(25)

const {
  data: packages,
  isPending,
  isError,
  error
} = useQuery({
  queryKey: ['update', 'installed-packages'],
  queryFn: ({ signal }) =>
    ubusCall<InstalledPackagesResponse>('ns.update', 'list-installed-packages', {}, { signal }),
  select: (response) => response.data.packages,
  enabled: () => props.visible,
  staleTime: 60_000,
  refetchOnWindowFocus: false
})

const filteredPackages = computed(() => {
  if (!packages.value) {
    return []
  }
  if (!searchTerm.value) {
    return packages.value
  }
  const search = searchTerm.value.toLowerCase()
  return packages.value.filter(
    (item) =>
      item.name.toLowerCase().includes(search) ||
      item.version.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
  )
})

const { sortedItems } = useSort(() => filteredPackages.value, sortKey, sortDescending)

const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
  itemsPerPage: pageSize
})

function onSort(payload: SortEvent) {
  sortKey.value = payload.key as keyof InstalledPackage
  sortDescending.value = payload.descending
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      searchTerm.value = ''
      currentPage.value = 1
    }
  }
)
</script>

<template>
  <NeModal
    :visible="visible"
    kind="neutral"
    size="xxl"
    :title="t('standalone.update.installed_packages')"
    :primary-label="t('common.close')"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="emit('close')"
  >
    <div class="space-y-6">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('standalone.update.installed_packages_description') }}
      </p>
      <NeInlineNotification
        v-if="isError"
        :title="t('error.cannot_retrieve_installed_packages')"
        :description="t(getAxiosErrorMessage(error))"
        kind="error"
      />
      <template v-else>
        <div class="flex flex-wrap items-end gap-4">
          <NeTextInput
            v-model="searchTerm"
            :disabled="isPending"
            :placeholder="t('common.filter')"
            is-search
          />
          <NeSortDropdown
            v-model:sort-key="sortKey"
            v-model:sort-descending="sortDescending"
            :label="t('sort.sort')"
            :options="[
              { id: 'name', label: t('standalone.update.package_name') },
              { id: 'version', label: t('standalone.update.package_version') }
            ]"
            :open-menu-aria-label="t('ne_dropdown.open_menu')"
            :sort-by-label="t('sort.sort_by')"
            :sort-direction-label="t('sort.direction')"
            :ascending-label="t('sort.ascending')"
            :descending-label="t('sort.descending')"
            class="md:hidden"
          />
        </div>
        <div class="max-h-[60vh] overflow-y-auto">
          <NeTable
            :aria-label="t('standalone.update.installed_packages')"
            :loading="isPending"
            :skeleton-columns="3"
            :skeleton-rows="10"
            :sort-key="sortKey"
            :sort-descending="sortDescending"
            card-breakpoint="md"
          >
            <NeTableHead>
              <NeTableHeadCell column-key="name" sortable @sort="onSort">
                {{ t('standalone.update.package_name') }}
              </NeTableHeadCell>
              <NeTableHeadCell column-key="version" sortable @sort="onSort">
                {{ t('standalone.update.package_version') }}
              </NeTableHeadCell>
              <NeTableHeadCell>
                {{ t('standalone.update.package_description') }}
              </NeTableHeadCell>
            </NeTableHead>
            <NeTableBody v-if="sortedItems.length > 0">
              <NeTableRow v-for="item in paginatedItems" :key="item.name">
                <NeTableCell :data-label="t('standalone.update.package_name')">
                  {{ item.name }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.update.package_version')">
                  {{ item.version || '-' }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.update.package_description')">
                  {{ item.description || '-' }}
                </NeTableCell>
              </NeTableRow>
            </NeTableBody>
            <NeTableBody v-else-if="!isPending">
              <NeTableRow>
                <NeTableCell colspan="3">
                  <NeEmptyState
                    :icon="faBoxOpen"
                    :title="
                      searchTerm
                        ? t('standalone.update.no_installed_packages_found')
                        : t('standalone.update.no_installed_packages')
                    "
                    :description="
                      searchTerm
                        ? t('standalone.update.no_installed_packages_found_description')
                        : ''
                    "
                    class="bg-white dark:bg-gray-950"
                  >
                    <NeButton v-if="searchTerm" kind="tertiary" @click="searchTerm = ''">
                      {{ t('common.clear_filter') }}
                    </NeButton>
                  </NeEmptyState>
                </NeTableCell>
              </NeTableRow>
            </NeTableBody>
            <template v-if="sortedItems.length > 0" #paginator>
              <NePaginator
                :current-page="currentPage"
                :total-rows="sortedItems.length"
                :page-size="pageSize"
                :nav-pagination-label="t('ne_table.pagination')"
                :next-label="t('ne_table.go_to_next_page')"
                :previous-label="t('ne_table.go_to_previous_page')"
                :range-of-total-label="t('ne_table.of')"
                :page-size-label="t('ne_table.show')"
                @select-page="
                  (page: number) => {
                    currentPage = page
                  }
                "
                @select-page-size="
                  (size: number) => {
                    pageSize = size
                  }
                "
              />
            </template>
          </NeTable>
        </div>
      </template>
    </div>
  </NeModal>
</template>
