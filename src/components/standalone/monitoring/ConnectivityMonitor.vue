<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeButton,
  NeCard,
  NeEmptyState,
  NeInlineNotification,
  sortByProperty
} from '@nethesis/vue-components'
import { computed, onMounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import WanEventsCard from './connectivity/WanEventsCard.vue'
import { isEmpty } from 'lodash-es'
import type { Policy } from '@/composables/useMwan'
import WanConnectionsCard from './connectivity/WanConnectionsCard.vue'
import { useNetworkDevices } from '@/composables/useNetworkDevices'
import {
  getIpv4Addresses,
  getIpv6Addresses,
  getName,
  isDeviceUp,
  isIpv6Enabled,
  type DeviceOrIface
} from '@/lib/standalone/network'
import { useUciNetworkConfig } from '@/composables/useUciNetworkConfig'
import InterfaceTrafficCard from './connectivity/InterfaceTrafficCard.vue'
import { useLatencyAndQualityReport } from '@/composables/useLatencyAndQualityReport'
import TimeLineChart from '@/components/charts/TimeLineChart.vue'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

export type Wan = {
  iface: string
  device: string
  status?: string
  ipAddresses?: string[]
}

export type WanEvent = {
  time: number
  status: number
}

const { t } = useI18n()
const { allDevices, listDevices, loadingListDevices, errorListDevices, errorListDevicesDetails } =
  useNetworkDevices()
const {
  networkConfig,
  getNetworkConfig,
  loadingNetworkConfig,
  errorNetworkConfig,
  errorNetworkConfigDetails
} = useUciNetworkConfig()
const router = useRouter()

const wans = ref<Wan[]>([])
const mwanEvents = ref<Record<string, any[]>>({})
const mwanPolicies = ref<Policy[]>([])
const wanConnections = ref<Wan[]>([])

const {
  latencyAndQualityCharts,
  loadingLatencyAndQualityReport,
  errorLatencyAndQualityReport,
  errorLatencyAndQualityReportDetails
} = useLatencyAndQualityReport()

let loading = ref({
  listWans: false,
  getMwanReport: false,
  getMwanPolicies: false
})

let error = ref({
  listWans: '',
  listWansDetails: '',
  getMwanReport: '',
  getMwanReportDetails: '',
  getMwanPolicies: '',
  getMwanPoliciesDetails: '',
  getPublicIpAddresses: '',
  getPublicIpAddressesDetails: ''
})

const loadingData = computed(() => {
  return (
    loading.value.listWans ||
    loading.value.getMwanReport ||
    loading.value.getMwanPolicies ||
    loadingNetworkConfig.value ||
    loadingListDevices.value
  )
})

watchEffect(async () => {
  const wanData: Wan[] = []

  for (const wan of wans.value) {
    // get wan status from policy data
    let statusFound = false

    if (mwanPolicies.value.length > 0) {
      // multiwan configured
      for (const policy of mwanPolicies.value) {
        if (statusFound) {
          break
        }

        for (const policyMembers of Object.values(policy.members)) {
          if (statusFound) {
            break
          }

          for (const policyMember of policyMembers) {
            if (policyMember.interface == wan.iface) {
              const devFound = allDevices.value.find((dev) => getName(dev) === wan.device)

              if (devFound) {
                const publicIpAddresses = await retrievePublicIpAddresses(devFound)

                wanData.push({
                  ...wan,
                  status: policyMember.status,
                  ipAddresses: publicIpAddresses
                })
                statusFound = true
                break
              }
            }
          }
        }
      }
    } else {
      // multiwan not configured

      const devFound = allDevices.value.find((dev) => getName(dev) === wan.device)

      if (devFound) {
        const publicIpAddresses = await retrievePublicIpAddresses(devFound)

        wanData.push({
          ...wan,
          status: isDeviceUp(devFound, allDevices.value) ? 'online' : 'offline',
          ipAddresses: publicIpAddresses
        })
      }
    }
  }
  wanConnections.value = wanData.sort(sortByProperty('iface'))
})

onMounted(() => {
  listWans()
  getMwanReport()
  getMwanPolicies()
  listDevices()
  getNetworkConfig()
})

async function retrievePublicIpAddresses(device: DeviceOrIface) {
  let ipAddresses = []
  let publicIpAddresses: string[] = []

  if (isIpv6Enabled(device)) {
    ipAddresses = getIpv6Addresses(device, networkConfig.value).concat(
      getIpv4Addresses(device, networkConfig.value)
    )
  } else {
    ipAddresses = getIpv4Addresses(device, networkConfig.value)
  }
  const ipAddr = ipAddresses[0].split('/')[0]
  publicIpAddresses = await getPublicIpAddresses(ipAddr)

  if (publicIpAddresses.length == 0 || publicIpAddresses[0] == '') {
    // cannot retrieve public IP address, using interface IP address as fallback
    publicIpAddresses = ipAddresses
  }
  return publicIpAddresses
}

async function listWans() {
  loading.value.listWans = true
  error.value.listWans = ''
  error.value.listWansDetails = ''

  try {
    const res = await ubusCall('ns.dashboard', 'list-wans')
    wans.value = res.data.result
  } catch (err: any) {
    console.error(err)
    error.value.listWans = t(getAxiosErrorMessage(err))
    error.value.listWansDetails = err.toString()
  } finally {
    loading.value.listWans = false
  }
}

async function getMwanReport() {
  loading.value.getMwanReport = true
  error.value.getMwanReport = ''
  error.value.getMwanReportDetails = ''

  try {
    const res = await ubusCall('ns.report', 'mwan-report')
    mwanEvents.value = {}

    for (const [wanName, eventsList] of Object.entries(res.data.events_by_wan) as [
      string,
      any[]
    ][]) {
      let events = eventsList.map((event: number[]) => {
        return {
          time: event[0],
          status: event[1]
        }
      })
      mwanEvents.value[wanName] = events.sort(sortByProperty('time')).reverse()
    }
  } catch (err: any) {
    console.error(err)
    error.value.getMwanReport = t(getAxiosErrorMessage(err))
    error.value.getMwanReportDetails = err.toString()
  } finally {
    loading.value.getMwanReport = false
  }
}

async function getPublicIpAddresses(privateIpAddr: string) {
  error.value.getPublicIpAddresses = ''
  error.value.getPublicIpAddressesDetails = ''

  try {
    const res = await ubusCall('ns.report', 'get-public-ip-addresses', {
      ip_address: privateIpAddr
    })
    return res.data.public_ip_addresses
  } catch (err: any) {
    console.error(err)
    error.value.getPublicIpAddresses = t(getAxiosErrorMessage(err))
    error.value.getPublicIpAddressesDetails = err.toString()
  }
}

async function getMwanPolicies() {
  loading.value.getMwanPolicies = true
  error.value.getMwanPolicies = ''
  error.value.getMwanPoliciesDetails = ''

  try {
    const res = await ubusCall('ns.mwan', 'index_policies')
    mwanPolicies.value = res.data.values
  } catch (err: any) {
    console.error(err)
    error.value.getMwanPolicies = t(getAxiosErrorMessage(err))
    error.value.getMwanPoliciesDetails = err.toString()
  } finally {
    loading.value.getMwanPolicies = false
  }
}
</script>

<template>
  <div>
    <!-- listWans error notification -->
    <NeInlineNotification
      v-if="error.listWans"
      kind="error"
      :title="t('error.cannot_retrieve_wan_list')"
      :description="error.listWans"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.listWansDetails" #details>
        {{ error.listWansDetails }}
      </template>
    </NeInlineNotification>
    <!-- getMwanReport error notification -->
    <NeInlineNotification
      v-if="error.getMwanReport"
      kind="error"
      :title="t('error.cannot_retrieve_mwan_report')"
      :description="error.getMwanReport"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.getMwanReportDetails" #details>
        {{ error.getMwanReportDetails }}
      </template>
    </NeInlineNotification>
    <!-- getMwanPolicies error notification -->
    <NeInlineNotification
      v-if="error.getMwanPolicies"
      kind="error"
      :title="t('error.cannot_retrieve_wan_list')"
      :description="error.getMwanPolicies"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.getMwanPoliciesDetails" #details>
        {{ error.getMwanPoliciesDetails }}
      </template>
    </NeInlineNotification>
    <!-- listDevices error notification -->
    <NeInlineNotification
      v-if="errorListDevices"
      kind="error"
      :title="t('error.cannot_load_network_devices')"
      :description="errorListDevices"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="errorListDevicesDetails" #details>
        {{ errorListDevicesDetails }}
      </template>
    </NeInlineNotification>
    <!-- uci network config error notification -->
    <NeInlineNotification
      v-if="errorNetworkConfig"
      kind="error"
      :title="t('error.cannot_load_network_config')"
      :description="errorNetworkConfig"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="errorNetworkConfigDetails" #details>
        {{ errorNetworkConfigDetails }}
      </template>
    </NeInlineNotification>
    <!-- latencyAndQualityReport error notification -->
    <NeInlineNotification
      v-if="errorLatencyAndQualityReport"
      kind="error"
      :title="t('error.cannot_retrieve_latency_and_quality_report')"
      :description="errorLatencyAndQualityReport"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="errorLatencyAndQualityReportDetails" #details>
        {{ errorLatencyAndQualityReportDetails }}
      </template>
    </NeInlineNotification>
    <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-12">
      <!-- skeleton -->
      <template v-if="loadingData">
        <NeCard
          loading
          :skeletonLines="7"
          class="sm:col-span-12 3xl:col-span-8 6xl:col-span-4 7xl:col-span-3"
        ></NeCard>
        <NeCard
          v-for="index in 4"
          :key="index"
          loading
          :skeletonLines="7"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4 7xl:col-span-3"
        ></NeCard>
      </template>
      <template v-else>
        <!-- connections -->
        <WanConnectionsCard
          v-if="wanConnections.length"
          :wanConnections="wanConnections"
          class="sm:col-span-12 3xl:col-span-8 6xl:col-span-4 7xl:col-span-3"
        />
        <!-- wan events -->
        <NeCard
          v-if="isEmpty(mwanEvents)"
          :title="t('standalone.real_time_monitor.wan_events')"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4 7xl:col-span-3"
        >
          <NeEmptyState
            :title="t('standalone.real_time_monitor.no_events_message')"
            :icon="['fas', 'network-wired']"
            class="bg-white dark:bg-gray-950"
          />
        </NeCard>
        <WanEventsCard
          v-else
          v-for="(events, wanName) in mwanEvents"
          :key="wanName"
          :wan="wanName"
          :wanEvents="events"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4 7xl:col-span-3"
        />
        <!-- wans traffic -->
        <InterfaceTrafficCard
          v-for="wan in wans"
          :key="wan.device"
          :iface="wan.iface"
          :device="wan.device"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4 7xl:col-span-3"
        />
        <!-- latency and quality -->
        <NeCard
          v-if="loadingLatencyAndQualityReport"
          loading
          :skeletonLines="7"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4 7xl:col-span-3"
        ></NeCard>
        <NeCard
          v-else-if="latencyAndQualityCharts.length == 0"
          :title="t('standalone.real_time_monitor.latency_and_packet_delivery_rate')"
          class="sm:col-span-12 xl:col-span-6 3xl:col-span-4 7xl:col-span-3"
        >
          <NeEmptyState
            :title="t('standalone.real_time_monitor.no_hosts_configured_for_monitoring')"
            :icon="['fas', 'chart-line']"
            class="bg-white dark:bg-gray-950"
          >
            <NeButton
              kind="secondary"
              @click="
                () => {
                  router.push(`${getStandaloneRoutePrefix()}/monitoring/ping-latency-monitor`)
                }
              "
            >
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'arrow-right']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('common.go_to_page', { page: t('standalone.ping_latency_monitor.title') }) }}
            </NeButton>
          </NeEmptyState>
        </NeCard>
        <template v-else v-for="(chart, index) in latencyAndQualityCharts" :key="index">
          <NeCard
            :title="
              chart.type === 'latency'
                ? t('standalone.real_time_monitor.ping_host_latency', { pingHost: chart.pingHost })
                : t('standalone.real_time_monitor.ping_host_packet_delivery_rate', {
                    pingHost: chart.pingHost
                  })
            "
            class="sm:col-span-12 xl:col-span-6 3xl:col-span-4 7xl:col-span-3"
          >
            <TimeLineChart
              v-if="chart.type === 'latency'"
              :labels="chart.labels"
              :datasets="chart.datasets"
              datasetSuffix="ms"
              height="30vh"
            />
            <TimeLineChart
              v-else-if="chart.type === 'quality'"
              :labels="chart.labels"
              :datasets="chart.datasets"
              :options="{ scales: { y: { max: 100 } } }"
              datasetSuffix="%"
              height="30vh"
            />
          </NeCard>
        </template>
      </template>
    </div>
  </div>
</template>
