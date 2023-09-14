<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage, formatDurationLoc } from '@nethserver/vue-tailwind-lib'
import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import NeCard from '@/components/NeCard.vue'

const { t } = useI18n()
const REFRESH_INTERVAL = 10000
const systemInfo = ref<any>(null)
const systemInfoIntervalId: Ref<number> = ref(0)

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
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_system_info')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getSystemInfo = false
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
    </div>
  </NeCard>
</template>
