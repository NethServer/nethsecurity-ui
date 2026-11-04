<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import {
  formatDateLoc,
  getAxiosErrorMessage,
  NeBadge,
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
import { computed, onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'
import { faArrowsRotate, faSearch, faShield, faUnlock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import UnBanIpModal from '@/components/standalone/security/threat_shield/UnBanIpModal.vue'
import { useNotificationsStore } from '@/stores/notifications.ts'

const { t, te } = useI18n()
const notificationsStore = useNotificationsStore()

type Ban = {
  ip: string
  jail: string
  time: number
  timeout: number
  active: boolean
  failures: number
  matches: string[]
}

// i18n key per jail (ns-ssh -> ns_ssh), unknown jails show their name
function banReason(jail: string) {
  const key = `standalone.threat_shield.${jail.replace(/-/g, '_')}`
  return te(key) ? t(key) : jail
}

const banList = ref<Ban[]>([])
const error = ref<Error>()
const loading = ref(false)

function fetchBans() {
  error.value = undefined
  loading.value = true
  ubusCall('ns.threatshield', 'list-recent-bans')
    .then((response: AxiosResponse<Ban[]>) => {
      // active bans first, the API already sorts by time
      banList.value = [...response.data].sort((a, b) => Number(b.active) - Number(a.active))
    })
    .catch((reason) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  fetchBans()
})

function banDate(item: Ban) {
  return formatDateLoc(new Date(item.time * 1000), 'PPpp')
}

function banStatus(item: Ban) {
  if (!item.active) {
    return t('standalone.threat_shield.block_expired')
  }
  if (item.timeout < 0) {
    return t('standalone.threat_shield.blocked')
  }
  return t('standalone.threat_shield.blocked_until', {
    date: formatDateLoc(new Date((item.time + item.timeout) * 1000), 'PPpp')
  })
}

const search = ref('')
const filteredBans = computed((): Ban[] => {
  const query = search.value.toLowerCase()
  return banList.value.filter((item) =>
    [banDate(item), item.ip, banReason(item.jail), banStatus(item)].some((field) =>
      field.toLowerCase().includes(query)
    )
  )
})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(filteredBans, {
  itemsPerPage: pageSize
})

// kept separate from visibility so the modal content stays during the close transition
const selectedBan = ref<Ban>()
const showDetails = ref(false)

function openDetails(item: Ban) {
  selectedBan.value = item
  showDetails.value = true
}

const ipToDelete = ref<string>()
function handleIpDeleted() {
  notificationsStore.addNotification({
    kind: 'success',
    id: 'unbanning-ip-' + ipToDelete.value,
    title: t('standalone.threat_shield.ip_unbanned_title'),
    description: t('standalone.threat_shield.ip_unbanned_description', {
      ip: ipToDelete.value
    })
  })
  fetchBans()
  ipToDelete.value = undefined
}
</script>

<template>
  <div class="space-y-8">
    <p class="max-w-2xl text-sm font-normal text-tertiary-neutral">
      {{ t('standalone.threat_shield.banned_ips_description') }}
    </p>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <NeTextInput
        v-model.trim="search"
        :placeholder="t('common.search')"
        class="sm:max-w-xs"
        is-search
      />
      <NeButton kind="tertiary" :disabled="loading" @click="fetchBans">
        <template #prefix>
          <FontAwesomeIcon
            :icon="faArrowsRotate"
            :class="{ 'animate-spin': loading }"
            aria-hidden="true"
          />
        </template>
        {{ t('standalone.threat_shield.refresh') }}
      </NeButton>
    </div>
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification
      v-else-if="error"
      kind="error"
      :title="t('standalone.threat_shield.cannot_retrieve_banned_ips')"
      :description="t(getAxiosErrorMessage(error))"
      :close-aria-label="t('common.close')"
    />
    <NeEmptyState
      v-else-if="banList.length < 1"
      :description="t('standalone.threat_shield.the_firewall_is_not_currently_blocking_any_ips')"
      :icon="faShield"
      :title="t('standalone.threat_shield.no_banned_ips')"
    />
    <NeEmptyState
      v-else-if="filteredBans.length < 1"
      :description="t('common.try_changing_search_filter')"
      :icon="faSearch"
      :title="t('standalone.threat_shield.no_bans_found')"
    />
    <NeTable v-else :aria-label="t('standalone.threat_shield.banned_ips')" card-breakpoint="xl">
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.banned_at') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('common.ip_address') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.reason') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('common.status') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.failures') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="item in paginatedItems" :key="`${item.ip}-${item.jail}-${item.time}`">
          <NeTableCell :data-label="t('standalone.threat_shield.banned_at')">
            <p :title="new Date(item.time * 1000).toUTCString()">
              {{ banDate(item) }}
            </p>
          </NeTableCell>
          <NeTableCell :data-label="t('common.ip_address')">
            {{ item.ip }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.reason')">
            {{ banReason(item.jail) }}
          </NeTableCell>
          <NeTableCell :data-label="t('common.status')">
            <NeBadge
              :text="banStatus(item)"
              :kind="item.active ? 'error' : 'secondary'"
              size="xs"
            />
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.failures')">
            {{ item.failures }}
          </NeTableCell>
          <NeTableCell>
            <div class="flex flex-col gap-2 xl:-my-2 xl:flex-row xl:justify-end">
              <NeButton kind="tertiary" size="lg" @click="openDetails(item)">
                {{ t('standalone.threat_shield.details') }}
              </NeButton>
              <NeButton v-if="item.active" kind="tertiary" size="lg" @click="ipToDelete = item.ip">
                <span class="flex items-center gap-3">
                  <FontAwesomeIcon class="h-4 w-4" :icon="faUnlock" />
                  <span>{{ t('standalone.threat_shield.unban') }}</span>
                </span>
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
  <UnBanIpModal
    :ip-to-delete="ipToDelete"
    @close="ipToDelete = undefined"
    @success="handleIpDeleted"
  />
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
        class="max-h-96 overflow-auto rounded-md bg-gray-50 p-4 text-sm whitespace-pre-wrap dark:bg-gray-900"
        >{{ selectedBan.matches.join('\n') }}</pre>
      <p v-else class="text-sm text-tertiary-neutral">
        {{ t('standalone.threat_shield.no_matched_log_lines') }}
      </p>
    </div>
  </NeModal>
</template>
