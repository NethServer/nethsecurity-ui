<script lang="ts" setup>
import { getStandaloneRoutePrefix } from '@/lib/router.ts'
import { getAxiosErrorMessage, NeBadgeV2, NeCard, NeLink } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useDashboardOverview } from '@/composables/useDashboardOverview'

const { t } = useI18n()

const { data: overview, isPending, isError, error } = useDashboardOverview()

const enabled = computed(() => overview.value?.mac_binding?.enabled ?? false)

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
