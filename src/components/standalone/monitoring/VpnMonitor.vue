<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  formatDateLoc,
  getAxiosErrorMessage,
  NeCard,
  NeEmptyState,
  NeHeading,
  NeInlineNotification
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ServerStatusCard from './vpn/ServerStatusCard.vue'
import CurrentlyConnectedClientsCard from './vpn/CurrentlyConnectedClientsCard.vue'
import ClientsTrafficByHourCard from './vpn/ClientsTrafficByHourCard.vue'
import ClientSessionsCard from './vpn/ClientSessionsCard.vue'
import ConnectedClientsByHourCard from './vpn/ConnectedClientsByHourCard.vue'
import TrafficByClientByHourCard from './vpn/TrafficByClientByHourCard.vue'
import SimpleStat from '@/components/charts/SimpleStat.vue'
import ConfiguredTunnelsCard from './vpn/ConfiguredTunnelsCard.vue'
import type { DeviceOrIface } from '@/lib/standalone/network'
import InterfaceTrafficCard from './connectivity/InterfaceTrafficCard.vue'
import type { RWServer } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'

export type OvpnUser = {
  name: string
  description: string
  local: boolean
  database: string
  openvpn_enabled: string
  openvpn_ipaddr: string
  openvpn_2fa: string
  admin: boolean
  id: string
  connected: boolean
  expiration: number
  expired: boolean
  used: boolean
  matches: any[]
}

const { t } = useI18n()

const ovpnInstances = ref<string[]>([])
const ovpnTunnels = ref<any[]>([])
const ipsecTunnels = ref<any[]>([])
const allDevices = ref<DeviceOrIface[]>([])
const ovpnUsers = ref<Record<string, OvpnUser[]>>({})
const ovpnConfiguration = ref<Record<string, RWServer>>({})
const today = formatDateLoc(new Date(), 'yyyy-MM-dd')
const ovpnServerConfigured = ref(false)

const loading = ref({
  listOvpnInstances: true,
  listUsers: true,
  getOvpnConfiguration: true,
  listOvpnTunnels: true,
  listIpsecTunnels: true,
  listDevices: true
})

const error = ref({
  listOvpnInstances: '',
  listOvpnInstancesDetails: '',
  listUsers: '',
  listUsersDetails: '',
  getOvpnConfiguration: '',
  getOvpnConfigurationDetails: '',
  listOvpnTunnels: '',
  listOvpnTunnelsDetails: '',
  listIpsecTunnels: '',
  listIpsecTunnelsDetails: '',
  listDevices: '',
  listDevicesDetails: ''
})

const allTunnels = computed(() => {
  return ovpnTunnels.value.concat(ipsecTunnels.value)
})

const enabledTunnels = computed(() => {
  return allTunnels.value.filter((tunnel) => tunnel.enabled)
})

const connectedTunnels = computed(() => {
  return enabledTunnels.value.filter((tunnel) => tunnel.connected)
})

const tunnelDevices = computed(() => {
  const devices: Record<string, string> = {}

  for (const tunnel of enabledTunnels.value) {
    const prefix = tunnel.type === 'ipsec' ? 'ipsec/' : 'openvpn/'
    const tunnelIdWithPrefix = prefix + tunnel.id // e.g. openvpn/ns_mytun

    // find device for tunnel
    const deviceFound = allDevices.value.find((device) => {
      if (tunnel.type === 'ipsec') {
        return device.ns_link === tunnelIdWithPrefix
      } else {
        return device.iface?.ns_link === tunnelIdWithPrefix
      }
    })

    if (deviceFound) {
      devices[tunnel.id] = deviceFound.name || deviceFound['.name']!
    }
  }
  return devices
})

onMounted(() => {
  listOvpnInstances()
  listOvpnTunnels()
  listIpsecTunnels()
  listDevices()
})

async function listOvpnInstances() {
  loading.value.listOvpnInstances = true
  error.value.listOvpnInstances = ''
  error.value.listOvpnInstancesDetails = ''

  try {
    const res = await ubusCall('ns.ovpnrw', 'list-instances')
    ovpnInstances.value = res.data.instances

    for (const ovpnInstance of ovpnInstances.value) {
      listUsers(ovpnInstance)
      getOvpnConfiguration(ovpnInstance)
    }
  } catch (err: any) {
    console.error(err)
    error.value.listOvpnInstances = t(getAxiosErrorMessage(err))
    error.value.listOvpnInstancesDetails = err.toString()
  } finally {
    loading.value.listOvpnInstances = false
  }
}

