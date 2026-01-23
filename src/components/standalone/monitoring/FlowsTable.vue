<script lang="ts">
import {
  faArrowDown,
  faClockRotateLeft,
  faUsers,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { isHighSeverityRisk } from '@/lib/standalone/ndpiRisks.ts'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

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
  if (entry.flow.other_type == 'local') {
    badges.push({
      id: 'local',
      text: 'standalone.flows.internal',
      icon: faUsers,
      customClasses: ['bg-blue-100', 'text-blue-800', 'dark:bg-blue-700', 'dark:text-blue-100'],
      content: 'standalone.flows.internal_description'
    })
  }
  if (entry.type == 'flow') {
    badges.push({
      id: 'scanning',
      text: 'standalone.flows.scanning',
      icon: faClockRotateLeft,
      customClasses: ['bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-100'],
      content: 'standalone.flows.scanning_description'
    })
  }
  if (entry.flow.risks.risks?.some(isHighSeverityRisk)) {
    badges.push({
      id: 'risky',
      text: 'standalone.flows.risky',
      icon: faWarning,
      customClasses: [
        'bg-yellow-100',
        'text-yellow-800',
        'dark:bg-yellow-700',
        'dark:text-yellow-100'
      ],
      content: 'standalone.flows.risky_description'
    })
  }
  return badges
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
  other_type: 'remote' | 'local'
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
</script>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref, watch } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'
import { useInterval } from '@vueuse/core'
import {
  NeTable,
  NeTableBody,
  NeTableHead,
  NeTableHeadCell,
  NeTextInput,
  NeDropdownFilter,
  type FilterOption,
  useItemPagination,
  NePaginator,
  type SortEvent,
  NeProgressBar,
  NeInlineNotification,
  getAxiosErrorMessage,
  NeEmptyState,
  NeTableCell,
  NeTableRow
} from '@nethesis/vue-components'
import FlowTableRow from '@/components/standalone/monitoring/flows/FlowTableRow.vue'
import { useRouteQuery } from '@vueuse/router'
import FlowDetail from '@/components/standalone/monitoring/flows/FlowDetail.vue'
import { ipv4ToInt } from '@/lib/ipUtils.ts'
import { faTable } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()

type FlowListResponse = AxiosResponse<{
  list: FlowEvent[]
}>

const data = ref<FlowEvent[]>([])
const loading = ref(true)
const error = ref<Error>()
function fetchData() {
  pause()
  ubusCall<FlowListResponse>('ns.flows', 'list')
    .then((res) => {
      data.value = res.data.list
      reset()
      resume()
    })
    .catch((reason) => {
      pause()
      error.value = reason
    })
    .finally(() => (loading.value = false))
}

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
const refreshIntervalSelection = ref<RefreshInterval[]>(['30s'])
const refreshIntervalsValue = computed<number | null>(() => {
  switch (refreshIntervalSelection.value[0]) {
    case '10s':
      return 10
    case '30s':
      return 30
    case '60s':
      return 60
    case 'off':
    default:
      return null
  }
})
watch(refreshIntervalSelection, (val) => {
  if (!val.includes('off')) {
    fetchData()
  }
})

onMounted(() => fetchData())

const { counter, pause, reset, resume } = useInterval(1000, {
  controls: true,
  callback: async (count) => {
    if (refreshIntervalsValue.value != null && count >= refreshIntervalsValue.value) {
      fetchData()
    }
  }
})
const progressBar = computed<number>(
  () => (counter.value / (refreshIntervalsValue.value || 10)) * 100
)

watch(refreshIntervalsValue, (value) => {
  if (value == null) {
    pause()
    reset()
  } else {
    reset()
    resume()
  }
})

const applications = computed<FilterOption[]>(() => {
  const appSet = new Set<string>()
  data.value.forEach((flow) => {
    appSet.add(flow.flow.detected_application_name)
  })
  return Array.from(appSet)
    .map((app) => {
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
    })
    .sort((a, b) => a.label.localeCompare(b.label))
})

