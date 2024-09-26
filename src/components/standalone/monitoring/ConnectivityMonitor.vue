<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeCard,
  NeEmptyState,
  NeInlineNotification,
  sortByProperty
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WanEventsCard from './connectivity/WanEventsCard.vue'
import InterfaceTrafficCard from './connectivity/InterfaceTrafficCard.vue'
import { isEmpty } from 'lodash-es'
import type { Policy } from '@/composables/useMwan'
import WanConnectionsCard from './connectivity/WanConnectionsCard.vue'

export type Wan = {
  iface: string
  device: string
  status?: string
}

export type WanEvent = {
  time: number
  status: number
}

const { t } = useI18n()

const wans = ref<Wan[]>([])
const mwanEvents = ref<Record<string, any[]>>({})
const mwanPolicies = ref<Policy[]>([])
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
  getMwanPoliciesDetails: ''
})

const wanConnections = computed(() => {
  const wanData = []

  for (const wan of wans.value) {
    // get wan status from policy data
    let statusFound = false

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
            wanData.push({
              ...wan,
              status: policyMember.status
            })
            statusFound = true
            break
          }
        }
      }
    }
  }
  return wanData
})

onMounted(() => {
  listWans()
  getMwanReport()
  getMwanPolicies()
})

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
    <div class="grid grid-cols-1 gap-x-6 gap-y-6 xl:grid-cols-2">
      <!-- skeleton -->
      <template v-if="loading.listWans || loading.getMwanReport || loading.getMwanPolicies">
        <NeCard
          v-for="index in 4"
          :key="index"
          loading
          :skeletonLines="5"
          class="col-span-1"
        ></NeCard>
      </template>
      <template v-else>
        <!-- connections -->
        <WanConnectionsCard v-if="wanConnections.length" :wanConnections="wanConnections" />
        <!-- wan events -->
        <NeCard
          v-if="isEmpty(mwanEvents)"
          :title="t('standalone.real_time_monitor.wan_events')"
          class="col-span-1"
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
          class="col-span-1"
        />
        <!-- wans traffic -->
        <InterfaceTrafficCard
          v-for="wan in wans"
          :key="wan.device"
          :iface="wan.iface"
          :device="wan.device"
          class="col-span-1"
        />
      </template>
    </div>
  </div>
</template>
