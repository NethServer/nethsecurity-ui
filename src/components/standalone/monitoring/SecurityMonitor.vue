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
  NeHeading,
  NeInlineNotification
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SimpleStat from '../../charts/SimpleStat.vue'
import BlockedPacketsByHourChart from './security/BlockedPacketsByHourChart.vue'
import { useThemeStore } from '@/stores/theme'
import {
  AMBER_500,
  AMBER_600,
  CYAN_300,
  CYAN_500,
  CYAN_600,
  CYAN_800,
  EMERALD_500,
  EMERALD_600,
  FUCHSIA_500,
  FUCHSIA_600,
  GRAY_400,
  GRAY_50,
  GRAY_500,
  GRAY_900,
  INDIGO_500,
  INDIGO_600,
  LIME_500,
  LIME_600,
  ROSE_500,
  ROSE_600,
  VIOLET_500,
  VIOLET_600
} from '@/lib/color'
import BasicPieChart from '../../charts/BasicPieChart.vue'
import BlockedIpsByHourChart from './security/BlockedIpsByHourChart.vue'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

const { t } = useI18n()
const themeStore = useThemeStore()
const router = useRouter()

const CHART_NUM_ITEMS = 10
const isThreatShieldEnabled = ref(false)
const malwareCount = ref<number>(0)
const attackCount = ref<number>(0)
const blockedPacketsChartLabels = ref<number[]>([])
const blockedPacketsChartDatasets = ref<any[]>([])
const malwareByDirectionChartLabels = ref<string[]>([])
const malwareByDirectionChartDatasets = ref<any[]>([])
const malwareByCategoryChartLabels = ref<string[]>([])
const malwareByCategoryChartDatasets = ref<any[]>([])
const mostBlockedIpsChartLabels = ref<string[]>([])
const mostBlockedIpsChartDatasets = ref<any[]>([])
const blockedIpsByHourChartLabels = ref<string[]>([])
const blockedIpsByHourChartDatasets = ref<any[]>([])

let loading = ref({
  getMalwareReport: false,
  getAttackReport: false,
  getThreatShieldSettings: false
})

let error = ref({
  getMalwareReport: '',
  getMalwareReportDetails: '',
  getAttackReport: '',
  getAttackReportDetails: '',
  getThreatShieldSettings: '',
  getThreatShieldSettingsDetails: ''
})

onMounted(() => {
  getThreatShieldSettings()
})

async function getThreatShieldSettings() {
  loading.value.getThreatShieldSettings = true
  error.value.getThreatShieldSettings = ''
  error.value.getThreatShieldSettingsDetails = ''

  try {
    const res = await ubusCall('ns.threatshield', 'list-settings')
    isThreatShieldEnabled.value = res.data.data.enabled

    if (isThreatShieldEnabled.value) {
      getMalwareReport()
      getAttackReport()
    }
  } catch (err: any) {
    console.error(err)
    error.value.getThreatShieldSettings = t(getAxiosErrorMessage(err))
    error.value.getThreatShieldSettingsDetails = err.toString()
  } finally {
    loading.value.getThreatShieldSettings = false
  }
}

async function getMalwareReport() {
  loading.value.getMalwareReport = true
  error.value.getMalwareReport = ''
  error.value.getMalwareReportDetails = ''

  try {
    const res = await ubusCall('ns.report', 'tsip-malware-report')
    malwareCount.value = res.data.malware_count || 0

    // blocked packets chart

    blockedPacketsChartLabels.value = res.data.malware_by_hour.map((data: any[]) => data[0])
    const blockedPacketsChartData = res.data.malware_by_hour.map((data: any[]) => data[1])
    blockedPacketsChartDatasets.value = [
      {
        label: t('standalone.real_time_monitor.blocked_threats_by_hour'),
        backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        borderRadius: 6,
        maxBarThickness: 25,
        borderWidth: 1,
        radius: 0,
        data: blockedPacketsChartData
      }
    ]

    // threats by direction chart

    malwareByDirectionChartLabels.value = Object.keys(res.data.malware_by_chain)
    const malwareByDirectionChartData = Object.values(res.data.malware_by_chain)

    malwareByDirectionChartDatasets.value = [
      {
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
            ],
        data: malwareByDirectionChartData
      }
    ]

    // threats by category chart

    malwareByCategoryChartLabels.value = Object.keys(res.data.malware_by_category)
    const malwareByCategoryChartData = Object.values(res.data.malware_by_category)

    malwareByCategoryChartDatasets.value = [
      {
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
            ],
        data: malwareByCategoryChartData
      }
    ]
  } catch (err: any) {
    console.error(err)
    error.value.getMalwareReport = t(getAxiosErrorMessage(err))
    error.value.getMalwareReportDetails = err.toString()
  } finally {
    loading.value.getMalwareReport = false
  }
}

