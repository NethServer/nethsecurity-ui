<script lang="ts" setup>
import { getAxiosErrorMessage, NeBadgeV2, NeCard, NeLink } from '@nethesis/vue-components'
import { computed } from 'vue'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useDashboardOverview } from '@/composables/useDashboardOverview'

const { t } = useI18n()

const { data: overview, isPending, isError, error } = useDashboardOverview()

const ips = computed(() => overview.value?.ips)

const errorTitle = computed(() => (isError.value ? t('standalone.ips.failed_to_fetch_info') : ''))
const errorDescription = computed(() => (isError.value ? t(getAxiosErrorMessage(error.value)) : ''))
</script>

<template>
  <NeCard
    :error-description="errorDescription"
    :error-title="errorTitle"
    :icon="['fas', 'shield']"
    :loading="isPending"
    :skeleton-lines="2"
  >
    <template #title>
      <NeLink @click="$router.push(`${getStandaloneRoutePrefix($route)}/security/ips`)">
        {{ t('standalone.ips.sidebar_title') }}
      </NeLink>
    </template>
    <div class="space-y-3">
      <NeBadgeV2 v-if="ips?.enabled" kind="green">
        <FontAwesomeIcon :icon="faCheck" class="size-4" />
        {{ t('standalone.dashboard.active') }}
      </NeBadgeV2>
      <NeBadgeV2 v-else kind="gray">
        <FontAwesomeIcon :icon="faXmark" class="size-4" />
        {{ t('standalone.dashboard.inactive') }}
      </NeBadgeV2>
      <div>
        <p>
          <span class="mr-1 text-xl">{{ ips?.events ?? '-' }}</span>
          {{ t('standalone.ips.events_today', ips?.events ?? 0) }}
        </p>
      </div>
    </div>
  </NeCard>
</template>