async function listOvpnTunnels() {
  loading.value.listOvpnTunnels = true
  error.value.listOvpnTunnels = ''
  error.value.listOvpnTunnelsDetails = ''

  try {
    const res = await ubusCall('ns.ovpntunnel', 'list-tunnels')
    const tunnels = []

    for (const tunnel of res.data.clients) {
      tunnel.type = 'ovpn_client'
      tunnel.name = tunnel.ns_name
      tunnels.push(tunnel)
    }

    for (const tunnel of res.data.servers) {
      tunnel.type = 'ovpn_server'
      tunnel.name = tunnel.ns_name
      tunnels.push(tunnel)
    }
    ovpnTunnels.value = tunnels
  } catch (err: any) {
    console.error(err)
    error.value.listOvpnTunnels = t(getAxiosErrorMessage(err))
    error.value.listOvpnTunnelsDetails = err.toString()
  } finally {
    loading.value.listOvpnTunnels = false
  }
}

async function listIpsecTunnels() {
  loading.value.listIpsecTunnels = true
  error.value.listIpsecTunnels = ''
  error.value.listIpsecTunnelsDetails = ''

  try {
    const res = await ubusCall('ns.ipsectunnel', 'list-tunnels')
    ipsecTunnels.value = res.data.tunnels.map((tunnel: any) => {
      tunnel.type = 'ipsec'
      tunnel.enabled = tunnel.enabled === '1'
      return tunnel
    })
  } catch (err: any) {
    console.error(err)
    error.value.listIpsecTunnels = t(getAxiosErrorMessage(err))
    error.value.listIpsecTunnelsDetails = err.toString()
  } finally {
    loading.value.listIpsecTunnels = false
  }
}

async function listUsers(ovpnInstance: string) {
  loading.value.listUsers = true
  error.value.listUsers = ''
  error.value.listUsersDetails = ''

  try {
    const res = await ubusCall('ns.ovpnrw', 'list-users', { instance: ovpnInstance })
    ovpnUsers.value[ovpnInstance] = res.data.users
  } catch (err: any) {
    console.error(err)
    error.value.listUsers = t(getAxiosErrorMessage(err))
    error.value.listUsersDetails = err.toString()
  } finally {
    loading.value.listUsers = false
  }
}

async function getOvpnConfiguration(ovpnInstance: string) {
  loading.value.getOvpnConfiguration = true
  error.value.getOvpnConfiguration = ''
  error.value.getOvpnConfigurationDetails = ''

  try {
    const res = await ubusCall('ns.ovpnrw', 'get-configuration', { instance: ovpnInstance })

    // ensure ovpn server has been configured
    if (res.data.ns_description) {
      ovpnServerConfigured.value = true
    }
    ovpnConfiguration.value[ovpnInstance] = res.data
  } catch (err: any) {
    console.error(err)
    error.value.getOvpnConfiguration = t(getAxiosErrorMessage(err))
    error.value.getOvpnConfigurationDetails = err.toString()
  } finally {
    loading.value.getOvpnConfiguration = false
  }
}

async function listDevices() {
  loading.value.listDevices = true
  error.value.listDevices = ''
  error.value.listDevicesDetails = ''

  try {
    const res = await ubusCall('ns.devices', 'list-devices')
    allDevices.value = res.data.all_devices
  } catch (err: any) {
    console.error(err)
    error.value.listDevices = t(getAxiosErrorMessage(err))
    error.value.listDevicesDetails = err.toString()
  } finally {
    loading.value.listDevices = false
  }
}

