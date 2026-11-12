<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import {
  formatDateLoc,
  getAxiosErrorMessage,
  NeBadgeV2,
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeModal,
  NePaginator,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  useItemPagination
} from '@nethesis/vue-components'
import { computed, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { useQuery } from '@tanstack/vue-query'
import {
  faArrowsRotate,
  faCheck,
  faEye,
  faSearch,
  faShield
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useThreatShieldSettings } from '@/composables/useThreatShieldSettings'

const { t } = useI18n()
const { data: settings } = useThreatShieldSettings()

type BlocklistBan = {
  ip: string
  list: string
  direction: 'inbound' | 'outbound'
  time: number
  hits: number
  matches: string[]
}

const {
  data: banList,
  isPending,
  isFetching,
  error,
  refetch
} = useQuery({
  queryKey: ['threatshield', 'blocklist-bans'],
  queryFn: ({ signal }) =>
    ubusCall<{ data: { data: BlocklistBan[] } }>(
      'ns.threatshield',
      'list-blocklist-bans',
      {},
      { signal }
    ),
  select: (res) => res.data.data
})

function lastSeen(item: BlocklistBan) {
  return formatDateLoc(new Date(item.time * 1000), 'PPpp')
}

function listName(item: BlocklistBan) {
  if (item.list === 'blocklist') return t('standalone.threat_shield.local_blocklist')
  // geoblocking sets: country, or country.<cc> with ban_countrysplit
  if (item.list === 'country' || item.list.startsWith('country.'))
    return t('standalone.threat_shield.geoblocking')
  return item.list
}

function directionLabel(item: BlocklistBan) {
  return item.direction === 'outbound'
    ? t('standalone.threat_shield.direction_out')
    : t('standalone.threat_shield.direction_in')
}

const search = ref('')
const filteredBans = computed((): BlocklistBan[] => {
  const query = search.value.toLowerCase()
  return (banList.value ?? []).filter((item) =>
    [lastSeen(item), item.ip, listName(item), directionLabel(item)].some((field) =>
      field.toLowerCase().includes(query)
    )
  )
})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(filteredBans, {
  itemsPerPage: pageSize
})

// kept separate from visibility so the modal content stays during the close transition
const selectedBan = ref<BlocklistBan>()
const showDetails = ref(false)

function openDetails(item: BlocklistBan) {
  selectedBan.value = item
  showDetails.value = true
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
      <p class="max-w-2xl text-sm font-normal text-tertiary-neutral">
        {{ t('standalone.threat_shield.blocklist_bans_description') }}
      </p>
      <NeBadgeV2 v-if="settings?.enabled" kind="green" class="shrink-0">
        <FontAwesomeIcon :icon="faCheck" class="size-4" aria-hidden="true" />
        {{ t('standalone.threat_shield.threat_shield_enabled') }}
      </NeBadgeV2>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <NeTextInput
        v-model.trim="search"
        :placeholder="t('common.search')"
        class="sm:max-w-xs"
        is-search
        :clear-search-label="t('ne_dropdown_filter.clear_search')"
      />
      <NeButton kind="primary" :disabled="isFetching" @click="refetch()">
        <template #prefix>
          <FontAwesomeIcon
            :icon="faArrowsRotate"
            :class="{ 'animate-spin': isFetching }"
            aria-hidden="true"
          />
        </template>
        {{ t('standalone.threat_shield.refresh') }}
      </NeButton>
    </div>
    <NeSkeleton v-if="isPending" :lines="10" />
    <NeInlineNotification
      v-else-if="error"
      kind="error"
      :title="t('standalone.threat_shield.cannot_retrieve_blocklist_bans')"
      :description="t(getAxiosErrorMessage(error))"
      :close-aria-label="t('common.close')"
    />
    <NeEmptyState
      v-else-if="!banList?.length"
      :description="t('standalone.threat_shield.no_blocklist_bans_description')"
      :icon="faShield"
      :title="t('standalone.threat_shield.no_blocklist_bans')"
    />
    <NeEmptyState
      v-else-if="filteredBans.length < 1"
      :description="t('common.try_changing_search_filter')"
      :icon="faSearch"
      :title="t('standalone.threat_shield.no_bans_found')"
    />
    <NeTable v-else :aria-label="t('standalone.threat_shield.blocklist_bans')" card-breakpoint="xl">
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('common.ip_address') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.list') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.direction') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.hits') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.last_seen') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow
          v-for="item in paginatedItems"
          :key="`${item.ip}-${item.list}-${item.direction}`"
        >
          <NeTableCell :data-label="t('common.ip_address')">
            {{ item.ip }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.list')">
            {{ listName(item) }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.direction')">
            {{ directionLabel(item) }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.hits')">
            {{ item.hits }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.last_seen')">
            <p :title="new Date(item.time * 1000).toUTCString()">
              {{ lastSeen(item) }}
            </p>
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="-ml-2.5 flex md:justify-end xl:-my-2 xl:ml-0">
              <NeButton kind="tertiary" @click="openDetails(item)">
                <template #prefix>
                  <FontAwesomeIcon :icon="faEye" class="size-4" aria-hidden="true" />
                </template>
                {{ t('standalone.threat_shield.details') }}
              </NeButton>
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
          :total-rows="filteredBans.length"
          @select-page-size="
            (size: number) => {
              pageSize = size
            }
          "
          @select-page="
            (page: number) => {
              currentPage = page
            }
          "
        />
      </template>
    </NeTable>
  </div>
  <NeModal
    :visible="showDetails"
    size="xl"
    :title="t('standalone.threat_shield.ban_details', { ip: selectedBan?.ip })"
    :primary-label="t('common.close')"
    :close-aria-label="t('common.close')"
    @close="showDetails = false"
    @primary-click="showDetails = false"
  >
    <div class="space-y-2">
      <p class="font-medium">{{ t('standalone.threat_shield.matched_log_lines') }}</p>
      <pre
        v-if="selectedBan?.matches.length"
        class="max-h-96 overflow-auto rounded-md bg-gray-100 p-4 text-sm whitespace-pre-wrap dark:bg-gray-800"
        >{{ selectedBan.matches.join('\n') }}</pre>
      <p v-else class="text-sm text-tertiary-neutral">
        {{ t('standalone.threat_shield.no_matched_log_lines') }}
      </p>
    </div>
  </NeModal>
</template>
