<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
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
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import {
  DASHBOARD_REFRESH_INTERVAL,
  useDashboardOverview,
  type ServiceStatus
} from '@/composables/useDashboardOverview'
import { getStatusBadge } from '@/lib/standalone/dashboard'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// ubusCall returns the HTTP body: the api-server wraps the ubus result under
// `data`, and ns.dashboard wraps its output under `result`
type ServiceStatusResponse = {
  data: {
    result: {
      status: ServiceStatus
    }
  }
}

const { data: overview, isPending: isOverviewPending } = useDashboardOverview()

// the internet check pings remote hosts and can be very slow when the
// connection is down: it is polled separately from the dashboard overview
const {
  data: internetStatus,
  isPending: isInternetPending,
  isError: isInternetError,
  error: internetError
} = useQuery({
  queryKey: ['dashboard', 'internet-status'],
  queryFn: () =>
    ubusCall<ServiceStatusResponse>('ns.dashboard', 'service-status', {
      service: 'internet'
    }),
  select: (res) => res.data.result.status,
  refetchInterval: DASHBOARD_REFRESH_INTERVAL
})

const internetBadge = computed(() => getStatusBadge(internetStatus.value))
const dnsConfiguredStatus = computed(() => overview.value?.services.dns_configured)

const errorTitle = computed(() =>
  isInternetError.value ? t('error.cannot_retrieve_service_status') : ''
)
const errorDescription = computed(() =>
  isInternetError.value ? t(getAxiosErrorMessage(internetError.value)) : ''
)

function goToDns() {
  router.push(`${getStandaloneRoutePrefix(route)}/network/dns-dhcp?tab=dns`)
}
</script>

<template>
  <NeCard
    :title="t('standalone.dashboard.internet_connection')"
    :icon="['fas', 'earth-americas']"
    :skeleton-lines="2"
    :loading="isInternetPending || isOverviewPending"
    :error-title="errorTitle"
    :error-description="errorDescription"
  >
    <div class="space-y-4">
      <NeBadgeV2 :kind="internetBadge.kind">
        <FontAwesomeIcon :icon="internetBadge.icon" class="size-4" />
        {{ t(internetBadge.textKey) }}
      </NeBadgeV2>
      <NeTooltip v-if="dnsConfiguredStatus === 'warning'" class="block">
        <template #trigger>
          <div class="flex items-center gap-2">
            <FontAwesomeIcon
              :icon="faWarning"
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
              <NeLink inverted-theme @click="goToDns">
                {{ t('standalone.dns_dhcp.title') }}
              </NeLink>
            </template>
          </i18n-t>
        </template>
      </NeTooltip>
    </div>
  </NeCard>
</template>
