<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import {
  formatDateLoc,
  getAxiosErrorMessage,
  NeButton,
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
  useItemPagination
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'
import { faSearch, faShield, faUnlock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import UnBanIpModal from '@/components/standalone/security/threat_shield/UnBanIpModal.vue'
import { useNotificationsStore } from '@/stores/notifications.ts'

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

type BannedIp = {
  ip: string
  timeout: number
  expires: number
}
const ipList = ref<BannedIp[]>([])
const error = ref<Error>()
const loading = ref(false)

function fetchBannedIps() {
  error.value = undefined
  loading.value = true
  ubusCall('ns.threatshield', 'list-active-blocks')
    .then((response: AxiosResponse<BannedIp[]>) => {
      ipList.value = response.data
    })
    .catch((reason) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  fetchBannedIps()
})

const search = ref('')
const filteredIps = computed((): BannedIp[] => {
  return ipList.value.filter((item) => {
    return item.ip.toLowerCase().includes(search.value.toLowerCase())
  })
})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(filteredIps, {
  itemsPerPage: pageSize
})

function bannedSince(expiresIn: number, timeout: number): Date {
  return new Date(new Date().getTime() + (expiresIn - timeout) * 1000)
}

function banExpiresAt(expiresIn: number): Date {
  return new Date(new Date().getTime() + expiresIn * 1000)
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
  fetchBannedIps()
  ipToDelete.value = undefined
}
</script>

<template>
  <div class="space-y-8">
    <p class="text-tertiary-neutral max-w-2xl text-sm font-normal">
      {{ t('standalone.threat_shield.banned_ips_description') }}
    </p>
    <NeTextInput
      v-model.trim="search"
      :placeholder="t('common.search')"
      class="sm:max-w-xs"
      is-search
    />
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification
      v-else-if="error"
      kind="error"
      :title="t('standalone.threat_shield.cannot_retrieve_banned_ips')"
      :description="t(getAxiosErrorMessage(error))"
      :close-aria-label="t('common.close')"
    />
    <NeEmptyState
      v-else-if="ipList.length < 1"
      :description="t('standalone.threat_shield.the_firewall_is_not_currently_blocking_any_ips')"
      :icon="faShield"
      :title="t('standalone.threat_shield.no_banned_ips')"
    />
    <NeEmptyState
      v-else-if="filteredIps.length < 1"
      :description="t('standalone.threat_shield.ip_is_not_currently_banned', { ip: search })"
      :icon="faSearch"
      :title="t('standalone.threat_shield.ip_address_not_found')"
    />
    <NeTable v-else :aria-label="t('standalone.threat_shield.banned_ips')" card-breakpoint="xl">
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('common.ip_address') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.ban_start') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.threat_shield.ban_expiration') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="item in paginatedItems" :key="item.ip">
          <NeTableCell :data-label="t('common.ip_address')">
            {{ item.ip }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.ban_start')">
            <p :title="bannedSince(item.expires, item.timeout).toUTCString()">
              {{ formatDateLoc(bannedSince(item.expires, item.timeout), 'PPpp') }}
            </p>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.threat_shield.ban_expiration')">
            <p :title="banExpiresAt(item.expires).toUTCString()">
              {{ formatDateLoc(banExpiresAt(item.expires), 'PPpp') }}
            </p>
          </NeTableCell>
          <NeTableCell>
            <div class="flex flex-col xl:-my-2 xl:flex-row xl:justify-end">
              <NeButton kind="tertiary" size="lg" @click="ipToDelete = item.ip">
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
          :total-rows="filteredIps.length"
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
</template>
