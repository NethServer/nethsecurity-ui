<script lang="ts" setup>
import { getStandaloneRoutePrefix } from '@/lib/router.ts'
import { getAxiosErrorMessage, NeBadgeV2, NeCard, NeLink } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { DASHBOARD_REFRESH_INTERVAL } from '@/composables/useDashboardOverview'

type ListInterfacesResponse = {
  data: {
    [name: string]: {
      ns_binding: number
    }
  }
}

const { t } = useI18n()

const {
  data: enabled,
  isPending,
  isError,
  error
} = useQuery({
  queryKey: ['dashboard', 'mac-binding'],
  queryFn: ({ signal }) =>
    ubusCall<ListInterfacesResponse>('ns.dhcp', 'list-interfaces', {}, { signal }),
  select: (res) => Object.values(res.data).some((item) => item.ns_binding != 0),
  refetchInterval: DASHBOARD_REFRESH_INTERVAL
})

const errorTitle = computed(() => (isError.value ? t('error.cannot_retrieve_service_status') : ''))
const errorDescription = computed(() => (isError.value ? t(getAxiosErrorMessage(error.value)) : ''))
</script>

<template>
  <NeCard
    :error-description="errorDescription"
    :error-title="errorTitle"
    :icon="['fas', 'network-wired']"
    :loading="isPending"
    :skeleton-lines="2"
  >
    <template #title>
      <NeLink @click="$router.push(`${getStandaloneRoutePrefix($route)}/network/dns-dhcp`)">
        {{ t('standalone.dns_dhcp.mac_binding') }}
      </NeLink>
    </template>
    <NeBadgeV2 v-if="enabled" kind="green">
      <FontAwesomeIcon :icon="faCheck" class="size-4" />
      {{ t('standalone.dashboard.active') }}
    </NeBadgeV2>
    <NeBadgeV2 v-else kind="gray">
      <FontAwesomeIcon :icon="faXmark" class="size-4" />
      {{ t('standalone.dashboard.inactive') }}
    </NeBadgeV2>
  </NeCard>
</template>
