//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { padStart, upperFirst } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'
import { useThemeStore } from '@/stores/theme'
import {
  CYAN_500,
  CYAN_600,
  GRAY_50,
  GRAY_900,
  INDIGO_600,
  EMERALD_600,
  VIOLET_600,
  AMBER_600,
  ROSE_600,
  LIME_600,
  FUCHSIA_600,
  CYAN_800,
  GRAY_500,
  INDIGO_500,
  EMERALD_500,
  VIOLET_500,
  AMBER_500,
  ROSE_500,
  LIME_500,
  FUCHSIA_500,
  CYAN_300,
  GRAY_400
} from '@/lib/color'

export function useTrafficSummary() {
  const CHART_NUM_ITEMS = 5
  const { t } = useI18n()
  const themeStore = useThemeStore()
  const clientsLabels = ref<string[]>([])
  const clientsDatasets = ref<any>([])
  const protocolsLabels = ref<string[]>([])
  const protocolsDatasets = ref<any[]>([])
  const remoteHostsLabels = ref<string[]>([])
  const remoteHostsDatasets = ref<any[]>([])
  const appsLabels = ref<string[]>([])
  const appsDatasets = ref<any>([])
  const hoursLabels = ref<string[]>([])
  const hoursDatasets = ref<any[]>([])
  const totalTraffic = ref(0)
  const loadingTrafficSummary = ref(false)
  const trafficSummaryError = ref('')
  const trafficSummaryErrorDescription = ref('')

  const barDatasetProps = {
    label: t('standalone.real_time_monitor.traffic'),
    backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
    borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
    borderRadius: 6,
    maxBarThickness: 25,
    borderWidth: 1,
    radius: 0
  }

  const pieDatasetProps = {
    borderColor: themeStore.isLight ? GRAY_50 : GRAY_900,
    backgroundColor: themeStore.isLight
      ? [
          CYAN_600,
          INDIGO_600,
          EMERALD_600,
          VIOLET_600,
          AMBER_600,
          ROSE_600,
          LIME_600,
          FUCHSIA_600,
          CYAN_800,
          GRAY_500
        ]
      : [
          CYAN_500,
          INDIGO_500,
          EMERALD_500,
          VIOLET_500,
          AMBER_500,
          ROSE_500,
          LIME_500,
          FUCHSIA_500,
          CYAN_300,
          GRAY_400
        ]
  }

  onMounted(() => {
    getTrafficSummary()
  })

  async function getTrafficSummary() {
    trafficSummaryError.value = ''
    trafficSummaryErrorDescription.value = ''
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const day = today.getDate()
    loadingTrafficSummary.value = true

    try {
      const res = await ubusCall('ns.dpireport', 'summary', {
        year: padStart(year.toString(), 2, '0'),
        month: padStart(month.toString(), 2, '0'),
        day: day.toString()
      })
      totalTraffic.value = res.data.total

      // protocols chart

      protocolsLabels.value = res.data.protocol
        .slice(0, CHART_NUM_ITEMS)
        .map((proto: any[]) => proto[0])

      const protocolsChartData = res.data.protocol
        .slice(0, CHART_NUM_ITEMS)
        .map((proto: any[]) => proto[1])

      protocolsDatasets.value = [
        {
          ...pieDatasetProps,
          data: protocolsChartData
        }
      ]

      // apps chart

      appsLabels.value = res.data.application.slice(0, CHART_NUM_ITEMS).map((app: any) => {
        let appName = app[0]

        // beautify app names
        if (appName.includes('netify.')) {
          appName = appName.split('netify.')[1]
        }
        appName = upperFirst(appName)
        return appName
      })

      const appsChartData = res.data.application.slice(0, CHART_NUM_ITEMS).map((app: any) => app[1])

      appsDatasets.value = [
        {
          ...pieDatasetProps,
          data: appsChartData
        }
      ]

      // clients chart

      // try to resolve clients names

      clientsLabels.value = res.data.clients.slice(0, CHART_NUM_ITEMS).map((client: any) => {
        const ipAddress = client[0]
        const resolvedName = res.data.names[ipAddress] ? res.data.names[ipAddress] : ipAddress
        return resolvedName
      })

      const clientsChartData = res.data.clients
        .slice(0, CHART_NUM_ITEMS)
        .map((client: any[]) => client[1])

      clientsDatasets.value = [
        {
          ...pieDatasetProps,
          data: clientsChartData
        }
      ]

      // hosts chart

      remoteHostsLabels.value = res.data.host
        .slice(0, CHART_NUM_ITEMS)
        .map((host: any[]) => host[0])

      const hostsChartData = res.data.host.slice(0, CHART_NUM_ITEMS).map((host: any[]) => host[1])

      remoteHostsDatasets.value = [
        {
          ...pieDatasetProps,
          data: hostsChartData
        }
      ]

      // hours chart

      hoursLabels.value = res.data.hours.map((host: any[]) => host[0])
      const hoursChartData = res.data.hours.map((host: any[]) => host[1])
      hoursDatasets.value = [
        {
          ...barDatasetProps,
          data: hoursChartData
        }
      ]
    } catch (err: any) {
      console.error(err)
      trafficSummaryError.value = t('error.cannot_retrieve_traffic_summary')
      trafficSummaryErrorDescription.value = t(getAxiosErrorMessage(err))
    } finally {
      loadingTrafficSummary.value = false
    }
  }

  return {
    clientsLabels,
    clientsDatasets,
    protocolsLabels,
    protocolsDatasets,
    appsLabels,
    appsDatasets,
    remoteHostsLabels,
    remoteHostsDatasets,
    hoursLabels,
    hoursDatasets,
    totalTraffic,
    loadingTrafficSummary,
    trafficSummaryError,
    trafficSummaryErrorDescription
  }
}
