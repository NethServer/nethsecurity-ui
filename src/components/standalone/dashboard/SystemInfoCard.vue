<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeCard,
  NeProgressBar,
  NeTooltip,
  NeLink,
  getAxiosErrorMessage,
  formatDurationLoc,
  byteFormat1024,
  NeSpinner
} from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { round } from 'lodash-es'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRouter } from 'vue-router'
import type { SystemUpdate } from '@/views/standalone/system/UpdateView.vue'
import { useQuery } from '@tanstack/vue-query'
import { faServer, faWarning } from '@fortawesome/free-solid-svg-icons'
import { useDashboardOverview, type StorageEntry } from '@/composables/useDashboardOverview'

const { t } = useI18n()
const router = useRouter()

type SystemUpdateResponse = {
  data: SystemUpdate
}

type Usage = {
  free: number
  total: number
  perc: number
}

// check-system-update queries the remote update server: poll it sparingly
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000

const {
  data: overview,
  isPending: isSystemInfoPending,
  isError: isSystemInfoError,
  error: systemInfoError
} = useDashboardOverview()

const systemInfo = computed(() => overview.value?.system ?? null)

const { data: systemUpdateData, isFetching: isUpdateStatusFetching } = useQuery({
  queryKey: ['dashboard', 'check-system-update'],
  queryFn: ({ signal }) =>
    ubusCall<SystemUpdateResponse>('ns.update', 'check-system-update', {}, { signal }),
  select: (res) => res.data,
  refetchInterval: UPDATE_CHECK_INTERVAL,
  staleTime: UPDATE_CHECK_INTERVAL,
  // run only after system-info has returned data
  enabled: computed(() => !!systemInfo.value)
})

const errorTitle = computed(() =>
  isSystemInfoError.value ? t('error.cannot_retrieve_system_info') : ''
)
const errorDescription = computed(() =>
  isSystemInfoError.value ? t(getAxiosErrorMessage(systemInfoError.value)) : ''
)

function usageFromStorage(entry?: StorageEntry): Usage {
  const free = entry?.available_bytes ?? 0
  const used = entry?.used_bytes ?? 0
  const total = free + used
  return { free, total, perc: total ? round((used / total) * 100) : 0 }
}

const memory = computed<Usage>(() => {
  const mem = systemInfo.value?.memory
  if (!mem) {
    return { free: 0, total: 0, perc: 0 }
  }

  const total = mem.mem_total
  const free = mem.mem_available
  const used = total - free
  return { free, total, perc: total ? round((used / total) * 100) : 0 }
})

const root = computed<Usage>(() => usageFromStorage(systemInfo.value?.storage['/']))
const tmpfs = computed<Usage>(() => usageFromStorage(systemInfo.value?.storage['tmpfs']))
const dataStorage = computed<Usage>(() => usageFromStorage(systemInfo.value?.storage['/mnt/data']))

const isUpdateAvailable = computed(
  () =>
    systemUpdateData.value?.lastVersion &&
    systemUpdateData.value.lastVersion != systemUpdateData.value?.currentVersion
)

const isUpdateScheduled = computed(
  () => systemUpdateData.value?.scheduledAt && systemUpdateData.value.scheduledAt != -1
)

function getProgressBarColor(progress: number) {
  if (progress < 75) {
    return 'primary'
  } else if (progress < 90) {
    return 'amber'
  } else {
    return 'rose'
  }
}

function goToSystemSettings() {
  router.push(`${getStandaloneRoutePrefix()}/system/systemSettings`)
}

function goToUpdates() {
  router.push(`${getStandaloneRoutePrefix()}/system/update`)
}
</script>

