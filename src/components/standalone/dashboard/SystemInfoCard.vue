<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeCard,
  NeProgressBar,
  getAxiosErrorMessage,
  formatDurationLoc,
  byteFormat1024
} from '@nethserver/vue-tailwind-lib'
import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { round } from 'lodash'

const { t } = useI18n()
const REFRESH_INTERVAL = 10000
const systemInfo = ref<any>(null)
const systemInfoIntervalId: Ref<number> = ref(0)

const freeMemory = ref<number>(0)
const totalMemory = ref<number>(0)
const memoryUsagePerc = ref<number>(0)

const freeRoot = ref<number>(0)
const totalRoot = ref<number>(0)
const rootUsagePerc = ref<number>(0)

const freeTmpfs = ref<number>(0)
const totalTmpfs = ref<number>(0)
const tmpfsUsagePerc = ref<number>(0)

const freeStorage = ref<number>(0)
const totalStorage = ref<number>(0)
const storageUsagePerc = ref<number>(0)

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

    console.log('memory', systemInfo.value.memory) ////

    freeMemory.value = systemInfo.value.memory.available_bytes * 1024
    const usedMemory = systemInfo.value.memory.used_bytes * 1024
    totalMemory.value = usedMemory + freeMemory.value
    memoryUsagePerc.value = round((usedMemory / totalMemory.value) * 100)

    freeRoot.value = systemInfo.value.storage['/'].available_bytes * 1024
    const usedRoot = systemInfo.value.storage['/'].used_bytes * 1024
    totalRoot.value = usedRoot + freeRoot.value
    rootUsagePerc.value = round((usedRoot / totalRoot.value) * 100)

    freeTmpfs.value = systemInfo.value.storage['tmpfs'].available_bytes * 1024
    const usedTmpfs = systemInfo.value.storage['tmpfs'].used_bytes * 1024
    totalTmpfs.value = usedTmpfs + freeTmpfs.value
    tmpfsUsagePerc.value = round((usedTmpfs / totalTmpfs.value) * 100)

    freeStorage.value = systemInfo.value.storage['/mnt/storage'].available_bytes * 1024
    const usedStorage = systemInfo.value.storage['/mnt/storage'].used_bytes * 1024
    totalStorage.value = usedStorage + freeStorage.value
    storageUsagePerc.value = round((usedStorage / totalStorage.value) * 100)
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
        <div v-if="storageUsagePerc">
          <span class="mr-3 font-semibold">{{ t('standalone.dashboard.storage_usage') }}</span>
          <span>{{
            t('standalone.dashboard.usage_free_of_total', {
              free: byteFormat1024(freeStorage),
              total: byteFormat1024(totalStorage)
            })
          }}</span>
          <NeProgressBar
            :progress="storageUsagePerc"
            size="sm"
            :color="getProgressBarColor(storageUsagePerc)"
            class="my-1"
          />
        </div>
      </div>
    </div>
  </NeCard>
</template>
