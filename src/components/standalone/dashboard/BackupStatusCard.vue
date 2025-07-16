<script lang="ts" setup>
import {
  formatDateLoc,
  getAxiosErrorMessage,
  NeBadge,
  NeCard,
  NeLink
} from '@nethesis/vue-components'
import { useSubscriptionStore } from '@/stores/standalone/subscription.ts'
import { getStandaloneRoutePrefix } from '@/lib/router.ts'
import { useI18n } from 'vue-i18n'
import { computed, ref, watchEffect } from 'vue'
import { faClock, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'
import { useBackupsStore } from '@/stores/standalone/backups.ts'

type BackupData = {
  created: number
  id: string
  mimetype: string
  name: string
  size: number
}

type BackupResponse = AxiosResponse<{
  values: {
    backups: BackupData[]
  }
}>

const subscription = useSubscriptionStore()
const backups = useBackupsStore()

const { t } = useI18n()

const latestBackupLoading = ref(true)
const latestBackupError = ref<Error>()
const lastBackup = ref<string>()

watchEffect(() => {
  if (subscription.isActive) {
    latestBackupError.value = undefined
    latestBackupLoading.value = true
    ubusCall('ns.backup', 'registered-list-backups')
      .then((response: BackupResponse) => {
        const backup = response.data.values.backups.sort((a, b) => b.created - a.created).shift()
        if (backup != undefined) {
          lastBackup.value = formatDateLoc(new Date(backup.created * 1000), 'PPpp')
        } else {
          lastBackup.value = undefined
        }
      })
      .catch(() => {
        lastBackup.value = undefined
      })
  }
})

const loading = computed((): boolean => {
  return [subscription.loading, latestBackupLoading.value, backups.loading].every((entry) => entry)
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
      <NeBadge
        v-if="!backups.isPassPhraseSet"
        :icon="faTriangleExclamation"
        :text="t('standalone.backup_and_restore.backup.passphrase_not_configured')"
        class="text-center"
        kind="warning"
      />
    </div>
  </NeCard>
</template>
