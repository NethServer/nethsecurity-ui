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
  formatDurationLoc
} from '@nethserver/vue-tailwind-lib'
import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { round } from 'lodash'

const { t } = useI18n()
const REFRESH_INTERVAL = 10000
const systemInfo = ref<any>(null)
const systemInfoIntervalId: Ref<number> = ref(0)
const memoryUsage = ref<number>(0)
const rootUsage = ref<number>(0)
const storageUsage = ref<number>(0)
const tmpfsUsage = ref<number>(0)

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

    const totalMemory = systemInfo.value.memory.used_bytes + systemInfo.value.memory.available_bytes
    memoryUsage.value = round((systemInfo.value.memory.used_bytes / totalMemory) * 100)

    const totalRoot =
      systemInfo.value.storage['/'].used_bytes + systemInfo.value.storage['/'].available_bytes
    rootUsage.value = round((systemInfo.value.storage['/'].used_bytes / totalRoot) * 100)

    const totalTmpfs =
      systemInfo.value.storage['tmpfs'].used_bytes +
      systemInfo.value.storage['tmpfs'].available_bytes
    tmpfsUsage.value = round((systemInfo.value.storage['tmpfs'].used_bytes / totalTmpfs) * 100)

    const totalStorage =
      systemInfo.value.storage['/mnt/storage'].used_bytes +
      systemInfo.value.storage['/mnt/storage'].available_bytes
    storageUsage.value = round(
      (systemInfo.value.storage['/mnt/storage'].used_bytes / totalStorage) * 100
    )
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
      <div class="py-2">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.memory_usage') }}</span>
        <span>{{ memoryUsage }}%</span>
        <NeProgressBar
          :progress="memoryUsage"
          size="sm"
          :color="getProgressBarColor(memoryUsage)"
          class="my-1"
        />
      </div>
      <div class="py-2">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.root_usage') }}</span>
        <span>{{ rootUsage }}%</span>
        <NeProgressBar
          :progress="rootUsage"
          size="sm"
          :color="getProgressBarColor(rootUsage)"
          class="my-1"
        />
      </div>
      <div class="py-2">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.tmpfs_usage') }}</span>
        <span>{{ tmpfsUsage }}%</span>
        <NeProgressBar
          :progress="tmpfsUsage"
          size="sm"
          :color="getProgressBarColor(tmpfsUsage)"
          class="my-1"
        />
      </div>
      <div v-if="storageUsage" class="py-2">
        <span class="mr-3 font-semibold">{{ t('standalone.dashboard.storage_usage') }}</span>
        <span>{{ storageUsage }}%</span>
        <NeProgressBar
          :progress="storageUsage"
          size="sm"
          :color="getProgressBarColor(storageUsage)"
          class="my-1"
        />
      </div>
    </div>
  </NeCard>
</template>
