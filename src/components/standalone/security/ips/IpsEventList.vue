<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import IpsEnabledBadge from '@/components/standalone/security/ips/IpsEnabledBadge.vue'
import { useI18n } from 'vue-i18n'
import { useIpsStatusStore } from '@/stores/standalone/ipsStatus'
import IpsDisabledEmptyState from '@/components/standalone/security/ips/IpsDisabledEmptyState.vue'
import type { AxiosResponse } from 'axios'
import { computed, onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  type FilterOption,
  formatDateLoc,
  getAxiosErrorMessage,
  NeButton,
  NeDropdown,
  NeDropdownFilter,
  NeDropdownItem,
  NeEmptyState,
  NeInlineNotification,
  NePaginator,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  useItemPagination,
  useSort
} from '@nethesis/vue-components'
import {
  faArrowRight,
  faBan,
  faCircleInfo,
  faShield,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import IpsDisableRuleDrawer from '@/components/standalone/security/ips/IpsDisableRuleDrawer.vue'
import type { Rule } from '@/components/standalone/security/ips/IpsDisabledRules.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import IpsSuppressAlertDrawer from '@/components/standalone/security/ips/IpsSuppressAlertDrawer.vue'
import type { SuppressedAlert } from '@/components/standalone/security/ips/IpsSuppressedAlerts.vue'
import IpsSnortDocLink from '@/components/standalone/security/ips/IpsSnortDocLink.vue'

type EventType = 'drop' | 'alert' | 'allow'

type FilterEventType = EventType | 'any'

type Event = {
  timestamp: string
  protocol: string
  source_address: string
  source_port?: string
  destination_address: string
  destination_port?: string
  gid: string
  sid: string
  action: EventType
  description: string
}

type EventResponse = AxiosResponse<{
  events: Event[]
}>

const { t } = useI18n()
const ipsStatus = useIpsStatusStore()
const changes = useUciPendingChangesStore()

const loading = ref(true)
const events = ref<Event[]>([])
const error = ref<Error>()

onMounted(() => {
  ubusCall('ns.snort', 'list-events')
    .then((response: EventResponse) => {
      events.value = response.data.events
    })
    .catch((reason: Error) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
})

type CustomFilter = FilterOption & {
  id: FilterEventType
  label: string
}

const typeFilterOptions = ref<CustomFilter[]>([
  {
    id: 'any',
    label: t('common.any')
  },
  {
    id: 'drop',
    label: t('standalone.ips.drop')
  },
  {
    id: 'alert',
    label: t('standalone.ips.alert')
  },
  {
    id: 'allow',
    label: t('standalone.ips.allow')
  }
])
const searchFilter = ref('')
const typeFilter = ref<FilterEventType[]>(['any'])

function clearFilters() {
  searchFilter.value = ''
  typeFilter.value = ['any']
}

const filteredEvents = computed((): Event[] => {
  return events.value.filter((event) => {
    const search = searchFilter.value.toLowerCase()
    const type = typeFilter.value
    return (
      (search === '' ||
        Object.values(event).some(
          (value) => value?.toString().toLowerCase().includes(search) ?? false
        )) &&
      (type.includes('any') || type.includes(event.action))
    )
  })
})

const sortKey = ref<keyof Event>('timestamp')
const sortDescending = ref(true)
const { sortedItems } = useSort(filteredEvents, sortKey, sortDescending, {})
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(sortedItems, {
  itemsPerPage: pageSize
})
const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}
function dropDownActions(item: Event): NeDropdownItem[] {
  return [
    {
      id: 'disable-rule',
      label: t('standalone.ips.disable_rule'),
      icon: 'circle-xmark',
      iconStyle: 'fas',
      action: () => {
        ruleToDisable.value = {
          gid: item.gid.toString(),
          sid: item.sid.toString(),
          description: item.description
        }
      }
    },
    {
      id: 'source-suppress-alert',
      label: t('standalone.ips.source_suppress_alert'),
      icon: 'eye-slash',
      iconStyle: 'fas',
      action: () => {
        alertToSuppress.value = {
          gid: item.gid.toString(),
          sid: item.sid.toString(),
          description: item.description,
          direction: 'by_src',
          ip: item.source_address
        }
      }
    },
    {
      id: 'destination-suppress-alert',
      label: t('standalone.ips.destination_suppress_alert'),
      icon: 'eye-slash',
      iconStyle: 'fas',
      action: () => {
        alertToSuppress.value = {
          gid: item.gid.toString(),
          sid: item.sid.toString(),
          description: item.description,
          direction: 'by_dst',
          ip: item.destination_address
        }
      }
    }
  ]
}
const ruleToDisable = ref<Rule>()
function disabledRuleHandler() {
  ruleToDisable.value = undefined
  changes.getChanges()
}

const alertToSuppress = ref<SuppressedAlert>()
function suppressedAlertHandler() {
  alertToSuppress.value = undefined
  changes.getChanges()
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.ips.event_list_description') }}
      </p>
      <IpsEnabledBadge v-if="ipsStatus.enabled" />
    </div>
    <NeSkeleton v-if="loading" :lines="8" size="lg" />
    <IpsDisabledEmptyState v-else-if="ipsStatus.enabled == false" />
    <template v-else>
      <NeInlineNotification
        v-if="error"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('standalone.ips.error_loading_events')"
        kind="error"
      />
      <template v-if="events.length > 0">
        <div class="flex flex-wrap items-center gap-4">
          <NeTextInput
            v-model.trim="searchFilter"
            :placeholder="t('standalone.ips.filter_events')"
            is-search
          />
          <NeDropdownFilter
            v-model="typeFilter"
            :clearFilterLabel="t('ne_dropdown_filter.clear_filter')"
            :label="t('standalone.ips.type')"
            :openMenuAriaLabel="t('ne_dropdown_filter.open_filter')"
            :options="typeFilterOptions"
            kind="radio"
          />
          <NeButton kind="tertiary" @click="clearFilters">
            {{ t('common.clear_filters') }}
          </NeButton>
        </div>
        <NeTable
          :ariaLabel="t('standalone.ips.event_list_tab')"
          :sortDescending="sortDescending"
          :sortKey="sortKey"
          card-breakpoint="xl"
        >
          <NeTableHead>
            <NeTableHeadCell column-key="timestamp" sortable @sort="onSort">
              {{ t('standalone.ips.date') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="action">
              {{ t('standalone.ips.type') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="description">
              {{ t('standalone.ips.description') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="source_address">
              {{ t('standalone.ips.source') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="destination_address">
              {{ t('standalone.ips.destination') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="protocol">
              {{ t('standalone.ips.protocol') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="sid">
              {{ t('standalone.ips.table_id_description') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="actions"></NeTableHeadCell>
          </NeTableHead>
          <NeTableBody>
            <NeTableRow v-if="filteredEvents.length < 1">
              <NeTableCell colspan="8">
                <NeEmptyState
                  :description="t('common.try_changing_search_filters')"
                  :icon="faCircleInfo"
                  :title="t('standalone.ips.no_events_found')"
                  class="bg-white dark:bg-gray-950"
                >
                  <NeButton kind="tertiary" @click="clearFilters">
                    {{ t('common.clear_filters') }}
                  </NeButton>
                </NeEmptyState>
              </NeTableCell>
            </NeTableRow>
            <NeTableRow v-for="item in paginatedItems" v-else :key="`${item.id}-${item.timestamp}`">
              <NeTableCell :data-label="t('standalone.ips.date')" class="text-nowrap">
                <span :title="item.timestamp">
                  {{ formatDateLoc(new Date(item.timestamp), 'PPpp') }}
                </span>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.ips.type')">
                <span class="flex items-center gap-2">
                  <template v-if="item.action == 'allow'">
                    <FontAwesomeIcon :icon="faArrowRight" class="text-green-500" />
                    {{ t('standalone.ips.allow') }}
                  </template>
                  <template v-else-if="item.action == 'drop'">
                    <FontAwesomeIcon :icon="faBan" class="text-red-500" />
                    {{ t('standalone.ips.drop') }}
                  </template>
                  <template v-else>
                    <FontAwesomeIcon :icon="faWarning" class="text-amber-700 dark:text-amber-500" />
                    {{ t('standalone.ips.alert') }}
                  </template>
                </span>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.ips.description')">
                {{ item.description }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.ips.source')">
                {{ item.source_address }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.ips.destination')">
                {{ item.destination_address }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.ips.protocol')">
                {{ item.protocol }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.ips.table_id_description')">
                <IpsSnortDocLink :gid="item.gid" :sid="item.sid" />
              </NeTableCell>
              <NeTableCell :data-label="t('common.actions')">
                <div class="-ml-2.5 flex justify-start xl:ml-0 xl:justify-end">
                  <NeDropdown :align-to-right="true" :items="dropDownActions(item)" />
                </div>
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
              :previous-label="t('ne_table.go_to_previous_page')"
              :range-of-total-label="t('ne_table.of')"
              :total-rows="filteredEvents.length"
              @selectPageSize="(size: number) => { pageSize = size }"
              @select-page="(page: number) => { currentPage = page }"
            />
          </template>
        </NeTable>
      </template>
      <NeEmptyState v-else :icon="faShield" :title="t('standalone.ips.event_list_no_events')" />
    </template>
  </div>
  <IpsDisableRuleDrawer
    :rule="ruleToDisable"
    :visible="ruleToDisable != undefined"
    @close="ruleToDisable = undefined"
    @save="disabledRuleHandler()"
  />
  <IpsSuppressAlertDrawer
    :alert="alertToSuppress"
    :visible="alertToSuppress != undefined"
    @close="alertToSuppress = undefined"
    @suppress="suppressedAlertHandler()"
  />
</template>