async function getAttackReport() {
  loading.value.getAttackReport = true
  error.value.getAttackReport = ''
  error.value.getAttackReportDetails = ''

  try {
    const res = await ubusCall('ns.report', 'tsip-attack-report')
    attackCount.value = res.data.attack_count || 0

    // most blocked ip addresses chart

    mostBlockedIpsChartLabels.value = res.data.attack_by_ip
      .slice(0, CHART_NUM_ITEMS)
      .map((data: any[]) => data[0])

    const mostBlockedIpAddresses = res.data.attack_by_ip
      .slice(0, CHART_NUM_ITEMS)
      .map((data: any[]) => data[1])

    mostBlockedIpsChartDatasets.value = [
      {
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
            ],
        data: mostBlockedIpAddresses
      }
    ]

    // blocked ip addresses per hour chart

    blockedIpsByHourChartLabels.value = res.data.attack_by_hour.map((data: any[]) => data[0])
    const blockedIpsByHourChartData = res.data.attack_by_hour.map((data: any[]) => data[1])
    blockedIpsByHourChartDatasets.value = [
      {
        label: t('standalone.real_time_monitor.blocked_ip_addresses'),
        backgroundColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        borderColor: themeStore.isLight ? CYAN_600 : CYAN_500,
        borderRadius: 6,
        maxBarThickness: 25,
        borderWidth: 1,
        radius: 0,
        data: blockedIpsByHourChartData
      }
    ]
  } catch (err: any) {
    console.error(err)
    error.value.getAttackReport = t(getAxiosErrorMessage(err))
    error.value.getAttackReportDetails = err.toString()
  } finally {
    loading.value.getAttackReport = false
  }
}
</script>

