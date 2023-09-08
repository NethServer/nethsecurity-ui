<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeBadge, NeSkeleton, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import NeCard from '@/components/NeCard.vue'

//// review

const props = defineProps({
  serviceName: { type: String },
  hasStatus: { type: Boolean, default: false },
  hasCounter: { type: Boolean, default: false },
  title: {
    type: String
  },
  icon: {
    type: Array<string>
  }
})

const { t } = useI18n()
const STATUS_REFRESH_INTERVAL = 10000
const COUNTER_REFRESH_INTERVAL = 10000
const serviceStatus = ref<any>(null)
const serviceCounter = ref<any>(null)
const statusIntervalId: Ref<number> = ref(0)
const counterIntervalId: Ref<number> = ref(0)

let loading = ref({
  getServiceStatus: false,
  getServiceCounter: false
})

let error = ref({
  title: '',
  description: ''
})

onMounted(() => {
  if (props.hasStatus) {
    getServiceStatus()

    // periodically reload data
    statusIntervalId.value = setInterval(getServiceStatus, STATUS_REFRESH_INTERVAL)
  }

  if (props.hasCounter) {
    getServiceCounter()

    // periodically reload data
    counterIntervalId.value = setInterval(getServiceCounter, COUNTER_REFRESH_INTERVAL)
  }
})

onUnmounted(() => {
  if (statusIntervalId.value) {
    clearInterval(statusIntervalId.value)
  }

  if (counterIntervalId.value) {
    clearInterval(counterIntervalId.value)
  }
})

async function getServiceStatus() {
  // show skeleton only the first time
  if (!statusIntervalId.value) {
    loading.value.getServiceStatus = true
  }

  try {
    const res = await ubusCall('ns.dashboard', 'service-status', { service: props.serviceName })
    serviceStatus.value = res.data.result.status
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_service_status')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getServiceStatus = false
  }
}

async function getServiceCounter() {
  // show skeleton only the first time
  if (!counterIntervalId.value) {
    loading.value.getServiceCounter = true
  }

  try {
    const res = await ubusCall('ns.dashboard', 'counter', { service: props.serviceName })
    serviceCounter.value = res.data.result.count
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_service_status')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getServiceCounter = false
  }
}

function getBadgeKind(status: string) {
  switch (status) {
    case 'ok':
      return 'success'
    case 'warning':
      return 'warning'
    case 'disabled':
      return 'secondary'
    default:
      return 'error'
  }
}

function getBadgeText(status: string) {
  switch (status) {
    case 'ok':
      return t('standalone.dashboard.active')
    case 'warning':
      return t('standalone.dashboard.warning')
    case 'disabled':
      return t('standalone.dashboard.inactive')
    default:
      return t('standalone.dashboard.unknown')
  }
}

function getBadgeIcon(status: string) {
  switch (status) {
    case 'ok':
      return ['fas', 'check']
    case 'warning':
      return ['fas', 'warning']
    case 'disabled':
      return ['fas', 'xmark']
    default:
      return ['fas', 'xmark']
  }
}
</script>

<template>
  <NeCard
    :title="title"
    :icon="icon"
    :skeletonLines="2"
    :loading="loading.getServiceStatus || loading.getServiceCounter"
    :errorTitle="error.title"
    :errorDescription="error.description"
  >
    <NeBadge
      v-if="hasStatus"
      :kind="getBadgeKind(serviceStatus)"
      :text="getBadgeText(serviceStatus)"
      :icon="getBadgeIcon(serviceStatus)"
    />

    <template v-if="hasCounter">
      <NeSkeleton v-if="loading.getServiceCounter" :lines="1" class="w-14"></NeSkeleton>
      <div v-else class="text-xl">{{ serviceCounter }}</div>
    </template>
  </NeCard>
</template>
