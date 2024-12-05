<script lang="ts" setup>
import { faSearch, faTable } from '@fortawesome/free-solid-svg-icons'
import {
  byteFormat1024,
  NeEmptyState,
  NePaginator,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  useItemPagination,
  NeLink
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { TrafficRecord } from '@/composables/useTrafficStats'
import { type AvailableFilters, useTrafficFilter } from '@/composables/useTrafficFilter'

const { trafficEntries, title } = defineProps<{
  trafficEntries: TrafficRecord[]
  title: string
  filterable?: boolean
  filterableKey?: AvailableFilters
}>()

const { t } = useI18n()

const filters = useTrafficFilter()

const filter = ref('')
const filterDebounced = refDebounced(filter, 400)

const trafficEntriesFiltered = computed(() => {
  return trafficEntries.filter((item) => {
    return (item?.label ?? item.id).toLowerCase().includes(filterDebounced.value.toLowerCase())
  })
})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => trafficEntriesFiltered.value, {
  itemsPerPage: pageSize
})
</script>

<template>
  <div class="space-y-3">
    <div class="sm:max-w-xs">
      <NeTextInput v-model="filter" :placeholder="t('common.filter')">
        <template #prefix>
          <FontAwesomeIcon :icon="faSearch" aria-hidden="true" class="h-4 w-4" />
        </template>
      </NeTextInput>
    </div>
    <NeTable :aria-label="title">
      <NeTableHead>
        <NeTableHeadCell>{{ title }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.traffic') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-if="!paginatedItems.length">
          <NeTableCell colspan="9">
            <NeEmptyState
              :icon="faTable"
              :title="t('common.no_data_available')"
              class="bg-white dark:bg-gray-950"
            />
          </NeTableCell>
        </NeTableRow>
        <NeTableRow v-for="(item, index) in paginatedItems as TrafficRecord[]" v-else :key="index">
          <NeTableCell :data-label="title">
            <template v-if="filterable">
              <NeLink
                @click="
                  filters.push({
                    key: filterableKey!,
                    value: item.id
                  })
                "
                >{{ item?.label ?? item.id }}</NeLink
              >
            </template>
            <template v-else>
              {{ item?.label ?? item.id }}
            </template>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.real_time_monitor.traffic')">
            {{ byteFormat1024(item.traffic) }}
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :page-size="pageSize"
          :page-size-label="t('ne_table.show')"
          :page-sizes="[5, 10]"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :total-rows="trafficEntriesFiltered.length"
          @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
          @select-page="
            (page: number) => {
              currentPage = page
            }"
        />
      </template>
    </NeTable>
  </div>
</template>
