<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { CYAN_500, CYAN_600 } from '@/lib/color'
import { ubusCall } from '@/lib/standalone/ubus'
import { useThemeStore } from '@/stores/theme'
import { getAxiosErrorMessage, NeCard } from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TrafficByHourChart from '../TrafficByHourChart.vue'

const props = defineProps<{
  ovpnInstance: string
  day: string
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

const chartLabels = ref<number[]>([])
const chartDatasets = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const errorDescription = ref('')

onMounted(() => {
  getOvpnTrafficByHour()
})

async function getOvpnTrafficByHour() {
  loading.value = true
  error.value = ''
  errorDescription.value = ''

  try {
    const res = await ubusCall('ns.report', 'ovpnrw-bytes-by-hour', {
      instance: props.ovpnInstance,
      day: props.day
    })
    chartLabels.value = res.data.hours.map((data: any[]) => {
      // convert hours from UTC to local time
      const localDate = new Date(`${props.day}T${data[0]}:00:00Z`)
      const localHours = localDate.getHours()
      return localHours.toString().padStart(2, '0')
    })
    const chartData = res.data.hours.map((data: any[]) => data[1])
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
    error.value = t('error.cannot_retrieve_ovpn_traffic_by_hour')
    errorDescription.value = t(getAxiosErrorMessage(err))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NeCard
    :title="t('standalone.real_time_monitor.total_traffic_by_hour')"
    :loading="loading"
    :skeleton-lines="5"
  >
    <TrafficByHourChart :labels="chartLabels" :datasets="chartDatasets" height="25vh" />
  </NeCard>
</template>
