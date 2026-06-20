<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeBadge, NeCard, NeSkeleton, getAxiosErrorMessage } from '@nethesis/vue-components'
import { computed, onMounted, onUnmounted, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'

interface CardCounter {
  name: string
  label: string
}

type ServiceStatus = 'ok' | 'warning' | 'disabled' | 'error' | string

const props = defineProps({
  serviceName: { type: String },
  hasStatus: { type: Boolean, default: false },
  counter: { type: Object as PropType<CardCounter>, default: undefined },
  initialStatus: { type: String as PropType<ServiceStatus | undefined>, default: undefined },
  initialCounter: { type: Number as PropType<number | undefined>, default: undefined },
  deferInitialLoad: { type: Boolean, default: false },
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
const serviceStatus = ref<ServiceStatus | null>(null)
const serviceCounter = ref<number | null>(null)
const statusIntervalId = ref(0)
const counterIntervalId = ref(0)
const initialized = ref(false)

const loading = ref({
  getServiceStatus: props.hasStatus,
  getServiceCounter: !!props.counter
})

const error = ref({
  title: '',
  description: ''
})

const isWaitingForInitialData = computed(() => props.deferInitialLoad && !initialized.value)

onMounted(() => {
  if (!props.deferInitialLoad) {
    initializeData()
  }
})

watch(
  () => props.deferInitialLoad,
  (deferInitialLoad) => {
    if (!deferInitialLoad) {
      initializeData()
    }
  }
)

onUnmounted(() => {
  if (statusIntervalId.value) {
    clearInterval(statusIntervalId.value)
  }

  if (counterIntervalId.value) {
    clearInterval(counterIntervalId.value)
  }
})

function initializeData() {
  if (initialized.value) {
    return
  }

  initialized.value = true

  if (props.hasStatus) {
    if (props.initialStatus !== undefined) {
      serviceStatus.value = props.initialStatus
      loading.value.getServiceStatus = false
    } else {
      getServiceStatus()
    }
    statusIntervalId.value = setInterval(getServiceStatus, REFRESH_INTERVAL)
  }

  if (props.counter) {
    if (props.initialCounter !== undefined) {
      serviceCounter.value = props.initialCounter
      loading.value.getServiceCounter = false
    } else {
      getServiceCounter()
    }
    counterIntervalId.value = setInterval(getServiceCounter, REFRESH_INTERVAL)
  }
}

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
    :skeleton-lines="2"
    :loading="loading.getServiceStatus || loading.getServiceCounter || isWaitingForInitialData"
    :error-title="error.title"
    :error-description="error.description"
  >
    <!-- title slot (if present) -->
    <template #title>
      <slot name="title"></slot>
    </template>
    <div class="space-y-3">
      <NeBadge
        v-if="hasStatus"
        :kind="getBadgeKind(serviceStatus ?? 'error')"
        :text="getBadgeText(serviceStatus ?? 'error')"
        :icon="getBadgeIcon(serviceStatus ?? 'error')"
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
