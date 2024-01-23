<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeCard } from '@nethesis/vue-components'
import {
  NeProgressBar,
  getAxiosErrorMessage,
  formatDurationLoc,
  byteFormat1024
} from '@nethserver/vue-tailwind-lib'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { round } from 'lodash-es'

const { t } = useI18n()
const REFRESH_INTERVAL = 10000
const systemInfo = ref<any>(null)
const systemInfoIntervalId = ref(0)

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
  getSystemInfo: true
})

let error = ref({
  title: '',
  description: ''
})

onMounted(() => {
  getSystemInfo()

  // periodically reload system info
  systemInfoIntervalId.value = setInterval(getSystemInfo, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (systemInfoIntervalId.value) {
    clearInterval(systemInfoIntervalId.value)
  }
})

async function getSystemInfo() {
  error.value.title = ''
  error.value.description = ''

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
      <div class="py-2">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.hostname') }}</span>
        <span>{{ systemInfo?.hostname || '-' }}</span>
      </div>
      <div class="py-2">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.operating_system') }}</span>
        <span>{{ systemInfo?.version?.release || '-' }}</span>
      </div>
      <div class="py-2">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.uptime') }}</span>
        <span>{{ systemInfo?.uptime ? formatDurationLoc(systemInfo.uptime) : '-' }}</span>
      </div>
      <div class="py-2">
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
      <div class="space-y-3 py-2">
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
