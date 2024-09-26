<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { CYAN_500, CYAN_600, INDIGO_400, INDIGO_600 } from '@/lib/color'
import { ubusCall } from '@/lib/standalone/ubus'
import { useThemeStore } from '@/stores/theme'
import { NeCard, NeSkeleton, getAxiosErrorMessage } from '@nethesis/vue-components'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import InterfaceTrafficChart from '../traffic/InterfaceTrafficChart.vue'

const props = defineProps<{
  iface?: string
  device: string
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

// random refresh interval between 20 and 30 seconds
const REFRESH_INTERVAL = 20000 + Math.random() * 10 * 1000
const chartLabels = ref<any[]>([])
const chartDatasets = ref<any[]>([])
const intervalId = ref(0)

let loading = ref({
  getInterfaceTraffic: false
})

let error = ref({
  getInterfaceTraffic: '',
  getInterfaceTrafficDescription: ''
})

onMounted(() => {
  // periodically reload data
  intervalId.value = setInterval(getInterfaceTraffic, REFRESH_INTERVAL)

  getInterfaceTraffic()
})

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

async function getInterfaceTraffic() {
  // show skeleton only the first time
  if (!intervalId.value) {
    loading.value.getInterfaceTraffic = true
  }
  error.value.getInterfaceTraffic = ''
  error.value.getInterfaceTrafficDescription = ''

  try {
    const res = await ubusCall('ns.dashboard', 'interface-traffic', {
      interface: props.device
    })
    chartLabels.value = res.data.result.labels.map((timestamp: any) => timestamp * 1000)
    const downloadData = res.data.result.data.map((values: any) => values[0])
    const uploadData = res.data.result.data.map((values: any) => values[1])

    chartDatasets.value = [
      {
        label: t('common.download'),
        borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        data: downloadData,
        borderWidth: 1,
        radius: 0
      },
      {
        label: t('common.upload'),
        borderColor: themeStore.isLight ? INDIGO_600 : INDIGO_400,
        backgroundColor: themeStore.isLight ? INDIGO_600 : INDIGO_400,
        data: uploadData,
        borderWidth: 1,
        radius: 0
      }
    ]
  } catch (err: any) {
    console.error(err)
    error.value.getInterfaceTraffic = t('error.cannot_retrieve_wan_traffic')
    error.value.getInterfaceTrafficDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getInterfaceTraffic = false
  }
}
</script>

<template>
  <NeCard
    :title="
      t('standalone.real_time_monitor.interface_name_traffic', {
        name: props.iface || props.device
      })
    "
    :skeletonLines="8"
    :loading="loading.getInterfaceTraffic"
    :errorTitle="error.getInterfaceTraffic"
    :errorDescription="error.getInterfaceTrafficDescription"
  >
    <NeSkeleton v-if="loading.getInterfaceTraffic" :lines="6"></NeSkeleton>
    <InterfaceTrafficChart v-else :labels="chartLabels" :datasets="chartDatasets" height="30vh" />
  </NeCard>
</template>
