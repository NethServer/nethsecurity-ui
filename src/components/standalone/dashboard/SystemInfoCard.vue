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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { round } from 'lodash-es'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRouter } from 'vue-router'
import type { SystemUpdate } from '@/views/standalone/system/UpdateView.vue'

const { t } = useI18n()
const router = useRouter()

// random refresh interval between 20 and 30 seconds
const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const systemInfo = ref<any>({})
const loadDataIntervalId = ref(0)
const systemUpdateData = ref<SystemUpdate | null>(null)

const freeMemory = ref(0)
const totalMemory = ref(0)
const memoryUsagePerc = ref(0)

const freeRoot = ref(0)
const totalRoot = ref(0)
const rootUsagePerc = ref(0)

const freeTmpfs = ref(0)
const totalTmpfs = ref(0)
const tmpfsUsagePerc = ref(0)

const freeDataStorage = ref(0)
const totalDataStorage = ref(0)
const dataStorageUsagePerc = ref(0)

let loading = ref({
  getSystemInfo: true,
  getUpdatesStatus: true
})

let error = ref({
  title: '',
  description: ''
})

const isUpdateAvailable = computed(
  () =>
    systemUpdateData.value?.lastVersion &&
    systemUpdateData.value.lastVersion != systemUpdateData.value?.currentVersion
)

const isUpdateScheduled = computed(
  () => systemUpdateData.value?.scheduledAt && systemUpdateData.value.scheduledAt != -1
)

onMounted(() => {
  loadData()

  // periodically reload system info
  loadDataIntervalId.value = setInterval(loadData, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (loadDataIntervalId.value) {
    clearInterval(loadDataIntervalId.value)
  }
})

function loadData() {
  error.value.title = ''
  error.value.description = ''
  getSystemInfo()
  getUpdatesStatus()
}

async function getSystemInfo() {
  try {
    const res = await ubusCall('ns.dashboard', 'system-info')
    systemInfo.value = res.data.result

    freeMemory.value = systemInfo.value.memory.available_bytes
    const usedMemory = systemInfo.value.memory.used_bytes
    totalMemory.value = usedMemory + freeMemory.value
    memoryUsagePerc.value = round((usedMemory / totalMemory.value) * 100)

    freeRoot.value = systemInfo.value.storage['/'].available_bytes
    const usedRoot = systemInfo.value.storage['/'].used_bytes
    totalRoot.value = usedRoot + freeRoot.value
    rootUsagePerc.value = round((usedRoot / totalRoot.value) * 100)

    freeTmpfs.value = systemInfo.value.storage['tmpfs'].available_bytes
    const usedTmpfs = systemInfo.value.storage['tmpfs'].used_bytes
    totalTmpfs.value = usedTmpfs + freeTmpfs.value
    tmpfsUsagePerc.value = round((usedTmpfs / totalTmpfs.value) * 100)

    freeDataStorage.value = systemInfo.value.storage['/mnt/data'].available_bytes
    const usedDataStorage = systemInfo.value.storage['/mnt/data'].used_bytes
    totalDataStorage.value = usedDataStorage + freeDataStorage.value
    dataStorageUsagePerc.value = round((usedDataStorage / totalDataStorage.value) * 100)
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_system_info')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getSystemInfo = false
  }
}

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

async function getUpdatesStatus() {
  try {
    systemUpdateData.value = (await ubusCall('ns.update', 'check-system-update')).data
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_updates_status')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getUpdatesStatus = false
  }
}
</script>

<template>
  <NeCard
    :title="t('standalone.dashboard.system')"
    :skeletonLines="5"
    :loading="loading.getSystemInfo"
    :errorTitle="error.title"
    :errorDescription="error.description"
  >
    <div class="mb-2 mt-3 flex items-center">
      <div
        class="mr-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary-400 dark:bg-primary-700"
      >
        <FontAwesomeIcon :icon="['fas', 'server']" class="h-5 w-5 text-white" />
      </div>
      <div>{{ systemInfo?.hardware || '-' }}</div>
    </div>
    <div class="divide-y divide-gray-300 dark:divide-gray-600">
      <div class="py-3">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.hostname') }}</span>
        <div class="inline-flex items-center gap-1">
          <span>{{ systemInfo?.hostname || '-' }}</span>
          <!-- warning for default hostname -->
          <NeTooltip v-if="systemInfo.hostname === 'NethSec'" interactive class="leading-none">
            <template #trigger>
              <font-awesome-icon
                :icon="['fas', 'warning']"
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
                  <NeLink invertedTheme @click="goToSystemSettings">
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
          <NeSpinner v-if="loading.getUpdatesStatus" size="4" />
          <!-- warning for image update available -->
          <NeTooltip v-if="isUpdateAvailable && !isUpdateScheduled" class="leading-none">
            <template #trigger>
              <font-awesome-icon
                :icon="['fas', 'warning']"
                class="h-4 w-4 text-amber-700 dark:text-amber-500"
                aria-hidden="true"
              />
            </template>
            <template #content>
              {{ t('standalone.update.new_release_available') }}.
              <NeLink invertedTheme @click="goToUpdates">
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
              free: byteFormat1024(freeMemory),
              total: byteFormat1024(totalMemory)
            })
          }}</span>
          <NeProgressBar
            :progress="memoryUsagePerc"
            size="sm"
            :color="getProgressBarColor(memoryUsagePerc)"
            class="my-1"
          />
        </div>
        <div>
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.root_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(freeRoot),
              total: byteFormat1024(totalRoot)
            })
          }}</span>
          <NeProgressBar
            :progress="rootUsagePerc"
            size="sm"
            :color="getProgressBarColor(rootUsagePerc)"
            class="my-1"
          />
        </div>
        <div>
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.tmpfs_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(freeTmpfs),
              total: byteFormat1024(totalTmpfs)
            })
          }}</span>
          <NeProgressBar
            :progress="tmpfsUsagePerc"
            size="sm"
            :color="getProgressBarColor(tmpfsUsagePerc)"
            class="my-1"
          />
        </div>
        <div v-if="dataStorageUsagePerc">
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.storage_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(freeDataStorage),
              total: byteFormat1024(totalDataStorage)
            })
          }}</span>
          <NeProgressBar
            :progress="dataStorageUsagePerc"
            size="sm"
            :color="getProgressBarColor(dataStorageUsagePerc)"
            class="my-1"
          />
        </div>
      </div>
    </div>
  </NeCard>
</template>
