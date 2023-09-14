<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import NeCard from '@/components/NeCard.vue'
import WanTrafficChart from '@/components/standalone/dashboard/WanTrafficChart.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import {
  NeCombobox,
  NeSkeleton,
  getAxiosErrorMessage,
  getPreference,
  savePreference
} from '@nethserver/vue-tailwind-lib'
import { isEmpty } from 'lodash'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const loginStore = useLoginStore()
const REFRESH_INTERVAL = 10000
const CYAN_300 = '#67e8f9'
const CYAN_600 = '#0891b2'
const chartLabels = ref<any[]>([])
const chartDatasets = ref<any[]>([])
const intervalId = ref<number>(0)
const wanOptions = ref<any[]>([])
const selectedDevice = ref<any>(null)

let loading = ref({
  listWans: false,
  getInterfaceTraffic: false
})

let error = ref({
  title: '',
  description: ''
})

watch(selectedDevice, () => {
  if (selectedDevice.value) {
    loading.value.getInterfaceTraffic = true
    getInterfaceTraffic()

    // save preferred wan
    savePreference('dashboardWan', selectedDevice.value, loginStore.username)
  }
})

onMounted(() => {
  getWanList()
})

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

async function getWanList() {
  loading.value.listWans = true
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', 'list-wans')

    wanOptions.value = res.data.result.map((wan: any) => {
      return {
        id: wan.device,
        label: `${wan.iface} (${wan.device})`
      }
    })
    setSelectedDevice()

    // periodically reload data
    intervalId.value = setInterval(getInterfaceTraffic, REFRESH_INTERVAL)
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_wan_list')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.listWans = false
  }
}

function setSelectedDevice() {
  if (isEmpty(wanOptions.value)) {
    return
  }

  // select the first wan device
  let defaultWanDevice = wanOptions.value[0].id

  // get preferred wan from preferences
  const username = loginStore.username || 'root'
  const preferredWan = getPreference('dashboardWan', username)
  if (preferredWan) {
    defaultWanDevice = preferredWan
  }
  selectedDevice.value = defaultWanDevice
}

async function getInterfaceTraffic() {
  // show skeleton only the first time
  if (!intervalId.value) {
    loading.value.getInterfaceTraffic = true
  }
  error.value.title = ''
  error.value.description = ''

  try {
    const res = await ubusCall('ns.dashboard', 'interface-traffic', {
      interface: selectedDevice.value
    })

    chartLabels.value = res.data.result.labels.map((timestamp: any) => timestamp * 1000)

    const downloadData = res.data.result.data.map((values: any) => values[0])
    const uploadData = res.data.result.data.map((values: any) => values[1])

    chartDatasets.value = [
      {
        label: t('standalone.dashboard.download'),
        borderColor: CYAN_300,
        backgroundColor: CYAN_300,
        data: downloadData,
        borderWidth: 1,
        radius: 0
      },
      {
        label: t('standalone.dashboard.upload'),
        borderColor: CYAN_600,
        backgroundColor: CYAN_600,
        data: uploadData,
        borderWidth: 1,
        radius: 0
      }
    ]
  } catch (err: any) {
    console.error(err)
    error.value.title = t('error.cannot_retrieve_wan_traffic')
    error.value.description = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getInterfaceTraffic = false
  }
}
</script>

<template>
  <NeCard
    :title="t('standalone.dashboard.wan_traffic')"
    :description="isEmpty(wanOptions) ? t('standalone.dashboard.no_wan_interfaces') : ''"
    :skeletonLines="8"
    :loading="loading.listWans"
    :errorTitle="error.title"
    :errorDescription="error.description"
  >
    <template v-if="wanOptions.length">
      <NeCombobox
        v-model="selectedDevice"
        :options="wanOptions"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :disabled="loading.listWans || loading.getInterfaceTraffic"
        class="mb-4"
      />
      <NeSkeleton v-if="loading.getInterfaceTraffic" :lines="6"></NeSkeleton>
      <WanTrafficChart v-else :labels="chartLabels" :datasets="chartDatasets" />
    </template>
  </NeCard>
</template>