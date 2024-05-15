<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeBadge, NeCard, NeLink, NeTooltip, getAxiosErrorMessage } from '@nethesis/vue-components'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// random refresh interval between 20 and 30 seconds
const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const internetStatus = ref<any>(null)
const dnsConfiguredStatus = ref<any>(null)
const statusIntervalId = ref(0)

let loading = ref({
  getInternetStatus: false,
  getDnsConfiguredStatus: false
})

let error = ref({
  title: '',
  description: ''
})

onMounted(() => {
  loadData()

  // periodically reload data
  statusIntervalId.value = setInterval(loadData, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (statusIntervalId.value) {
    clearInterval(statusIntervalId.value)
  }
})

function loadData() {
  fetchInternetStatus()
  fetchDnsConfiguredStatus()
}

async function fetchInternetStatus() {
  // show skeleton only the first time
  if (!statusIntervalId.value) {
    loading.value.getInternetStatus = true
  }
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', 'service-status', { service: 'internet' })
    internetStatus.value = res.data.result.status
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_service_status')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getInternetStatus = false
  }
}

async function fetchDnsConfiguredStatus() {
  // show skeleton only the first time
  if (!statusIntervalId.value) {
    loading.value.getDnsConfiguredStatus = true
  }
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', 'service-status', { service: 'dns-configured' })
    dnsConfiguredStatus.value = res.data.result.status
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_service_status')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getDnsConfiguredStatus = false
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

function goToDns() {
  router.push(`${getStandaloneRoutePrefix(route)}/network/dns-dhcp?tab=dns`)
}
</script>

<template>
  <NeCard
    :title="t('standalone.dashboard.internet_connection')"
    :icon="['fas', 'earth-americas']"
    :skeletonLines="2"
    :loading="loading.getInternetStatus || loading.getDnsConfiguredStatus"
    :errorTitle="error.title"
    :errorDescription="error.description"
  >
    <div class="space-y-4">
      <NeBadge
        :kind="getBadgeKind(internetStatus)"
        :text="getBadgeText(internetStatus)"
        :icon="getBadgeIcon(internetStatus)"
      />
      <NeTooltip v-if="dnsConfiguredStatus === 'warning'" class="block">
        <template #trigger>
          <div class="flex items-center gap-2">
            <font-awesome-icon
              :icon="['fas', 'warning']"
              class="h-4 w-4 text-amber-700 dark:text-amber-500"
              aria-hidden="true"
            />
            <NeLink class="text-left">
              {{ t('standalone.dashboard.check_dns_configuration') }}
            </NeLink>
          </div>
        </template>
        <template #content>
          <i18n-t keypath="standalone.dashboard.dns_not_configured_tooltip" tag="p" scope="global">
            <template #dnsLink>
              <NeLink invertedTheme @click="goToDns">
                {{ t('standalone.dns_dhcp.title') }}
              </NeLink>
            </template>
          </i18n-t>
        </template>
      </NeTooltip>
    </div>
  </NeCard>
</template>
