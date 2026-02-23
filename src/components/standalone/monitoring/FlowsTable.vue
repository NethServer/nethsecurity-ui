<script lang="ts">
import {
  faArrowDown,
  faArrowUp,
  faBroadcastTower,
  faMagnifyingGlass,
  faUsers
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

type FlowListResponse = {
  data: {
    current_page: number
    flows: FlowEvent[]
    total: number
    last_page: number
    per_page: number
    filters: {
      applications: string[]
      protocols: string[]
      sources: string[]
      destinations: string[]
    }
  }
}

export type FlowEvent = {
  type: 'flow_dpi_complete' | 'flow'
  interface: string
  internal: boolean
  flow: Flow
}

export type Flow = {
  conntrack: {
    id: string
  }
  detected_application_name: string
  detected_protocol_name: string
  detection_guessed?: boolean
  detection_packets?: number
  local_ip: string
  local_port: number
  other_ip: string
  other_port: number
  local_origin: boolean
  first_seen_at: number
  last_seen_at: number
  local_bytes: number
  local_rate: number
  local_mac: string
  other_bytes: number
  other_rate: number
  other_mac: string
  other_type: 'remote' | 'local' | 'broadcast'
  digest: string
  host_server_name?: string
  dns_host_name?: string
  risks: {
    ndpi_risk_score: number
    ndpi_risk_score_client: number
    ndpi_risk_score_server: number
    risks?: number[]
  }
  ssl?: {
    client_sni?: string
  }
  total_bytes: number
}

export type Badge = {
  id: string
  text: string
  icon: IconDefinition
  content?: string
  customClasses: string[]
}

export function extractBadges(entry: FlowEvent): Badge[] {
  const badges: Badge[] = []
  if (!entry.flow.local_origin && entry.flow.other_type == 'remote') {
    badges.push({
      id: 'remote',
      text: 'standalone.flows.remote',
      icon: faArrowDown,
      customClasses: ['bg-rose-100', 'text-rose-800', 'dark:bg-rose-700', 'dark:text-rose-100'],
      content: 'standalone.flows.remote_description'
    })
  }
  if (entry.flow.local_origin && entry.flow.other_type == 'remote') {
    badges.push({
      id: 'outgoing',
      text: 'standalone.flows.outgoing',
      icon: faArrowUp,
      customClasses: ['bg-green-100', 'text-green-800', 'dark:bg-green-700', 'dark:text-green-100'],
      content: 'standalone.flows.outgoing_description'
    })
  }
  if (entry.flow.other_type == 'local') {
    badges.push({
      id: 'local',
      text: 'standalone.flows.internal',
      icon: faUsers,
      customClasses: ['bg-blue-100', 'text-blue-800', 'dark:bg-blue-700', 'dark:text-blue-100'],
      content: 'standalone.flows.internal_description'
    })
  }
  if (entry.flow.other_type == 'broadcast') {
    badges.push({
      id: 'broadcast',
      text: 'standalone.flows.broadcast',
      icon: faBroadcastTower,
      customClasses: [
        'bg-purple-100',
        'text-purple-800',
        'dark:bg-purple-700',
        'dark:text-purple-100'
      ],
      content: 'standalone.flows.broadcast_description'
    })
  }
  if (entry.type == 'flow') {
    badges.push({
      id: 'scanning',
      text: 'standalone.flows.scanning',
      icon: faMagnifyingGlass,
      customClasses: ['bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-100'],
      content: 'standalone.flows.scanning_description'
    })
  }
  return badges
}
</script>

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
import { useRouteQuery } from '@vueuse/router'
import FlowDetail from '@/components/standalone/monitoring/flows/FlowDetail.vue'
import { faTable } from '@fortawesome/free-solid-svg-icons'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { refDebounced } from '@vueuse/core'

const { t } = useI18n()
const queryClient = useQueryClient()

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

const { data, isError, error, isPending } = useQuery({
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
      destination: destinationFilter.value
    }),
  placeholderData: keepPreviousData,
  refetchInterval: refreshIntervalsValue,
  select: (data) => data.data
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
  return (
    data.value?.filters.applications.map((app) => {
      let label = app
      // Remove netify. prefix if present
      if (label.startsWith('netify.')) {
        label = label.substring(7)
      }
      // Replace dashes with spaces
      label = label.replace(/-/g, ' ')
      // Capitalize first character of each word
      label = label
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      return {
        id: app,
        label: label
      }
    }) ?? []
  )
})

const protocols = computed<FilterOption[]>(() => {
  return (
    data.value?.filters.protocols.map((protocol) => ({
      id: protocol,
      label: protocol
    })) ?? []
  )
})

const badges = computed<FilterOption[]>(() => {
  return []
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
            :clear-filter-label="t('ne_dropdown_filter.clear_selection')"
            :clear-search-label="t('ne_dropdown_filter.clear_search')"
            :label="t('standalone.flows.tags')"
            :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
            :no-options-label="t('ne_dropdown_filter.no_options')"
            :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
            :options="badges"
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
          <!--
          FIXME: add back progress bar when API supports it
          <NeProgressBar :progress="progressBar" color="indigo" size="sm" />
          -->
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