function getTunnelName(tunnelId: string) {
  const tunnel = enabledTunnels.value.find((tunnel) => tunnel.id === tunnelId)
  return tunnel ? tunnel.name : ''
}
</script>
<template>
  <div>
    <!-- listOvpnInstances error notification -->
    <NeInlineNotification
      v-if="error.listOvpnInstances"
      kind="error"
      :title="t('error.cannot_retrieve_rw_server')"
      :description="error.listOvpnInstances"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.listOvpnInstancesDetails" #details>
        {{ error.listOvpnInstancesDetails }}
      </template>
    </NeInlineNotification>
    <!-- listUsers error notification -->
    <NeInlineNotification
      v-if="error.listUsers"
      kind="error"
      :title="t('error.cannot_retrieve_users')"
      :description="error.listUsers"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.listUsersDetails" #details>
        {{ error.listUsersDetails }}
      </template>
    </NeInlineNotification>
    <!-- listOvpnTunnels error notification -->
    <NeInlineNotification
      v-if="error.listOvpnTunnels"
      kind="error"
      :title="t('error.cannot_retrieve_ovpn_tunnels')"
      :description="error.listOvpnTunnels"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.listOvpnTunnelsDetails" #details>
        {{ error.listOvpnTunnelsDetails }}
      </template>
    </NeInlineNotification>
    <!-- listIpsecTunnels error notification -->
    <NeInlineNotification
      v-if="error.listIpsecTunnels"
      kind="error"
      :title="t('error.cannot_retrieve_ipsec_tunnels')"
      :description="error.listIpsecTunnels"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.listIpsecTunnelsDetails" #details>
        {{ error.listIpsecTunnelsDetails }}
      </template>
    </NeInlineNotification>
    <!-- listDevices error notification -->
    <NeInlineNotification
      v-if="error.listDevices"
      kind="error"
      :title="t('error.cannot_load_network_devices')"
      :description="error.listDevices"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.listDevicesDetails" #details>
        {{ error.listDevicesDetails }}
      </template>
    </NeInlineNotification>
    <!-- getOvpnConfiguration error notification -->
    <NeInlineNotification
      v-if="error.getOvpnConfiguration"
      kind="error"
      :title="t('error.cannot_retrieve_rw_server')"
      :description="error.getOvpnConfiguration"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.getOvpnConfigurationDetails" #details>
        {{ error.getOvpnConfigurationDetails }}
      </template>
    </NeInlineNotification>
    <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-12">
      <!-- global empty state -->
      <NeEmptyState
        v-if="
          !loading.listOvpnInstances &&
          !loading.listOvpnTunnels &&
          !loading.listIpsecTunnels &&
          (!ovpnInstances.length || !ovpnServerConfigured) &&
          !enabledTunnels.length
        "
        :title="t('standalone.real_time_monitor.no_vpn_network_configured')"
        :icon="['fas', 'globe']"
        class="col-span-full"
      >
      </NeEmptyState>
      <!-- skeleton -->
      <template
        v-if="loading.listOvpnInstances || loading.listOvpnTunnels || loading.listIpsecTunnels"
      >
        <NeCard
          v-for="index in 6"
          :key="index"
          loading
          class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 3xl:col-span-4"
        ></NeCard>
      </template>
      <template
        v-else-if="ovpnServerConfigured"
        v-for="ovpnInstance in ovpnInstances"
        :key="ovpnInstance"
      >
        <!-- rw server title -->
        <NeHeading tag="h6" class="col-span-full">
          {{
            `${t('standalone.real_time_monitor.rw_openvpn')}: ${
              ovpnConfiguration[ovpnInstance]?.ns_description || '-'
            }`
          }}
        </NeHeading>
        <!-- server status -->
        <ServerStatusCard
          :ovpnConfiguration="ovpnConfiguration[ovpnInstance]"
          :loading="!ovpnConfiguration[ovpnInstance]"
          class="sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3"
        />
        <!-- clients traffic by hour -->
        <ClientsTrafficByHourCard
          :ovpnInstance="ovpnInstance"
          :day="today"
          class="row-span-2 sm:col-span-12 xl:col-span-9 2xl:col-span-9"
        ></ClientsTrafficByHourCard>
        <!-- connected clients -->
        <CurrentlyConnectedClientsCard
          :ovpnInstance="ovpnInstance"
          :ovpnUsers="ovpnUsers[ovpnInstance] || []"
          :loading="loading.listUsers"
          class="sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3 2xl:col-span-3"
        ></CurrentlyConnectedClientsCard>
        <!-- client sessions -->
        <ClientSessionsCard
          :ovpnInstance="ovpnInstance"
          :day="today"
          class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 3xl:col-span-4"
        ></ClientSessionsCard>
        <!-- connected clients by hour -->
        <ConnectedClientsByHourCard
          :ovpnInstance="ovpnInstance"
          :day="today"
          class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 3xl:col-span-4"
        ></ConnectedClientsByHourCard>
        <!-- client traffic by hour -->
        <TrafficByClientByHourCard
          :ovpnInstance="ovpnInstance"
          :ovpnUsers="ovpnUsers[ovpnInstance] || []"
          :day="today"
          :loadingUsers="loading.listUsers"
          class="sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 3xl:col-span-4"
        ></TrafficByClientByHourCard>
      </template>
      <template v-if="enabledTunnels.length">
        <!-- site-to-site vpn title -->
        <NeHeading tag="h6" class="col-span-full mt-6">
          {{ t('standalone.real_time_monitor.site_to_site_vpn') }}
        </NeHeading>
        <!-- connected tunnels -->
        <NeCard
          :title="t('standalone.real_time_monitor.connected_tunnels')"
          class="sm:col-span-6 md:col-span-6 lg:col-span-4 xl:col-span-3 3xl:col-span-3"
        >
          <SimpleStat class="mt-1">
            <span>{{ connectedTunnels.length }}/{{ enabledTunnels.length }}</span>
          </SimpleStat>
        </NeCard>
        <!-- configured tunnels -->
        <ConfiguredTunnelsCard
          :tunnels="enabledTunnels"
          :tunnelDevices="tunnelDevices"
          class="row-span-2 sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-9 3xl:col-span-5"
        ></ConfiguredTunnelsCard>
        <!-- tunnels traffic -->
        <InterfaceTrafficCard
          v-for="(tunnelDevice, tunnelId) in tunnelDevices"
          :key="tunnelDevice"
          :iface="getTunnelName(tunnelId)"
          :device="tunnelDevice"
          class="row-span-2 sm:col-span-12 md:col-span-12 lg:col-span-12 xl:col-span-6 3xl:col-span-4"
        />
      </template>
    </div>
  </div>
</template>
