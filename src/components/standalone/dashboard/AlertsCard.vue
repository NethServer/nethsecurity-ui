<script lang="ts" setup>
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useAlerts } from '@/composables/useAlerts'
import { faArrowRight, faCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { NeBadgeV2, NeButton, NeCard, NeLink, NeSkeleton } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const { data, status: alertsStatus } = useAlerts()
const { t } = useI18n()

const alertCount = computed<number>(() => {
  return data.value?.length ?? 0
})

function goToAlerts() {
  router.push(`${getStandaloneRoutePrefix(route)}/monitoring/metrics?tab=alerts`)
}
</script>

<template>
  <NeCard :icon="['fas', 'triangle-exclamation']">
    <template #title>
      <NeLink @click="goToAlerts">
        {{ t('standalone.metrics.tabs.alerts') }}
      </NeLink>
    </template>
    <NeSkeleton v-if="alertsStatus == 'pending'" />
    <div v-else class="space-y-3">
      <NeBadgeV2 v-if="!alertCount" kind="green">
        <FontAwesomeIcon :icon="faCheck" class="size-4" />
        {{ t('standalone.metrics.no_alerts') }}
      </NeBadgeV2>
      <p :class="{ 'text-danger': alertCount }">
        <span v-if="alertCount" class="mr-1 text-xl">{{ alertCount }}</span>
        {{ t('standalone.metrics.active_alerts', { count: alertCount }) }}
      </p>
      <NeButton v-if="alertCount" kind="tertiary" @click="goToAlerts">
        <div class="flex items-center gap-2">
          <FontAwesomeIcon :icon="faArrowRight" />
          {{ t('standalone.metrics.go_to_alerts') }}
        </div>
      </NeButton>
    </div>
  </NeCard>
</template>