const protocols = computed<FilterOption[]>(() => {
  const protoSet = new Set<string>()
  data.value.forEach((flow) => {
    protoSet.add(flow.flow.detected_protocol_name)
  })
  return Array.from(protoSet)
    .map((proto) => ({
      id: proto,
      label: proto
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const badges = computed<FilterOption[]>(() => {
  const badgeMap = new Map<string, Badge>()
  data.value.forEach((flow) => {
    extractBadges(flow).forEach((badge) => {
      if (!badgeMap.has(badge.id)) {
        badgeMap.set(badge.id, badge)
      }
    })
  })
  return Array.from(badgeMap.values())
    .map((badge) => ({
      id: badge.id,
      label: t(badge.text)
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const sourceIps = computed<FilterOption[]>(() => {
  const ipSet = new Set<string>()
  data.value.forEach((flow) => {
    if (flow.flow.local_origin) {
      return ipSet.add(flow.flow.local_ip)
    } else {
      return ipSet.add(flow.flow.other_ip)
    }
  })
  return Array.from(ipSet)
    .map((ip) => ({
      id: ip,
      label: ip
    }))
    .sort((a, b) => ipv4ToInt(a.id) - ipv4ToInt(b.id))
})

const destinationIps = computed<FilterOption[]>(() => {
  const ipSet = new Set<string>()
  data.value.forEach((flow) => {
    if (flow.flow.local_origin) {
      return ipSet.add(flow.flow.other_ip)
    } else {
      return ipSet.add(flow.flow.local_ip)
    }
  })
  return Array.from(ipSet)
    .map((ip) => ({
      id: ip,
      label: ip
    }))
    .sort((a, b) => ipv4ToInt(a.id) - ipv4ToInt(b.id))
})

type Filter<T> = (a: T) => boolean

const filter = useRouteQuery('filter', '')
const filterApplications = useRouteQuery<string, string[]>('applications', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const filterProtocols = useRouteQuery<string, string[]>('protocols', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const filterBadges = useRouteQuery<string, string[]>('badge', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const filterSource = useRouteQuery<string, string[]>('source', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const filterDestination = useRouteQuery<string, string[]>('destination', '', {
  transform: {
    get: (val) => (val ? val.split(',') : []),
    set: (val) => val.join(',')
  }
})
const filters: Filter<FlowEvent>[] = [
  (flow) => {
    return Object.values(flow.flow).some((value) =>
      String(value).toLowerCase().includes(filter.value.toLowerCase())
    )
  },
  (flow) => {
    if (!filterApplications.value.length) {
      return true
    }
    return filterApplications.value.includes(flow.flow.detected_application_name)
  },
  (flow) => {
    if (!filterProtocols.value.length) {
      return true
    }
    return filterProtocols.value.includes(flow.flow.detected_protocol_name)
  },
  (flow) => {
    if (!filterBadges.value.length) {
      return true
    }
    return extractBadges(flow).some((items) => filterBadges.value.includes(items.id))
  },
  (flow) => {
    if (!filterSource.value.length) {
      return true
    }
    if (flow.flow.local_origin) {
      return filterSource.value.includes(flow.flow.local_ip)
    }
    return filterSource.value.includes(flow.flow.other_ip)
  },
  (flow) => {
    if (!filterDestination.value.length) {
      return true
    }
    if (flow.flow.local_origin) {
      return filterDestination.value.includes(flow.flow.other_ip)
    }
    return filterDestination.value.includes(flow.flow.local_ip)
  }
]

const filteredData = computed<FlowEvent[]>(() => {
  return data.value.filter((flow) => filters.every((filter) => filter(flow)))
})

type SortableKeys =
  | 'detected_application_name'
  | 'duration'
  | 'last_seen_at'
  | 'download'
  | 'upload'
const sortKey = useRouteQuery<SortableKeys>('sort', 'download')
const sortDescending = ref(true)
const sortedItems = computed<FlowEvent[]>(() => {
  const items = [...filteredData.value]
  return items.sort((a, b) => {
    let compare = 0
    switch (sortKey.value) {
      case 'detected_application_name':
        compare = a.flow.detected_application_name.localeCompare(b.flow.detected_application_name)
        break
      case 'duration':
        compare =
          a.flow.last_seen_at - a.flow.first_seen_at - (b.flow.last_seen_at - b.flow.first_seen_at)
        break
      case 'last_seen_at':
        compare = a.flow.last_seen_at - b.flow.last_seen_at
        break
      case 'download': {
        const aRate = a.flow.local_origin ? a.flow.local_rate : a.flow.other_rate
        const bRate = b.flow.local_origin ? b.flow.local_rate : b.flow.other_rate
        compare = aRate - bRate
        break
      }
      case 'upload': {
        const aRate = a.flow.local_origin ? a.flow.other_rate : a.flow.local_rate
        const bRate = b.flow.local_origin ? b.flow.other_rate : b.flow.local_rate
        compare = aRate - bRate
        break
      }
    }
    return sortDescending.value ? -compare : compare
  })
})

const pageSize = useRouteQuery<number>('page-size', 10)
const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
  itemsPerPage: pageSize
})

const onSort = (payload: SortEvent) => {
  sortKey.value = payload.key as SortableKeys
  sortDescending.value = payload.descending
}

const flowDetails = ref<FlowEvent>()
watch(flowDetails, (value) => {
  if (value != undefined) {
    pause()
  } else {
    resume()
  }
})
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-4">
      <p class="max-w-xl text-secondary-neutral">{{ t('standalone.flows.subtitle') }}</p>
      <NeInlineNotification
        v-if="error"
        kind="error"
        :title="t('error.cannot_retrieve_flows')"
        :description="t(getAxiosErrorMessage(error))"
      />
      <div v-else-if="!loading" class="flex flex-wrap items-start gap-6">
        <div class="mr-auto flex flex-wrap items-center gap-4">
          <NeTextInput v-model="filter" :placeholder="t('common.filter')" is-search />
          <NeDropdownFilter
            v-model="filterApplications"
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
            v-model="filterProtocols"
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
            v-model="filterBadges"
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
            v-model="filterSource"
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
            v-model="filterDestination"
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
          <NeProgressBar :progress="progressBar" color="indigo" size="sm" />
        </div>
      </div>
    </div>
    <NeTable
      v-if="!error"
      :aria-label="t('standalone.flows.table_aria_label')"
      :loading="loading"
      :sort-descending="sortDescending"
      :sort-key="sortKey"
      card-breakpoint="2xl"
    >
      <NeTableHead>
        <NeTableHeadCell column-key="detected_application_name" sortable @sort="onSort">
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
        <NeTableHeadCell column-key="duration" sortable @sort="onSort">
          {{ t('standalone.flows.duration') }}
        </NeTableHeadCell>
        <NeTableHeadCell column-key="last_seen_at" sortable @sort="onSort">
          {{ t('standalone.flows.last_seen_at') }}
        </NeTableHeadCell>
        <NeTableHeadCell column-key="download" sortable @sort="onSort">
          {{ t('standalone.flows.download') }}
        </NeTableHeadCell>
        <NeTableHeadCell column-key="upload" sortable @sort="onSort">
          {{ t('standalone.flows.upload') }}
        </NeTableHeadCell>
        <NeTableHeadCell />
      </NeTableHead>
      <NeTableBody v-if="paginatedItems.length > 0">
        <FlowTableRow
          v-for="flow in paginatedItems"
          :key="flow.flow.digest"
          :item="flow"
          @show="flowDetails = $event"
        />
      </NeTableBody>
      <NeTableBody v-else>
        <NeTableRow>
          <NeTableCell colspan="10">
            <NeEmptyState
              :description="t('standalone.flows.no_flows_found_description')"
              :icon="faTable"
              :title="t('standalone.flows.no_flows_found')"
            />
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template v-if="!loading && paginatedItems.length > 0" #paginator>
        <NePaginator
          :current-page="currentPage"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :page-size="pageSize"
          :page-size-label="t('ne_table.show')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :total-rows="sortedItems.length"
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
    <FlowDetail :flow="flowDetails" @close="flowDetails = undefined" />
  </div>
</template>
