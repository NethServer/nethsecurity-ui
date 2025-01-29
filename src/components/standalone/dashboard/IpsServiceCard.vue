<script lang="ts" setup>
import { useIpsStatusStore } from '@/stores/standalone/ipsStatus'
import { getAxiosErrorMessage, NeCard, NeLink, NeSkeleton } from '@nethesis/vue-components'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useI18n } from 'vue-i18n'
import IpsEnabledBadge from '@/components/standalone/security/ips/IpsEnabledBadge.vue'

const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const ips = useIpsStatusStore()
const intervalId = ref(0)
const { t } = useI18n()
const errorTitle = ref<string>()
const errorDescription = ref<string>()

onMounted(() => {
  ips.fetchStatus()
  intervalId.value = setInterval(ips.fetchStatus, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

watch(
  () => ips.error,
  (error) => {
    if (error) {
      errorTitle.value = t('standalone.ips.failed_to_fetch_info')
      errorDescription.value = t(getAxiosErrorMessage(error))
    } else {
      errorTitle.value = ''
      errorDescription.value = ''
    }
  }
)
</script>

<template>
  <NeCard
    :error-description="errorDescription"
    :error-title="errorTitle"
    :icon="['fas', 'shield']"
    :loading="ips.loading"
    :skeleton-lines="2"
  >
    <template #title>
      <NeLink @click="$router.push(`${getStandaloneRoutePrefix($route)}/security/ips`)">
        {{ t('standalone.ips.sidebar_title') }}
      </NeLink>
    </template>
    <NeSkeleton v-if="ips.loading" />
    <div class="space-y-3" v-else>
      <IpsEnabledBadge
        :disabled-label="t('standalone.dashboard.inactive')"
        :enabled-label="t('standalone.dashboard.active')"
      />
      <div>
        <p>
          <span class="mr-1 text-xl">{{ ips.events }}</span>
          {{ t('standalone.ips.events_today', ips.events) }}
        </p>
      </div>
    </div>
  </NeCard>
</template>
