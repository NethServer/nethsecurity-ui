<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeBadge,
  NeCard,
  NeLink,
  NeSkeleton,
  NeTooltip,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'
import router from '@/router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

// random refresh interval between 20 and 30 seconds
const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const serviceStatus = ref<any>(null)
const serviceCounter = ref<any>(null)
const threatShieldConfig = ref<any>(null)
const intervalId = ref(0)

let loading = ref({
  getServiceStatus: false,
  getServiceCounter: false,
  getThreatShieldConfig: false
})

let error = ref({
  title: '',
  description: ''
})

const isLoggingDisabled = computed(() => {
  return (
    !threatShieldConfig.value?.ban_logforwardlan &&
    !threatShieldConfig.value?.ban_logforwardwan &&
    !threatShieldConfig.value?.ban_loginput &&
    !threatShieldConfig.value?.ban_logprerouting
  )
})

onMounted(() => {
  loadData()

  // periodically reload data
  intervalId.value = setInterval(loadData, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

function loadData() {
  getServiceStatus()
  getServiceCounter()
  getThreatShieldConfig()
}

async function getServiceStatus() {
  // show skeleton only the first time
  if (!intervalId.value) {
    loading.value.getServiceStatus = true
  }
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', 'service-status', { service: 'banip' })
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
  if (!intervalId.value) {
    loading.value.getServiceCounter = true
  }
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', 'counter', { service: 'threat_shield_ip' })
    serviceCounter.value = res.data.result.count
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_service_status')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getServiceCounter = false
  }
}

async function getThreatShieldConfig() {
  try {
    loading.value.getThreatShieldConfig = true
    const res = await ubusCall('ns.threatshield', 'list-settings')
    threatShieldConfig.value = res.data.data
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_threat_shield_settings')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getThreatShieldConfig = false
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

function goTo(path: string) {
  router.push(`${getStandaloneRoutePrefix(route)}${path}`)
}
</script>

<template>
  <NeCard
    :icon="['fas', 'shield']"
    :skeletonLines="2"
    :loading="loading.getServiceStatus || loading.getServiceCounter"
    :errorTitle="error.title"
    :errorDescription="error.description"
  >
    <!-- title slot -->
    <template #title>
      <NeLink @click="goTo('/security/threat-shield-ip')">
        {{ t('standalone.dashboard.thread_shield_ip') }}
      </NeLink>
    </template>
    <div class="space-y-3">
      <!-- status -->
      <NeBadge
        :kind="getBadgeKind(serviceStatus)"
        :text="getBadgeText(serviceStatus)"
        :icon="getBadgeIcon(serviceStatus)"
      />
      <!-- monitoring disabled warning -->
      <NeTooltip v-if="isLoggingDisabled" class="inline-block">
        <template #trigger>
          <NeBadge
            kind="warning"
            :text="t('standalone.dashboard.monitoring_disabled')"
            :icon="faWarning"
          />
        </template>
        <template #content>
          <i18n-t keypath="standalone.dashboard.monitoring_disabled_tooltip" tag="p" scope="global">
            <template #page>
              <NeLink invertedTheme @click="goTo('/security/threat-shield-ip?tab=settings')">
                {{ t('standalone.threat_shield.settings') }}
              </NeLink>
            </template>
          </i18n-t>
        </template>
      </NeTooltip>
      <!-- counter -->
      <NeSkeleton v-if="loading.getServiceCounter" :lines="1" class="w-14"></NeSkeleton>
      <div v-else>
        <span class="text-xl">{{ serviceCounter }}</span>
        <span class="ml-2">{{ t('standalone.dashboard.blocked_ips_last_hour') }}</span>
      </div>
    </div>
  </NeCard>
</template>
