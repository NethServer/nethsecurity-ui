<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import {
  getAxiosErrorMessage,
  NeButton,
  NeHeading,
  NeTabs,
  NeTooltip
} from '@nethesis/vue-components'
import { useTabs } from '@/composables/useTabs'
import TrafficMonitor from '@/components/standalone/monitoring/TrafficMonitor.vue'
import ConnectivityMonitor from '@/components/standalone/monitoring/ConnectivityMonitor.vue'
import VpnMonitor from '@/components/standalone/monitoring/VpnMonitor.vue'
import SecurityMonitor from '@/components/standalone/monitoring/SecurityMonitor.vue'
import { isStandaloneMode } from '@/lib/config'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'traffic',
    label: t('standalone.real_time_monitor.traffic')
  },
  {
    name: 'connectivity',
    label: t('standalone.real_time_monitor.connectivity')
  },
  {
    name: 'vpn',
    label: t('standalone.real_time_monitor.vpn')
  },
  {
    name: 'security',
    label: t('standalone.real_time_monitor.security')
  }
])

const isLinkedToController = ref(false)
const controllerUrl = ref('')

let loading = ref({
  getControllerSettings: false
})

let error = ref({
  getControllerSettings: '',
  getControllerSettingsDescription: ''
})

onMounted(() => {
  getControllerSettings()
})

async function getControllerSettings() {
  loading.value.getControllerSettings = true
  error.value.getControllerSettings = ''
  error.value.getControllerSettingsDescription = ''

  try {
    const res = await ubusCall('ns.plug', 'status')

    if (res.data.server) {
      isLinkedToController.value = true
      controllerUrl.value = res.data.server
    } else {
      isLinkedToController.value = false
    }
  } catch (err: any) {
    console.error(err)
    error.value.getControllerSettings = t('error.cannot_fetch_controller_registration_status')
    error.value.getControllerSettingsDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getControllerSettings = false
  }
}

function openNetdata() {
  window.open('http://' + window.location.hostname + ':19999')
}

function openGrafana() {
  window.open(controllerUrl.value + '/grafana')
}
</script>
<template>
  <div>
    <div class="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
      <NeHeading tag="h3">
        {{ t('standalone.real_time_monitor.title') }}
      </NeHeading>
      <div class="flex gap-4">
        <!-- link to netdata -->
        <NeButton v-if="isStandaloneMode()" kind="tertiary" size="lg" @click="openNetdata()">
          <template #prefix>
            <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
          </template>
          {{ t('standalone.real_time_monitor.open_report') }}
        </NeButton>
        <!-- cannot open netdata from a controlled unit -->
        <NeTooltip v-else triggerEvent="mouseenter focus" placement="bottom">
          <template #trigger>
            <NeButton kind="tertiary" size="lg" disabled>
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
              </template>
              {{ t('standalone.real_time_monitor.open_report') }}
            </NeButton>
          </template>
          <template #content>
            {{ t('standalone.real_time_monitor.cannot_open_report_from_controller') }}
          </template>
        </NeTooltip>
        <!-- link to grafana -->
        <NeButton
          v-if="isLinkedToController || loading.getControllerSettings"
          kind="secondary"
          size="lg"
          :disabled="loading.getControllerSettings"
          @click="openGrafana()"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
          </template>
          {{ t('standalone.real_time_monitor.view_all_on_grafana') }}
        </NeButton>
        <!-- cannot open grafana if unit is not linked to a controller -->
        <NeTooltip v-else triggerEvent="mouseenter focus" placement="bottom">
          <template #trigger>
            <NeButton kind="secondary" size="lg" disabled>
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
              </template>
              {{ t('standalone.real_time_monitor.view_all_on_grafana') }}
            </NeButton>
          </template>
          <template #content>
            {{ t('standalone.real_time_monitor.cannot_open_grafana_message') }}
          </template>
        </NeTooltip>
      </div>
    </div>
    <p class="mb-4 max-w-2xl text-gray-500 dark:text-gray-400">
      {{ t('standalone.real_time_monitor.description') }}
    </p>
    <NeTabs
      :tabs="tabs"
      :selected="selectedTab"
      :srTabsLabel="t('ne_tabs.tabs')"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      @selectTab="selectedTab = $event"
      class="mb-8"
    />
    <TrafficMonitor v-if="selectedTab === 'traffic'" />
    <ConnectivityMonitor v-else-if="selectedTab === 'connectivity'" />
    <VpnMonitor v-else-if="selectedTab === 'vpn'" />
    <SecurityMonitor v-else-if="selectedTab === 'security'" />
  </div>
</template>
