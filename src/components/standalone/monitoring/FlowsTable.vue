<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import {
  NeTable,
  NeTableBody,
  NeTableHead,
  NeTableHeadCell,
  NeTextInput,
  NeDropdownFilter,
  type FilterOption,
  NePaginator,
  type SortEvent,
  NeInlineNotification,
  getAxiosErrorMessage,
  NeEmptyState,
  NeTableCell,
  NeTableRow,
  NeButton
} from '@nethesis/vue-components'
import FlowTableRow from '@/components/standalone/monitoring/flows/FlowTableRow.vue'
import RefreshProgressBar from '@/components/standalone/monitoring/flows/RefreshProgressBar.vue'
import { useRouteQuery } from '@vueuse/router'
import FlowDetail from '@/components/standalone/monitoring/flows/FlowDetail.vue'
import { faTable } from '@fortawesome/free-solid-svg-icons'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { refDebounced } from '@vueuse/core'
import { useNetifydStore } from '@/stores/standalone/netifyd.ts'
import { type FlowEvent, type FlowListResponse, matchBadge } from '@/composables/useFlows'

const { t } = useI18n()
const queryClient = useQueryClient()
const netifydStore = useNetifydStore()

const applicationsFilter = useRouteQuery<string, string[]>('application', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const protocolsFilter = useRouteQuery<string, string[]>('protocols', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const tagsFilter = useRouteQuery<string, string[]>('tags', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const sourceFilter = useRouteQuery<string, string[]>('source', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})

const destinationFilter = useRouteQuery<string, string[]>('destination', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})

const currentPage = ref(1)
const perPage = useRouteQuery<string, number>('per_page', '10', {
  transform: {
    get: (val) => parseInt(val),
    set: (val) => val.toString()
  }
})
watch(perPage, () => {
  if (currentPage.value != 1) {
    currentPage.value = 1
  }
})
const sortDescending = useRouteQuery<string, boolean>('descending', 'true', {
  transform: {
    get: (val) => val == 'true',
    set: (val) => val.toString()
  }
})
type SortableKeys = 'duration' | 'last_seen_at' | 'download' | 'upload'
const sortKey = useRouteQuery<SortableKeys>('sort', 'download')

const flowDetails = ref<FlowEvent>()

type RefreshInterval = '10s' | '30s' | '60s' | 'off'
type RefreshFilterOption = FilterOption & {
  id: RefreshInterval
}
const refreshIntervalOptions: RefreshFilterOption[] = [
  {
    id: '10s',
    label: t('standalone.flows.refresh_interval', { value: '10s' })
  },
  {
    id: '30s',
    label: t('standalone.flows.refresh_interval', { value: '30s' })
  },
  {
    id: '60s',
    label: t('standalone.flows.refresh_interval', { value: '60s' })
  },
  {
    id: 'off',
    label: t('standalone.flows.refresh_interval', { value: 'off' })
  }
]
const refreshIntervalSelection = useRouteQuery<string, RefreshInterval[]>(
  'refresh_interval',
  '10s',
  {
    transform: {
      get: (val) => (val ? (val.split(',') as RefreshInterval[]) : ['10s']),
      set: (val) => val.join(',')
    }
  }
)
const refreshIntervalsValue = computed<number | false>(() => {
  if (flowDetails.value != undefined) {
    return false
  }
  switch (refreshIntervalSelection.value[0]) {
    case '10s':
      return 10000
    case '30s':
      return 30000
    case '60s':
      return 60000
    case 'off':
    default:
      return false
  }
})

const query = useRouteQuery('query', '')
const queryDebounced = refDebounced(query, 500)
watch(queryDebounced, () => {
  if (currentPage.value != 1) {
    currentPage.value = 1
  }
})

const { data, isError, error, isPending, dataUpdatedAt } = useQuery({
  queryKey: [
    'flow',
    'list',
    queryDebounced,
    sortKey,
    sortDescending,
    perPage,
    currentPage,
    applicationsFilter,
    protocolsFilter,
    tagsFilter,
    sourceFilter,
    destinationFilter
  ],
  queryFn: async () =>
    ubusCall<FlowListResponse>('ns.flows', 'list', {
      q: queryDebounced.value,
      sort_by: sortKey.value,
      desc: sortDescending.value,
      per_page: perPage.value,
      page: currentPage.value,
      application: applicationsFilter.value,
      protocol: protocolsFilter.value,
      source: sourceFilter.value,
      destination: destinationFilter.value,
      tag: tagsFilter.value
    }),
  placeholderData: keepPreviousData,
  refetchInterval: refreshIntervalsValue,
  select: (data) => data.data,
  refetchOnReconnect: () => refreshIntervalsValue.value != false,
  refetchOnWindowFocus: () => refreshIntervalsValue.value != false
})

watch(data, () => {
  if (data.value != undefined) {
    if (currentPage.value > data.value.last_page) {
      currentPage.value = data.value.last_page
    }
  }
})

watch(refreshIntervalSelection, (val) => {
  if (!val.includes('off')) {
    queryClient.invalidateQueries({ queryKey: ['flow', 'list'] })
  }
})

const applications = computed<FilterOption[]>(() => {
  if (data.value == undefined) {
    return []
  }
  return data.value.filters.applications.map((application) => {
    return {
      id: application.name,
      label: netifydStore.getApplicationNameById(application.id, application.name)
    }
  })
})

const protocols = computed<FilterOption[]>(() => {
  if (data.value == undefined) {
    return []
  }
  return data.value.filters.protocols.map((protocol) => {
    return {
      id: protocol.name,
      label: netifydStore.getProtocolNameById(protocol.id, protocol.name)
    }
  })
})

const tags = computed<FilterOption[]>(() => {
  return (
    data.value?.filters.tags.map((tag) => {
      const badge = matchBadge(tag)
      return {
        id: badge.id,
        label: t(badge.text)
      }
    }) ?? []
  )
})

const sourceIps = computed<FilterOption[]>(() => {
  return (
    data.value?.filters.sources.map((sourceIp) => ({
      id: sourceIp,
      label: sourceIp
    })) ?? []
  )
})

const destinationIps = computed<FilterOption[]>(() => {
  return (
    data.value?.filters.destinations.map((destinationIp) => ({
      id: destinationIp,
      label: destinationIp
    })) ?? []
  )
})

const onSort = (payload: SortEvent) => {
  sortKey.value = payload.key as SortableKeys
  sortDescending.value = payload.descending
}

function resetFilters() {
  query.value = ''
  applicationsFilter.value = []
  protocolsFilter.value = []
  tagsFilter.value = []
  sourceFilter.value = []
  destinationFilter.value = []
}
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-4">
      <NeInlineNotification
        v-if="isError"
        kind="error"
        :title="t('error.cannot_retrieve_flows')"
        :description="t(getAxiosErrorMessage(error))"
      />
      <div v-else-if="!isPending" class="flex flex-wrap items-start gap-6">
        <div class="mr-auto flex flex-wrap items-center gap-4">
          <NeTextInput v-model="query" :placeholder="t('common.filter')" is-search />
          <NeDropdownFilter
            v-model="applicationsFilter"
            :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :label="t('standalone.flows.application')"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :options="applications"
            kind="checkbox"
            show-options-filter
          />
          <NeDropdownFilter
            v-model="protocolsFilter"
            :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :label="t('standalone.flows.protocol')"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :options="protocols"
            kind="checkbox"
            show-options-filter
          />
          <NeDropdownFilter
            v-model="tagsFilter"
            :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :label="t('standalone.flows.tags')"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :options="tags"
            kind="checkbox"
            show-options-filter
          />
          <NeDropdownFilter
            v-model="sourceFilter"
            :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :label="t('standalone.flows.source')"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :options="sourceIps"
            kind="checkbox"
            show-options-filter
          />
          <NeDropdownFilter
            v-model="destinationFilter"
            :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :label="t('standalone.flows.destination')"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :options="destinationIps"
            kind="checkbox"
            show-options-filter
          />
          <NeButton kind="tertiary" @click="resetFilters">
            {{ t('common.clear_filters') }}
          </NeButton>
        </div>
        <div class="space-y-2">
          <NeDropdownFilter
            v-model="refreshIntervalSelection"
            :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :label="t('standalone.flows.refresh_interval', { value: refreshIntervalSelection[0] })"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :options="refreshIntervalOptions"
            kind="radio"
          />
          <RefreshProgressBar :data-updated-at="dataUpdatedAt" :interval="refreshIntervalsValue" />
        </div>
      </div>
    </div>
    <NeTable
      :aria-label="t('standalone.flows.table_aria_label')"
      :loading="isPending"
      :skeleton-columns="11"
      :skeleton-rows="perPage + 1"
      :sort-descending="sortDescending"
      :sort-key="sortKey"
      card-breakpoint="2xl"
    >
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('standalone.flows.application') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.flows.protocol') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.flows.tags') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.flows.source') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.flows.destination') }}
        </NeTableHeadCell>
        <NeTableHeadCell column-key="download" sortable @sort="onSort">
          {{ t('standalone.flows.download') }}
        </NeTableHeadCell>
        <NeTableHeadCell column-key="upload" sortable @sort="onSort">
          {{ t('standalone.flows.upload') }}
        </NeTableHeadCell>
        <NeTableHeadCell column-key="duration" sortable @sort="onSort">
          {{ t('standalone.flows.duration') }}
        </NeTableHeadCell>
        <NeTableHeadCell column-key="last_seen_at" sortable @sort="onSort">
          {{ t('standalone.flows.last_seen_at') }}
        </NeTableHeadCell>
        <NeTableHeadCell />
      </NeTableHead>
      <NeTableBody v-if="data!.total > 0">
        <FlowTableRow
          v-for="flow in data!.flows"
          :key="flow.flow.digest"
          :item="flow"
          @show="flowDetails = $event"
        />
      </NeTableBody>
      <NeTableBody v-else>
        <NeTableRow>
          <NeTableCell colspan="10">
            <NeEmptyState
              class="bg-white dark:bg-gray-950"
              :description="t('standalone.flows.no_flows_found_description')"
              :icon="faTable"
              :title="t('standalone.flows.no_flows_found')"
            >
              <NeButton @click="resetFilters">
                {{ t('common.clear_filters') }}
              </NeButton>
            </NeEmptyState>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template v-if="!isPending && data!.total > 0" #paginator>
        <NePaginator
          :current-page="currentPage"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :page-size="data!.per_page"
          :page-size-label="t('ne_table.show')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :total-rows="data!.total"
          @select-page="
            (page: number) => {
              currentPage = page
            }
          "
          @select-page-size="
            (size: number) => {
              perPage = size
            }
          "
        />
      </template>
    </NeTable>
    <FlowDetail :flow="flowDetails" @close="flowDetails = undefined" />
  </div>
</template>
