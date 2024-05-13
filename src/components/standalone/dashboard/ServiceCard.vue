<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeBadge, NeCard, NeSkeleton, getAxiosErrorMessage } from '@nethesis/vue-components'
import { onMounted, onUnmounted, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'

interface CardCounter {
  name: string
  label: string
}

const props = defineProps({
  serviceName: { type: String },
  hasStatus: { type: Boolean, default: false },
  counter: { type: Object as PropType<CardCounter>, default: undefined },
  title: {
    type: String
  },
  icon: {
    type: Array<string>
  }
})

const { t } = useI18n()

// random refresh interval between 20 and 30 seconds
const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const serviceStatus = ref<any>(null)
const serviceCounter = ref<any>(null)
const statusIntervalId = ref(0)
const counterIntervalId = ref(0)

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
    statusIntervalId.value = setInterval(getServiceStatus, REFRESH_INTERVAL)
  }

  if (props.counter) {
    getServiceCounter()

    // periodically reload data
    counterIntervalId.value = setInterval(getServiceCounter, REFRESH_INTERVAL)
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
  error.value.title = ''
  error.value.description = ''

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
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', 'counter', { service: props.counter?.name })
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
      return faCheck
    case 'warning':
      return faWarning
    case 'disabled':
      return faXmark
    default:
      return faXmark
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
    <!-- title slot (if present) -->
    <template #title>
      <slot name="title"></slot>
    </template>
    <div class="space-y-3">
      <NeBadge
        v-if="hasStatus"
        :kind="getBadgeKind(serviceStatus)"
        :text="getBadgeText(serviceStatus)"
        :icon="getBadgeIcon(serviceStatus)"
      />
      <template v-if="counter">
        <NeSkeleton v-if="loading.getServiceCounter" :lines="1" class="w-14"></NeSkeleton>
        <div v-else>
          <span class="text-xl">{{ serviceCounter }}</span>
          <span v-if="counter.label" class="ml-2">{{ counter.label }}</span>
        </div>
      </template>
    </div>
  </NeCard>
</template>
