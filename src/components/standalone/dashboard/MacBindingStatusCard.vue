<script lang="ts" setup>
import { getStandaloneRoutePrefix } from '@/lib/router.ts'
import { getAxiosErrorMessage, NeBadge, NeCard, NeLink, NeSkeleton } from '@nethesis/vue-components'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'

type ListInterfacesResponse = {
  data: {
    [name: string]: {
      ns_binding: number
    }
  }
}

const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000

const { t } = useI18n()

const error = ref<Error>()
const loading = ref(true)
const enabled = ref(false)
const interval = ref<number>()

onMounted(() => {
  fetchStatus()
  interval.value = setInterval(fetchStatus, REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (interval.value) {
    clearInterval(interval.value)
  }
})

function fetchStatus() {
  ubusCall('ns.dhcp', 'list-interfaces')
    .then((response: ListInterfacesResponse) => {
      enabled.value = Object.values(response.data).some((item) => item.ns_binding != 0)
    })
    .catch((reason: Error) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

const errorDescription = computed((): string => {
  return error.value != undefined ? t(getAxiosErrorMessage(error.value)) : ''
})
</script>

<template>
  <NeCard
    :error-description="errorDescription"
    :error-title="error != undefined ? t('error.cannot_retrieve_service_status') : ''"
    :icon="['fas', 'network-wired']"
    :loading="loading"
    :skeleton-lines="2"
  >
    <template #title>
      <NeLink @click="$router.push(`${getStandaloneRoutePrefix($route)}/network/dns-dhcp`)">
        {{ t('standalone.dns_dhcp.mac_binding') }}
      </NeLink>
    </template>
    <NeSkeleton v-if="loading" />
    <NeBadge
      v-else-if="enabled"
      :icon="faCheck"
      :text="t('standalone.dashboard.active')"
      kind="success"
    />
    <NeBadge v-else :icon="faXmark" :text="t('standalone.dashboard.inactive')" kind="secondary" />
  </NeCard>
</template>
