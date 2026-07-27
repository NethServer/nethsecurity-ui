<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeBadgeV2,
  NeCard,
  NeTooltip,
  formatDateLoc
} from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus'
import { DASHBOARD_REFRESH_INTERVAL } from '@/composables/useDashboardOverview'

type HaStatusResponse = {
  data: {
    state: string
    role: string
    status: string
    last_sync_status: string
    last_sync_time: number
  }
}

const { t } = useI18n()

const {
  data: ha,
  isPending,
  isError,
  error
} = useQuery({
  queryKey: ['dashboard', 'ha', 'status'],
  queryFn: ({ signal }) => ubusCall<HaStatusResponse>('ns.ha', 'status', {}, { signal }),
  select: (res) => ({
    status: res.data.status,
    role: res.data.role,
    state: res.data.state,
    lastSyncStatus: res.data.last_sync_status.toLowerCase().replace(/ /g, '_'),
    lastSyncTime: res.data.last_sync_time
  }),
  refetchInterval: DASHBOARD_REFRESH_INTERVAL
})

const lastSyncStatus = computed(() => ha.value?.lastSyncStatus ?? '')
const lastSyncTime = computed(() => Number(ha.value?.lastSyncTime) || 0)

const errorTitle = computed(() => (isError.value ? t('standalone.ha.failed_to_fetch_info') : ''))
const errorDescription = computed(() => (isError.value ? t(getAxiosErrorMessage(error.value)) : ''))

function getBadgeKind(status: string) {
  switch (status) {
    case 'enabled':
    case 'up_to_date':
    case 'successfull':
      return 'green'
    case 'disabled':
      return 'gray'
    default:
      return 'rose'
  }
}

function getBadgeText(status: string) {
  switch (status) {
    case 'enabled':
      return t('standalone.ha.enabled')
    case 'disabled':
      return t('standalone.ha.disabled')
    case 'up_to_date':
    case 'successfull':
      return t('standalone.ha.sync_ok')
    case 'ssh_connection_failed':
    case 'rsync_detection_failed':
    case 'rsync_transfer_failed':
      return t('standalone.ha.sync_failed')
    default:
      return t('standalone.dashboard.unknown')
  }
}

function getBadgeIcon(status: string) {
  switch (status) {
    case 'enabled':
    case 'successfull':
    case 'up_to_date':
      return faCheck
    case 'disabled':
      return faXmark
    default:
      return faXmark
  }
}
</script>

<template>
  <NeCard
    :error-description="errorDescription"
    :error-title="errorTitle"
    :icon="['fas', 'server']"
    :loading="isPending"
    :skeleton-lines="2"
  >
    <template #title>
      {{ t('standalone.ha.sidebar_title') }}
    </template>
    <div class="space-y-3">
      <NeBadgeV2 v-if="ha?.status" :kind="getBadgeKind(ha.status)">
        <FontAwesomeIcon :icon="getBadgeIcon(ha.status)" class="size-4" />
        {{ getBadgeText(ha.status) }}
      </NeBadgeV2>
      <ul v-if="ha?.status === 'enabled'">
        <li>
          <span class="mr-3 font-semibold">{{ t('standalone.ha.role') }}</span
          ><span>{{ t('standalone.ha.' + ha.role) }}</span>
        </li>
        <li>
          <span class="mr-3 font-semibold">{{ t('standalone.ha.state') }}</span>
          <span
            >{{ t('standalone.ha.' + ha.state) }}
            <NeTooltip>
              <template #content>
                <span class="mr-3 font-semibold">{{ t('standalone.ha.last_sync_status') }}</span
                ><span>{{
                  lastSyncStatus
                    ? t('standalone.ha.' + lastSyncStatus)
                    : t('standalone.dashboard.unavailable')
                }}</span
                ><br />

                <span class="mr-3 font-semibold">{{ t('standalone.ha.last_sync_time') }}</span>
                <span>{{
                  lastSyncTime > 0
                    ? formatDateLoc(new Date(lastSyncTime * 1000), 'PPpp')
                    : t('standalone.dashboard.unavailable')
                }}</span>
              </template>
            </NeTooltip></span
          >
        </li>

        <li v-if="ha.role === 'backup'" class="pt-3">
          <NeBadgeV2 kind="amber">
            <FontAwesomeIcon :icon="faTriangleExclamation" class="size-4" />
            {{ t('standalone.ha.backup_warning') }}
          </NeBadgeV2>
        </li>
      </ul>
    </div>
  </NeCard>
</template>
