<script lang="ts" setup>
import {
  formatDateLoc,
  getAxiosErrorMessage,
  NeBadgeV2,
  NeCard,
  NeLink
} from '@nethesis/vue-components'
import { useSubscriptionStore } from '@/stores/standalone/subscription.ts'
import { getStandaloneRoutePrefix } from '@/lib/router.ts'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { faClock, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { useQuery } from '@tanstack/vue-query'
import type { AxiosResponse } from 'axios'
import { useBackupsStore } from '@/stores/standalone/backups.ts'
import { DASHBOARD_REFRESH_INTERVAL } from '@/composables/useDashboardOverview'

type BackupData = {
  uploaded_at: string
  id: string
  mimetype: string
  filename: string
  size: number
  sha256?: string
}

type BackupResponse = AxiosResponse<{
  values: {
    backups: BackupData[]
  }
}>

const subscription = useSubscriptionStore()
const backups = useBackupsStore()

const { t } = useI18n()

const {
  data: lastBackup,
  isPending: latestBackupLoading,
  error: latestBackupError
} = useQuery({
  queryKey: ['dashboard', 'backup', 'last'],
  queryFn: ({ signal }) =>
    ubusCall<BackupResponse>('ns.backup', 'registered-list-backups', {}, { signal }),
  select: (response) => {
    const backup = response.data.values.backups
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .shift()
    return backup != undefined ? formatDateLoc(new Date(backup.uploaded_at), 'PPpp') : undefined
  },
  enabled: () => subscription.isActive,
  refetchInterval: DASHBOARD_REFRESH_INTERVAL
})

const loading = computed((): boolean => {
  return [subscription.loading, latestBackupLoading.value, backups.loading].some((entry) => entry)
})

const error = computed((): string | undefined => {
  const errorThrown = [subscription.error, latestBackupError.value, backups.error].find(
    (entry) => entry != undefined
  )
  if (errorThrown != undefined) {
    return t(getAxiosErrorMessage(errorThrown))
  }
  return undefined
})
</script>

<template>
  <NeCard
    v-if="subscription.isActive && !loading"
    :error-description="error"
    :error-title="error != undefined ? t('error.cannot_retrieve_service_status') : ''"
    :icon="['fas', 'server']"
    :skeleton-lines="2"
  >
    <template #title>
      <NeLink
        @click="$router.push(`${getStandaloneRoutePrefix($route)}/system/backup-and-restore`)"
      >
        {{ t('standalone.backup_and_restore.backup.remote_backup') }}
      </NeLink>
    </template>
    <div class="space-y-4">
      <p class="font-medium text-primary-neutral">
        {{ t('standalone.backup_and_restore.backup.last_backup') }}
      </p>
      <p class="flex items-center gap-2 text-tertiary-neutral">
        <template v-if="lastBackup != undefined">
          <FontAwesomeIcon :icon="faClock" />
          {{ lastBackup }}
        </template>
        <template v-else>
          {{ t('standalone.backup_and_restore.backup.no_backups') }}
        </template>
      </p>
      <NeBadgeV2 v-if="!backups.isPassPhraseSet" kind="amber" class="text-center">
        <FontAwesomeIcon :icon="faTriangleExclamation" class="size-4" />
        {{ t('standalone.backup_and_restore.backup.passphrase_not_configured') }}
      </NeBadgeV2>
    </div>
  </NeCard>
</template>
