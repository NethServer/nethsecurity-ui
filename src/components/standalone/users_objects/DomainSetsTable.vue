<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeBadge
} from '@nethesis/vue-components'
import { ref, type PropType } from 'vue'
import { library as faLibrary } from '@fortawesome/fontawesome-svg-core'
import { faCloud } from '@fortawesome/free-solid-svg-icons'
import type { DomainSet } from '@/composables/useDomainSets'

const props = defineProps({
  filteredDomainSets: {
    type: Array as PropType<DomainSet[]>
  },
  loading: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits<{
  editDomainSet: [item: DomainSet]
  deleteDomainSet: [item: DomainSet]
  showUsagesDomainSet: [item: DomainSet]
}>()

const { t } = useI18n()

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.filteredDomainSets, {
  itemsPerPage: pageSize
})

faLibrary.add(faCloud)

function getKebabMenuItems(domainSet: DomainSet) {
  return [
    {
      id: 'showUsagesDomainSet',
      label: t('standalone.objects.show_usages'),
      icon: 'magnifying-glass-plus',
      iconStyle: 'fas',
      action: () => emit('showUsagesDomainSet', domainSet),
      disabled: !domainSet.used
    },
    {
      id: 'deleteDomainSet',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      danger: true,
      action: () => emit('deleteDomainSet', domainSet)
    }
  ]
}
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.objects.domain_sets')"
    cardBreakpoint="xl"
    :loading="loading"
    :skeletonRows="6"
  >
    <NeTableHead>
      <NeTableHeadCell>
        {{ t('standalone.objects.name') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.objects.ip_version') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.objects.domains') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.id">
        <!-- name -->
        <NeTableCell :data-label="t('standalone.objects.name')">
          <div class="flex items-center gap-2">
            <font-awesome-icon :icon="['fas', 'cloud']" class="h-4 w-4" aria-hidden="true" />
            {{ item.name }}
            <NeBadge
              v-if="!item.used"
              kind="secondary"
              :text="t('standalone.objects.not_used')"
              size="xs"
              class="shrink-0"
            />
          </div>
        </NeTableCell>
        <!-- ip version -->
        <NeTableCell :data-label="t('standalone.objects.ip_version')">
          <template v-if="item.family === 'ipv4'"> IPv4 </template>
          <template v-else-if="item.family === 'ipv6'"> IPv6 </template>
          <template v-else> - </template>
        </NeTableCell>
        <!-- domains -->
        <NeTableCell :data-label="t('standalone.objects.domains')">
          {{ item.domain?.join(', ') }}
        </NeTableCell>
        <!-- actions -->
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
            <!-- edit button -->
            <NeButton kind="tertiary" size="lg" @click="emit('editDomainSet', item)">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'pen-to-square']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
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
        :total-rows="props.filteredDomainSets?.length"
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
