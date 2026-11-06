<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeBadgeV2,
  NeCard,
  NeLink,
  NeTooltip,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import router from '@/router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import {
  DASHBOARD_REFRESH_INTERVAL,
  useDashboardOverview
} from '@/composables/useDashboardOverview'
import { useThreatShieldSettings } from '@/composables/useThreatShieldSettings'
import { getStatusBadge } from '@/lib/standalone/dashboard'
import axios from 'axios'
import { getStandaloneApiEndpoint } from '@/lib/config'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'

const { t } = useI18n()
const route = useRoute()
const loginStore = useLoginStore()

const {
  data: overview,
  isPending: isOverviewPending,
  isError: isOverviewError,
  error: overviewError
} = useDashboardOverview()

const {
  data: tsSettings,
  isPending: isSettingsPending,
  isError: isSettingsError,
  error: settingsError
} = useThreatShieldSettings({ refetchInterval: DASHBOARD_REFRESH_INTERVAL })

// banIP blocks of the last hour, counted from the kernel log lines in VictoriaLogs
const {
  data: serviceCounter,
  isPending: isCounterPending,
  isError: isCounterError,
  error: counterError
} = useQuery({
  queryKey: ['dashboard', 'threat-shield-ip-counter'],
  queryFn: () =>
    axios.get<{ blocked: string }>(`${getStandaloneApiEndpoint()}/logs/query`, {
      params: {
        query:
          'app_name:kernel "banIP/" | extract "banIP/<chain>/<verdict>/<feed>: " | filter feed:* | stats count() blocked',
        start: '1h'
      },
      headers: { Authorization: `Bearer ${loginStore.token}` }
    }),
  select: (res) => Math.trunc(Number(res.data.blocked ?? 0)),
  refetchInterval: DASHBOARD_REFRESH_INTERVAL
})

const badge = computed(() => getStatusBadge(overview.value?.services.banip))

const isLoggingDisabled = computed(
  () =>
    !tsSettings.value?.ban_logoutbound &&
    !tsSettings.value?.ban_loginbound &&
    !tsSettings.value?.ban_logprerouting
)

const isPending = computed(
  () => isOverviewPending.value || isSettingsPending.value || isCounterPending.value
)
const isError = computed(
  () => isOverviewError.value || isSettingsError.value || isCounterError.value
)
const error = computed(() => overviewError.value ?? settingsError.value ?? counterError.value)

const errorTitle = computed(() => (isError.value ? t('error.cannot_retrieve_service_status') : ''))
const errorDescription = computed(() => (isError.value ? t(getAxiosErrorMessage(error.value)) : ''))

function goTo(path: string) {
  router.push(`${getStandaloneRoutePrefix(route)}${path}`)
}
</script>

<template>
  <NeCard
    :icon="['fas', 'shield']"
    :skeleton-lines="2"
    :loading="isPending"
    :error-title="errorTitle"
    :error-description="errorDescription"
  >
    <!-- title slot -->
    <template #title>
      <NeLink @click="goTo('/security/threat-shield-ip')">
        {{ t('standalone.dashboard.thread_shield_ip') }}
      </NeLink>
    </template>
    <div class="space-y-3">
      <!-- status -->
      <NeBadgeV2 :kind="badge.kind">
        <FontAwesomeIcon :icon="badge.icon" class="size-4" />
        {{ t(badge.textKey) }}
      </NeBadgeV2>
      <!-- monitoring disabled warning -->
      <NeTooltip v-if="isLoggingDisabled" class="inline-block">
        <template #trigger>
          <NeBadgeV2 kind="amber">
            <FontAwesomeIcon :icon="faWarning" class="size-4" />
            {{ t('standalone.dashboard.monitoring_disabled') }}
          </NeBadgeV2>
        </template>
        <template #content>
          <i18n-t keypath="standalone.dashboard.monitoring_disabled_tooltip" tag="p" scope="global">
            <template #page>
              <NeLink inverted-theme @click="goTo('/security/threat-shield-ip?tab=settings')">
                {{ t('standalone.threat_shield.settings') }}
              </NeLink>
            </template>
          </i18n-t>
        </template>
      </NeTooltip>
      <!-- counter -->
      <div>
        <span class="text-xl">{{ serviceCounter ?? '-' }}</span>
        <span class="ml-2">{{ t('standalone.dashboard.blocked_ips_last_hour') }}</span>
      </div>
    </div>
  </NeCard>
</template>