<template>
  <div>
    <!-- getThreatShieldSettings error notification -->
    <NeInlineNotification
      v-if="error.getThreatShieldSettings"
      kind="error"
      :title="t('error.cannot_retrieve_threat_shield_settings')"
      :description="error.getThreatShieldSettings"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.getThreatShieldSettingsDetails" #details>
        {{ error.getThreatShieldSettingsDetails }}
      </template>
    </NeInlineNotification>
    <!-- getAttackReport error notification -->
    <NeInlineNotification
      v-if="error.getAttackReport"
      kind="error"
      :title="t('error.cannot_retrieve_attack_report')"
      :description="error.getAttackReport"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.getAttackReportDetails" #details>
        {{ error.getAttackReportDetails }}
      </template>
    </NeInlineNotification>
    <!-- getMalwareReport error notification -->
    <NeInlineNotification
      v-if="error.getMalwareReport"
      kind="error"
      :title="t('error.cannot_retrieve_malware_report')"
      :description="error.getMalwareReport"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.getMalwareReportDetails" #details>
        {{ error.getMalwareReportDetails }}
      </template>
    </NeInlineNotification>
    <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-12">
      <template v-if="!loading.getThreatShieldSettings && !isThreatShieldEnabled">
        <!-- empty state -->
        <NeEmptyState
          :title="t('standalone.threat_shield.threat_shield_disabled')"
          :description="t('standalone.real_time_monitor.threat_shield_disabled_message')"
          :icon="['fas', 'shield']"
          class="col-span-full"
        >
          <NeButton
            kind="primary"
            @click="
              () => {
                router.push(`${getStandaloneRoutePrefix()}/security/threat-shield-ip?tab=settings`)
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
            {{ t('standalone.threat_shield.go_to_settings') }}
          </NeButton>
        </NeEmptyState>
      </template>
      <template v-else>
        <!-- blocklist title -->
        <NeHeading tag="h6" class="col-span-full mt-4">
          {{ t('standalone.real_time_monitor.blocklist') }}
        </NeHeading>

        <!-- blocked threats -->
        <NeCard
          :title="t('standalone.real_time_monitor.blocked_threats')"
          :skeletonLines="2"
          :loading="loading.getMalwareReport || loading.getThreatShieldSettings"
          :errorTitle="error.getMalwareReport"
          :errorDescription="error.getMalwareReportDetails"
          class="sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3"
        >
          <SimpleStat class="mt-1">
            {{ malwareCount }}
          </SimpleStat>
        </NeCard>
        <!-- blocked packets -->
        <NeCard
          :title="t('standalone.real_time_monitor.blocked_threats_by_hour')"
          :loading="loading.getMalwareReport || loading.getThreatShieldSettings"
          :errorTitle="error.getMalwareReport"
          :errorDescription="error.getMalwareReportDetails"
          class="row-span-2 sm:col-span-12 xl:col-span-9 2xl:col-span-9"
        >
          <BlockedPacketsByHourChart
            :labels="blockedPacketsChartLabels"
            :datasets="blockedPacketsChartDatasets"
            height="25vh"
          />
        </NeCard>
        <!-- threats by direction -->
        <NeCard
          :title="t('standalone.real_time_monitor.threats_by_direction')"
          :skeletonLines="4"
          :loading="loading.getMalwareReport || loading.getThreatShieldSettings"
          :errorTitle="error.getMalwareReport"
          :errorDescription="error.getMalwareReportDetails"
          class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 2xl:col-span-6 5xl:col-span-3"
        >
          <!-- empty state -->
          <NeEmptyState
            v-if="!malwareByDirectionChartDatasets[0]?.data.length"
            :title="t('common.no_data_available')"
            :icon="['fas', 'chart-line']"
            class="bg-white dark:bg-gray-950"
          />
          <BasicPieChart
            v-else
            :labels="malwareByDirectionChartLabels"
            :datasets="malwareByDirectionChartDatasets"
            height="25vh"
          />
        </NeCard>
        <!-- threats by category -->
        <NeCard
          :title="t('standalone.real_time_monitor.threats_by_category')"
          :skeletonLines="4"
          :loading="loading.getMalwareReport || loading.getThreatShieldSettings"
          :errorTitle="error.getMalwareReport"
          :errorDescription="error.getMalwareReportDetails"
          class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 2xl:col-span-6 5xl:col-span-3"
        >
          <!-- empty state -->
          <NeEmptyState
            v-if="!malwareByCategoryChartDatasets[0]?.data.length"
            :title="t('common.no_data_available')"
            :icon="['fas', 'chart-line']"
            class="bg-white dark:bg-gray-950"
          />
          <BasicPieChart
            v-else
            :labels="malwareByCategoryChartLabels"
            :datasets="malwareByCategoryChartDatasets"
            height="25vh"
          />
        </NeCard>

        <!-- brute force attacks title -->
        <NeHeading tag="h6" class="col-span-full mt-8">
          {{ t('standalone.real_time_monitor.brute_force_attacks') }}
        </NeHeading>

        <!-- blocked ip addresses -->
        <NeCard
          :title="t('standalone.real_time_monitor.blocked_ip_addresses')"
          :skeletonLines="2"
          :loading="loading.getAttackReport || loading.getThreatShieldSettings"
          :errorTitle="error.getAttackReport"
          :errorDescription="error.getAttackReportDetails"
          class="sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3"
        >
          <SimpleStat class="mt-1">
            {{ attackCount }}
          </SimpleStat>
        </NeCard>
        <!-- blocked ip addresses per hour -->
        <NeCard
          :title="t('standalone.real_time_monitor.blocked_ip_addresses_by_hour')"
          :skeletonLines="5"
          :loading="loading.getAttackReport || loading.getThreatShieldSettings"
          :errorTitle="error.getAttackReport"
          :errorDescription="error.getAttackReportDetails"
          class="row-span-2 sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-9 2xl:col-span-9 5xl:col-span-3"
        >
          <BlockedIpsByHourChart
            :labels="blockedIpsByHourChartLabels"
            :datasets="blockedIpsByHourChartDatasets"
            height="25vh"
          />
        </NeCard>
        <!-- most frequently blocked IP addresses -->
        <NeCard
          :title="t('standalone.real_time_monitor.most_frequently_blocked_ip_addresses')"
          :skeletonLines="5"
          :loading="loading.getAttackReport || loading.getThreatShieldSettings"
          :errorTitle="error.getAttackReport"
          :errorDescription="error.getAttackReportDetails"
          class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 2xl:col-span-6 5xl:col-span-3"
        >
          <!-- empty state -->
          <NeEmptyState
            v-if="!mostBlockedIpsChartDatasets[0]?.data.length"
            :title="t('common.no_data_available')"
            :icon="['fas', 'chart-line']"
            class="bg-white dark:bg-gray-950"
          />
          <BasicPieChart
            v-else
            :labels="mostBlockedIpsChartLabels"
            :datasets="mostBlockedIpsChartDatasets"
            height="25vh"
          />
        </NeCard>
      </template>
    </div>
  </div>
</template>
