<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { CYAN_500, CYAN_600 } from '@/lib/color'
import { ubusCall } from '@/lib/standalone/ubus'
import { useThemeStore } from '@/stores/theme'
import { NeCard, getAxiosErrorMessage, NeCombobox, NeSkeleton } from '@nethesis/vue-components'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OvpnUser } from '../VpnMonitor.vue'
import TrafficByHourChart from '../TrafficByHourChart.vue'

const props = defineProps<{
  ovpnInstance: string
  day: string
  ovpnUsers: OvpnUser[]
  loadingUsers: boolean
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

const chartLabels = ref<any[]>([])
const chartDatasets = ref<any[]>([])
const selectedClient = ref<string>('')

const loading = ref({
  getClientTraffic: false
})

const error = ref({
  getClientTraffic: '',
  getClientTrafficDescription: ''
})

const clientOptions = computed(() => {
  return props.ovpnUsers.map((user: any) => {
    return {
      id: user.name,
      label: user.name,
      description: user.description
    }
  })
})

watch(selectedClient, (newSelectedClient, oldSelectedClient) => {
  if (newSelectedClient !== oldSelectedClient) {
    loading.value.getClientTraffic = true
    getClientTraffic()
  }
})

watch(
  () => props.ovpnUsers,
  () => {
    if (props.ovpnUsers?.length) {
      selectedClient.value = clientOptions.value[0]!.id
    }
  },
  { immediate: true }
)

async function getClientTraffic() {
  loading.value.getClientTraffic = true
  error.value.getClientTraffic = ''
  error.value.getClientTrafficDescription = ''

  try {
    const res = await ubusCall('ns.report', 'ovpnrw-bytes-by-hour-and-user', {
      instance: props.ovpnInstance,
      day: props.day,
      user: selectedClient.value
    })
    chartLabels.value = res.data.hours.map((data: any) => {
      // convert hours from UTC to local time
      const localDate = new Date(`${props.day}T${data[0]}:00:00Z`)
      const localHours = localDate.getHours()
      return localHours.toString().padStart(2, '0')
    })
    const chartData = res.data.hours.map((data: any) => data[1])
    chartDatasets.value = [
      {
        label: t('standalone.real_time_monitor.traffic'),
        backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        borderRadius: 6,
        maxBarThickness: 25,
        borderWidth: 1,
        radius: 0,
        data: chartData
      }
    ]
  } catch (err: any) {
    console.error(err)
    error.value.getClientTraffic = t('error.cannot_retrieve_client_traffic_by_hour')
    error.value.getClientTrafficDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getClientTraffic = false
  }
}
</script>

<template>
  <NeCard
    :title="t('standalone.real_time_monitor.client_traffic_by_hour')"
    :skeleton-lines="9"
    :loading="loadingUsers"
    :error-title="error.getClientTraffic"
    :error-description="error.getClientTrafficDescription"
  >
    <NeCombobox
      v-model="selectedClient"
      :options="clientOptions"
      :disabled="loading.getClientTraffic"
      :no-results-label="t('ne_combobox.no_results')"
      :limited-options-label="t('ne_combobox.limited_options_label')"
      :no-options-label="t('ne_combobox.no_options_label')"
      :selected-label="t('ne_combobox.selected')"
      :user-input-label="t('ne_combobox.user_input_label')"
      :optional-label="t('common.optional')"
      class="mt-2 mb-4"
    />
    <NeSkeleton v-if="loading.getClientTraffic" :lines="7"></NeSkeleton>
    <TrafficByHourChart v-else :labels="chartLabels" :datasets="chartDatasets" height="25vh" />
  </NeCard>
</template>
