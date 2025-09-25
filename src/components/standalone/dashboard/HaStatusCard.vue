<script lang="ts" setup>
import { useHaStatusStore } from '@/stores/standalone/haStatus'
import {
  getAxiosErrorMessage,
  NeCard,
  NeBadge,
  NeSkeleton,
  NeTooltip,
  formatDateLoc
} from '@nethesis/vue-components'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'

const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const ha = useHaStatusStore()
const intervalId = ref(0)
const { t } = useI18n()
const errorTitle = ref<string>()
const errorDescription = ref<string>()

onMounted(() => {
  ha.fetchStatus()
  intervalId.value = setInterval(ha.fetchStatus, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

watch(
  () => ha.error,
  (error) => {
    if (error) {
      errorTitle.value = t('standalone.ha.failed_to_fetch_info')
      errorDescription.value = t(getAxiosErrorMessage(error))
    } else {
      errorTitle.value = ''
      errorDescription.value = ''
    }
  }
)

function getBadgeKind(status: string) {
  switch (status) {
    case 'enabled':
    case 'up_to_date':
    case 'successfull':
      return 'success'
    case 'disabled':
      return 'secondary'
    default:
      return 'error'
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
    :loading="ha.loading"
    :skeleton-lines="2"
  >
    <template #title>
      {{ t('standalone.ha.sidebar_title') }}
    </template>
    <NeSkeleton v-if="ha.loading" />
    <div v-else class="space-y-3">
      <NeBadge
        v-if="ha.status"
        :kind="getBadgeKind(ha.status)"
        :text="getBadgeText(ha.status)"
        :icon="getBadgeIcon(ha.status)"
      />
      <ul v-if="ha.status === 'enabled'">
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
                  ha.lastSyncStatus
                    ? t('standalone.ha.' + ha.lastSyncStatus)
                    : t('standalone.dashboard.unavailable')
                }}</span
                ><br />

                <span class="mr-3 font-semibold">{{ t('standalone.ha.last_sync_time') }}</span>
                <span>{{
                  ha.lastSyncTime > 0
                    ? formatDateLoc(new Date(ha.lastSyncTime * 1000), 'PPpp')
                    : t('standalone.dashboard.unavailable')
                }}</span>
              </template>
            </NeTooltip></span
          >
        </li>

        <li v-if="ha.role === 'backup'" class="pt-3">
          <NeBadge
            :kind="'warning'"
            :icon="['fas', 'triangle-exclamation']"
            :text="t('standalone.ha.backup_warning')"
          />
        </li>
      </ul>
    </div>
  </NeCard>
</template>
