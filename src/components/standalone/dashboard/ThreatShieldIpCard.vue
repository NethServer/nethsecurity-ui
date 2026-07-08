<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeBadgeV2, NeCard, NeLink, NeTooltip, getAxiosErrorMessage } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faWarning } from '@fortawesome/free-solid-svg-icons'
import router from '@/router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRoute } from 'vue-router'
import { useDashboardOverview } from '@/composables/useDashboardOverview'
import { getStatusBadge } from '@/lib/standalone/dashboard'

const { t } = useI18n()
const route = useRoute()

const { data: overview, isPending, isError, error } = useDashboardOverview()

const badge = computed(() => getStatusBadge(overview.value?.services.banip))
const serviceCounter = computed(() => overview.value?.counters.threat_shield_ip)

// show the warning only when the logging flags are actually known
const isLoggingDisabled = computed(
  () => overview.value?.threat_shield != null && !overview.value.threat_shield.logging_enabled
)

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