<template>
  <NeCard
    :title="t('standalone.dashboard.system')"
    :skeleton-lines="5"
    :loading="isSystemInfoPending"
    :error-title="errorTitle"
    :error-description="errorDescription"
  >
    <div class="mt-3 mb-2 flex items-center">
      <div
        class="mr-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-400 dark:bg-primary-700"
      >
        <FontAwesomeIcon :icon="faServer" class="h-5 w-5 text-white" />
      </div>
      <div>{{ systemInfo?.hardware || '-' }}</div>
    </div>
    <div class="divide-y divide-gray-300 dark:divide-gray-600">
      <div class="py-3">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.hostname') }}</span>
        <div class="inline-flex items-center gap-1">
          <span>{{ systemInfo?.hostname || '-' }}</span>
          <!-- warning for default hostname -->
          <NeTooltip v-if="systemInfo?.hostname === 'NethSec'" interactive class="leading-none">
            <template #trigger>
              <FontAwesomeIcon
                :icon="faWarning"
                class="h-4 w-4 text-amber-700 dark:text-amber-500"
                aria-hidden="true"
              />
            </template>
            <template #content>
              <i18n-t
                keypath="standalone.dashboard.default_hostname_warning"
                tag="p"
                scope="global"
              >
                <template #systemSettingsLink>
                  <NeLink inverted-theme @click="goToSystemSettings">
                    {{ t('standalone.system_settings.title') }}
                  </NeLink>
                </template>
              </i18n-t>
            </template>
          </NeTooltip>
        </div>
      </div>
      <div class="py-3">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.operating_system') }}</span>
        <div class="inline-flex items-center gap-2">
          <span>{{ systemInfo?.version?.release || '-' }}</span>
          <NeSpinner v-if="isUpdateStatusFetching" size="4" />
          <!-- warning for image update available -->
          <NeTooltip v-if="isUpdateAvailable && !isUpdateScheduled" class="leading-none">
            <template #trigger>
              <FontAwesomeIcon
                :icon="faWarning"
                class="h-4 w-4 text-amber-700 dark:text-amber-500"
                aria-hidden="true"
              />
            </template>
            <template #content>
              {{ t('standalone.update.new_release_available') }}.
              <NeLink inverted-theme @click="goToUpdates">
                {{ t('common.go_to_page', { page: t('standalone.update.title') }) }}
              </NeLink>
            </template>
          </NeTooltip>
        </div>
      </div>
      <div class="py-3">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.uptime') }}</span>
        <span>{{ systemInfo?.uptime ? formatDurationLoc(systemInfo.uptime) : '-' }}</span>
      </div>
      <div class="py-3">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.load_minutes') }}</span>
        <span>{{
          systemInfo?.load
            ? `${systemInfo.load[0].toFixed(2)} / ${systemInfo.load[1].toFixed(
                2
              )} / ${systemInfo.load[2].toFixed(2)}`
            : '-'
        }}</span>
      </div>
      <!-- memory and storage usage -->
      <div class="space-y-4 pt-4">
        <div>
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.memory_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(memory.free),
              total: byteFormat1024(memory.total)
            })
          }}</span>
          <NeProgressBar
            :progress="memory.perc"
            size="sm"
            :color="getProgressBarColor(memory.perc)"
            class="my-1"
          />
        </div>
        <div>
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.root_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(root.free),
              total: byteFormat1024(root.total)
            })
          }}</span>
          <NeProgressBar
            :progress="root.perc"
            size="sm"
            :color="getProgressBarColor(root.perc)"
            class="my-1"
          />
        </div>
        <div>
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.tmpfs_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(tmpfs.free),
              total: byteFormat1024(tmpfs.total)
            })
          }}</span>
          <NeProgressBar
            :progress="tmpfs.perc"
            size="sm"
            :color="getProgressBarColor(tmpfs.perc)"
            class="my-1"
          />
        </div>
        <div v-if="dataStorage.free != 0 || dataStorage.total != 0">
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.storage_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(dataStorage.free),
              total: byteFormat1024(dataStorage.total)
            })
          }}</span>
          <NeProgressBar
            :progress="dataStorage.perc"
            size="sm"
            :color="getProgressBarColor(dataStorage.perc)"
            class="my-1"
          />
        </div>
      </div>
    </div>
  </NeCard>
</template>
