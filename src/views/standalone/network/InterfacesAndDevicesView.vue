<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeBadge,
  NeDropdown,
  NeHeading,
  NeButton,
  NeInlineNotification,
  getAxiosErrorMessage,
  byteFormat1000,
  NeSkeleton
} from '@nethesis/vue-components'
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import CreateOrEditAliasInterfaceDrawer from '@/components/standalone/interfaces_and_devices/CreateOrEditAliasInterfaceDrawer.vue'
import DeleteAliasModal from '@/components/standalone/interfaces_and_devices/DeleteAliasModal.vue'
import {
  getFirewallZone,
  getInterface,
  getAliasInterface,
  isVlan,
  isBridge,
  isBond,
  getName,
  getZoneBorderColorClasses,
  type DeviceOrIface,
  getZoneIcon,
  isIpsec,
  isHotspot,
  isOpenVpnTunnel,
  isOpenVpnRw,
  getInterfaceDisplayName,
  type ZoneWithDevices,
  getUiZoneName,
  type ZoneWithDeviceNames,
  isVpn,
  getZoneIconBackgroundStyle,
  getZoneIconForegroundStyle,
  type DeviceVpnNetworks,
  getIpv4Addresses,
  getIpv6Addresses,
  getVlanParent,
  isDeviceUp
} from '@/lib/standalone/network'
import ConfigureDeviceDrawer, {
  type DeviceType
} from '@/components/standalone/interfaces_and_devices/ConfigureDeviceDrawer.vue'
import UnconfigureDeviceModal from '@/components/standalone/interfaces_and_devices/UnconfigureDeviceModal.vue'
import CreateVlanDeviceDrawer from '@/components/standalone/interfaces_and_devices/CreateVlanDeviceDrawer.vue'
import DeleteDeviceModal from '@/components/standalone/interfaces_and_devices/DeleteDeviceModal.vue'
import { clone, isEmpty, toUpper } from 'lodash-es'
import { zonesSorting } from '@/stores/standalone/firewall'
import DeleteBondModal from '@/components/standalone/interfaces_and_devices/DeleteBondModal.vue'
import DeviceButtons from '@/components/standalone/interfaces_and_devices/DeviceButtons.vue'
import type { UciNetworkConfig } from '@/composables/useUciNetworkConfig'

const LIST_DEVICES_INTERVAL_TIME = 10000
const { t, te } = useI18n()
// used for setInterval
let devicesIntervalId = ref(0)
let allDevices: Ref<DeviceOrIface[]> = ref([])
let devicesByZone: Ref<ZoneWithDeviceNames[]> = ref([])
let firewallConfig: Ref<any> = ref({})
let networkConfig: Ref<any> = ref({})
let currentDevice: Ref<any> = ref({})
let currentInterface: Ref<any> = ref({})
let isShownCreateOrEditAliasInterfaceDrawer = ref(false)
let isExpandedAlias: Ref<{ [index: string]: boolean }> = ref({})
let isExpandedBridge: Ref<{ [index: string]: boolean }> = ref({})
let isExpandedBond: Ref<{ [index: string]: boolean }> = ref({})
let isShownDeleteAliasModal = ref(false)
let currentAlias: Ref<any> = ref({})
let currentParentInterface: Ref<any> = ref({})
let aliasToEdit: Ref<any> = ref(null)
let isShownConfigureDeviceDrawer = ref(false)
let interfaceToEdit: Ref<any> = ref(null)
let currentNetworkConfigDevice: Ref<any> = ref({})
let isShownUnconfigureDeviceModal = ref(false)
let isShownCreateVlanDeviceDrawer = ref(false)
let isShownDeleteDeviceModal = ref(false)
let deviceToConfigureType = ref('physical' as DeviceType)
let isShownDeleteBondModal = ref(false)
const vpnNetworks = ref<DeviceVpnNetworks>({
  openvpn: {},
  openvpnRw: {},
  ipsec: {}
})
const ipsecTunnelNames = ref<Record<string, string>>({})

let loading = ref({
  networkDevices: true,
  networkConfig: true,
  firewallConfig: true
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: '',
  getVpnNetworks: '',
  getVpnNetworksDetails: ''
})

const bondToDelete = ref<string>()

function handleBondDeleted() {
  bondToDelete.value = undefined
  isShownDeleteBondModal.value = false
  loadData()
}

const isLoading = computed(() => {
  return loading.value.networkDevices || loading.value.networkConfig || loading.value.firewallConfig
})

const sortedZonesAndDevices = computed(() => {
  const zones: ZoneWithDevices[] = []
  devicesByZone.value.forEach((z: ZoneWithDeviceNames) => {
    const deviceList: DeviceOrIface[] = []
    z.devices.forEach((devName: string) => {
      const devFound = allDevices.value.find((dev) => getName(dev) === devName)

      if (devFound) {
        deviceList.push(devFound)
      }
    })
    const zone = { name: z.name, devices: deviceList }
    zones.push(zone)
  })

  return zones.sort(zonesSorting)
})

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  if (devicesIntervalId.value) {
    clearInterval(devicesIntervalId.value)
  }
})

async function loadData() {
  listDevices()
  getNetworkConfig()
  getFirewallConfig()

  // clear previous setInterval (if needed)
  if (devicesIntervalId.value) {
    clearInterval(devicesIntervalId.value)
    devicesIntervalId.value = 0
  }

  // reload devices periodically
  devicesIntervalId.value = setInterval(listDevices, LIST_DEVICES_INTERVAL_TIME)
}

async function getFirewallConfig() {
  loading.value.firewallConfig = true

  try {
    const fwConfig = await getUciConfig('firewall')
    fwConfig.zone.sort(zonesSorting)
    firewallConfig.value = fwConfig
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_firewall_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.firewallConfig = false
}

async function getNetworkConfig() {
  loading.value.networkConfig = true

  try {
    networkConfig.value = await getUciConfig('network')
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_network_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.networkConfig = false
}

async function listDevices() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''

  // show skeleton only the first time
  if (!devicesIntervalId.value) {
    loading.value.networkDevices = true
  }

  try {
    const res = await ubusCall('ns.devices', 'list-devices')

    const bond_devices = res.data.all_devices
      .filter((device: DeviceOrIface) => device.name?.startsWith('bond-'))
      .map((device: DeviceOrIface) => device.name?.slice(5))

    allDevices.value = res.data.all_devices.filter(
      (device: DeviceOrIface) => !bond_devices.includes(device.name ?? device['.name'])
    )
    devicesByZone.value = res.data.devices_by_zone

    // check and retrieve VPN networks only the first time

    if (loading.value.networkDevices) {
      for (const device of allDevices.value) {
        if (isOpenVpnRw(device)) {
          fetchOpenVpnRwNetwork(device)
        } else if (isOpenVpnTunnel(device)) {
          fetchOpenVpnTunnelNetworks(device)
        } else if (isIpsec(device)) {
          fetchIpsecNetworks()
        }
      }
    }
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_network_devices')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
  loading.value.networkDevices = false
}

async function fetchOpenVpnRwNetwork(device: DeviceOrIface) {
  error.value.getVpnNetworks = ''
  error.value.getVpnNetworksDetails = ''

  try {
    const res = await ubusCall('ns.ovpnrw', 'get-configuration', {
      instance: device.openvpn_rw['.name']
    })
    const clientsNetwork = res.data.server
    vpnNetworks.value.openvpnRw[getName(device)] = clientsNetwork
  } catch (err: any) {
    console.error(err)
    error.value.getVpnNetworks = t(getAxiosErrorMessage(err))
    error.value.getVpnNetworksDetails = err.toString()
  }
}

async function fetchIpsecNetworks() {
  error.value.getVpnNetworks = ''
  error.value.getVpnNetworksDetails = ''

  try {
    const res = await ubusCall('ns.ipsectunnel', 'list-tunnels')
    const tunnels = res.data.tunnels

    for (const tunnel of tunnels) {
      const ipsecName = `ipsec/${tunnel.id}`
      vpnNetworks.value.ipsec[ipsecName] = tunnel.remote
      ipsecTunnelNames.value[ipsecName] = tunnel.name
    }
  } catch (err: any) {
    console.error(err)
    error.value.getVpnNetworks = t(getAxiosErrorMessage(err))
    error.value.getVpnNetworksDetails = err.toString()
  }
}

async function fetchOpenVpnTunnelNetworks(device: DeviceOrIface) {
  error.value.getVpnNetworks = ''
  error.value.getVpnNetworksDetails = ''

  try {
    const res = await ubusCall('ns.ovpntunnel', 'list-tunnels')

    const tunnels = res.data
    const tunnelName = device.openvpn.ns_name

    if (device.openvpn.server) {
      // server tunnel
      const tunFound = tunnels.servers.find((tun: any) => tun.ns_name === tunnelName)

      if (tunFound) {
        vpnNetworks.value.openvpn[tunnelName] = tunFound.remote_network
      }
    } else {
      // client tunnel
      const tunFound = tunnels.clients.find((tun: any) => tun.ns_name === tunnelName)

      if (tunFound) {
        vpnNetworks.value.openvpn[tunnelName] = tunFound.remote_network
      }
    }
  } catch (err: any) {
    console.error(err)
    error.value.getVpnNetworks = t(getAxiosErrorMessage(err))
    error.value.getVpnNetworksDetails = err.toString()
  }
}

function toggleExpandAlias(deviceOrIface: any) {
  isExpandedAlias.value[getName(deviceOrIface)] = !isExpandedAlias.value[getName(deviceOrIface)]
}

function toggleExpandBridge(device: any) {
  isExpandedBridge.value[device.name] = !isExpandedBridge.value[device.name]
}

function toggleExpandBond(deviceOrIface: any) {
  isExpandedBond.value[getName(deviceOrIface)] = !isExpandedBond.value[getName(deviceOrIface)]
}

function getDeviceBorderStyle(device: DeviceOrIface) {
  const zoneName = getUiZoneName(device, devicesByZone.value)

  if (zoneName) {
    return getZoneBorderColorClasses(zoneName)
  } else {
    return 'border-gray-500 dark:border-gray-500'
  }
}

function getInterfaceIconName(device: DeviceOrIface) {
  const zoneName = getUiZoneName(device, devicesByZone.value)

  if (zoneName) {
    return getZoneIcon(zoneName)
  } else {
    return 'circle-question'
  }
}

function getIconBackgroundStyle(device: DeviceOrIface) {
  const zoneName = getUiZoneName(device, devicesByZone.value)
  return getZoneIconBackgroundStyle(zoneName)
}

function getIconForegroundStyle(device: any) {
  const zoneName = getUiZoneName(device, devicesByZone.value)
  return getZoneIconForegroundStyle(zoneName)
}

function showDeleteDeviceModal(device: any) {
  currentDevice.value = device
  isShownDeleteDeviceModal.value = true
}

function showDeleteBondModal(device: any) {
  bondToDelete.value = device['.name'] ?? device.bond_interface
  isShownDeleteBondModal.value = true
}

function showDeleteAliasModal(alias: any, device: any) {
  const parentIface = getInterface(device)
  currentAlias.value = alias
  currentParentInterface.value = parentIface
  isShownDeleteAliasModal.value = true
}

function getAliasKebabMenuItems(alias: any, device: any) {
  const iface = getInterface(device)

  return [
    {
      id: 'deleteAlias',
      label: t('standalone.interfaces_and_devices.delete_alias'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => showDeleteAliasModal(alias, device),
      danger: true,
      disabled: !getFirewallZone(iface, firewallConfig.value)
    }
  ]
}

function showCreateAliasInterfaceDrawer(device: any) {
  const iface = getInterface(device)
  currentInterface.value = iface
  aliasToEdit.value = null
  currentNetworkConfigDevice.value = networkConfig.value.device.find(
    (d: any) => d.name === device.name
  )
  isShownCreateOrEditAliasInterfaceDrawer.value = true
}

function showEditAliasInterfaceDrawer(alias: any, device: any) {
  const iface = getInterface(device)
  currentInterface.value = iface
  aliasToEdit.value = alias
  currentNetworkConfigDevice.value = networkConfig.value.device.find(
    (d: any) => d.name === device.name
  )
  isShownCreateOrEditAliasInterfaceDrawer.value = true
}

function hideCreateOrEditAliasInterfaceDrawer() {
  isShownCreateOrEditAliasInterfaceDrawer.value = false
}

function configureBond(deviceOrIface: DeviceOrIface) {
  currentDevice.value = clone(deviceOrIface)
  if (deviceOrIface['.name'] == undefined) {
    currentDevice.value['.name'] = deviceOrIface.bond_interface
  } else {
    currentDevice.value.name = 'bond-' + deviceOrIface['.name']
  }
  deviceToConfigureType.value = 'physical' // important
  interfaceToEdit.value = null // important
  isShownConfigureDeviceDrawer.value = true
}

function showConfigureDeviceDrawer(deviceOrIface: any) {
  currentDevice.value = deviceOrIface
  const iface = getInterface(deviceOrIface)

  if (iface) {
    interfaceToEdit.value = iface
  } else {
    interfaceToEdit.value = null
  }

  if (isBridge(deviceOrIface) || isBond(deviceOrIface)) {
    deviceToConfigureType.value = 'logical'
  } else {
    deviceToConfigureType.value = 'physical'
  }
  isShownConfigureDeviceDrawer.value = true
}

function hideConfigureDeviceDrawer() {
  isShownConfigureDeviceDrawer.value = false
}

function showCreateLogicalInterfaceDrawer() {
  currentDevice.value = {}
  interfaceToEdit.value = null
  deviceToConfigureType.value = 'logical'
  isShownConfigureDeviceDrawer.value = true
}

function showUnconfigureDeviceModal(device: any) {
  currentDevice.value = device
  isShownUnconfigureDeviceModal.value = true
}

function getNumAlias(device: any, networkConfig: UciNetworkConfig) {
  const alias = getAliasInterface(device, networkConfig)
  const numIpv4Addresses = alias?.ipaddr?.length || 0
  const numIpv6Addresses = alias?.ip6addr?.length || 0
  return numIpv4Addresses + numIpv6Addresses
}

function showCreateVlanDeviceDrawer() {
  isShownCreateVlanDeviceDrawer.value = true
}

function hideCreateVlanDeviceDrawer() {
  isShownCreateVlanDeviceDrawer.value = false
}

function getDeviceMac(device: any, allDevices: DeviceOrIface[]) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    device = getVlanParent(device, allDevices)
  }

  if (device?.mac) {
    return toUpper(device.mac)
  } else {
    return null
  }
}

function getIpv4Gateway(device: any) {
  const iface = getInterface(device)

  if (iface?.gateway) {
    return iface.gateway
  } else {
    return null
  }
}

function getIpv6Gateway(device: any) {
  const iface = getInterface(device)

  if (iface?.ip6gw) {
    return iface.ip6gw
  } else {
    return null
  }
}

function getRxBytes(device: any, allDevices: DeviceOrIface[]) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    device = getVlanParent(device, allDevices)
  }

  if (device?.stats?.rx_bytes) {
    return byteFormat1000(device.stats.rx_bytes)
  } else {
    return null
  }
}

function getTxBytes(device: any, allDevices: DeviceOrIface[]) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    device = getVlanParent(device, allDevices)
  }

  if (device?.stats?.tx_bytes) {
    return byteFormat1000(device.stats.tx_bytes)
  } else {
    return null
  }
}

function isDeviceConfigurable(deviceOrIface: DeviceOrIface) {
  if (
    isOpenVpnTunnel(deviceOrIface) ||
    isOpenVpnRw(deviceOrIface) ||
    isIpsec(deviceOrIface) ||
    isHotspot(deviceOrIface)
  ) {
    return false
  } else {
    return true
  }
}

function formatPackets(packets: number) {
  if (packets >= 1e6) {
    return (packets / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M'
  }

  return packets.toLocaleString()
}
</script>

<template>
  <div>
    <div class="flex flex-col justify-between md:flex-row md:items-center">
      <NeHeading tag="h3" class="mb-7">{{
        t('standalone.interfaces_and_devices.title')
      }}</NeHeading>
      <div class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {{ t('common.data_updated_every_seconds', { seconds: 10 }) }}
      </div>
    </div>
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-4"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <NeInlineNotification
      v-if="error.getVpnNetworks"
      kind="error"
      :title="t('error.cannot_retrieve_vpn_networks')"
      :description="error.getVpnNetworks"
      class="mb-4"
    >
      <template #details v-if="error.getVpnNetworksDetails">
        {{ error.getVpnNetworksDetails }}
      </template>
    </NeInlineNotification>
    <div class="space-y-6 text-sm">
      <div class="flex justify-end gap-4">
        <NeButton kind="tertiary" size="lg" @click="showCreateVlanDeviceDrawer">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.interfaces_and_devices.create_vlan_device') }}
        </NeButton>
        <NeButton size="lg" @click="showCreateLogicalInterfaceDrawer">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.interfaces_and_devices.create_logical_interface') }}
        </NeButton>
      </div>
      <!-- skeleton -->
      <div v-if="isLoading" class="flex animate-pulse">
        <div class="flex-1 space-y-8">
          <div
            v-for="index in 4"
            :key="index"
            :class="`h-24 rounded-md bg-gray-300 dark:bg-gray-700`"
          ></div>
        </div>
      </div>
      <template v-else-if="!error.notificationTitle" v-for="zone in sortedZonesAndDevices">
        <template v-if="!isEmpty(zone.devices)">
          <div :key="zone.name">
            <NeHeading tag="h6" class="mb-1.5">{{
              te(`standalone.interfaces_and_devices.zone_label_${zone.name}`)
                ? t(`standalone.interfaces_and_devices.zone_label_${zone.name}`)
                : toUpper(zone.name)
            }}</NeHeading>
            <div class="space-y-4">
              <template v-for="(device, i) in zone.devices" :key="i">
                <div>
                  <!-- device card -->
                  <div
                    :class="[
                      `relative rounded-md border-l-4 bg-white px-8 py-6 shadow dark:bg-gray-800 ${getDeviceBorderStyle(
                        device
                      )}`
                    ]"
                  >
                    <!-- edit button and overflow menu for smaller screens -->
                    <div
                      v-if="isDeviceConfigurable(device)"
                      class="absolute right-4 top-4 flex items-center gap-2 3xl:hidden"
                    >
                      <DeviceButtons
                        :deviceOrIface="device"
                        :networkConfig="networkConfig"
                        :firewallConfig="firewallConfig"
                        @showConfigureDeviceDrawer="showConfigureDeviceDrawer"
                        @configureBond="configureBond"
                        @showCreateAliasInterfaceDrawer="showCreateAliasInterfaceDrawer"
                        @showUnconfigureDeviceModal="showUnconfigureDeviceModal"
                        @showDeleteBondModal="showDeleteBondModal"
                        @showDeleteDeviceModal="showDeleteDeviceModal"
                      />
                    </div>
                    <div
                      class="grid grid-cols-1 gap-x-8 gap-y-8 pr-16 md:grid-cols-2 2xl:grid-cols-4 3xl:grid-cols-5 3xl:pr-0"
                    >
                      <!-- first column -->
                      <div
                        class="flex flex-wrap items-start gap-x-1 gap-y-6 border-gray-200 pr-6 dark:border-gray-600 md:justify-between md:border-r"
                      >
                        <div class="flex items-center">
                          <div
                            :class="`mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${getIconBackgroundStyle(
                              device
                            )}`"
                          >
                            <font-awesome-icon
                              :icon="['fas', getInterfaceIconName(device)]"
                              aria-hidden="true"
                              :class="`h-5 w-5 ${getIconForegroundStyle(device)}`"
                            />
                          </div>
                          <div>
                            <template v-if="isIpsec(device)">
                              <!-- tunnel name -->
                              <div class="font-semibold">
                                {{ ipsecTunnelNames[device.ns_link as string] }}
                              </div>
                              <!-- tunnel device name -->
                              <div v-if="getInterfaceDisplayName(device)">
                                {{ getInterfaceDisplayName(device) }}
                              </div>
                            </template>
                            <template v-else>
                              <!-- interface name -->
                              <div v-if="getInterfaceDisplayName(device)" class="font-semibold">
                                {{ getInterfaceDisplayName(device) }}
                              </div>
                              <!-- device name -->
                              <div v-if="device.name?.startsWith('bond-')">
                                {{ device.name.slice(5) }}
                              </div>
                              <div v-else>{{ device.name }}</div>
                            </template>
                          </div>
                        </div>
                        <div class="flex flex-col items-center gap-2">
                          <!-- alias -->
                          <div v-if="getAliasInterface(device, networkConfig)">
                            <NeButton
                              kind="tertiary"
                              size="sm"
                              @click="toggleExpandAlias(device)"
                              class="-mr-2 -mt-2"
                            >
                              <template #suffix>
                                <font-awesome-icon
                                  :icon="[
                                    'fas',
                                    isExpandedAlias[getName(device) || '']
                                      ? 'chevron-up'
                                      : 'chevron-down'
                                  ]"
                                  class="h-3 w-3"
                                  aria-hidden="true"
                                />
                              </template>
                              {{
                                t('standalone.interfaces_and_devices.num_alias', {
                                  num: getNumAlias(device, networkConfig)
                                })
                              }}
                            </NeButton>
                          </div>
                          <!-- bridge -->
                          <div v-if="isBridge(device)">
                            <NeButton
                              kind="tertiary"
                              size="sm"
                              @click="toggleExpandBridge(device)"
                              class="-mr-2 -mt-2"
                            >
                              <template #suffix>
                                <font-awesome-icon
                                  :icon="[
                                    'fas',
                                    isExpandedBridge[device.name || '']
                                      ? 'chevron-up'
                                      : 'chevron-down'
                                  ]"
                                  class="h-3 w-3"
                                  aria-hidden="true"
                                />
                              </template>
                              {{ t('standalone.interfaces_and_devices.bridge') }}
                            </NeButton>
                          </div>
                          <!-- bond -->
                          <div v-if="isBond(device)">
                            <NeButton
                              kind="tertiary"
                              size="sm"
                              @click="toggleExpandBond(device)"
                              class="-mr-2 -mt-2"
                            >
                              <template #suffix>
                                <font-awesome-icon
                                  :icon="[
                                    'fas',
                                    isExpandedBond[getName(device) || '']
                                      ? 'chevron-up'
                                      : 'chevron-down'
                                  ]"
                                  class="h-3 w-3"
                                  aria-hidden="true"
                                />
                              </template>
                              {{ t('standalone.interfaces_and_devices.bond') }}
                            </NeButton>
                          </div>
                        </div>
                        <!-- vlan badge -->
                        <NeBadge v-if="isVlan(device)" size="sm" kind="primary" text="VLAN" />
                        <!-- openvpn tunnel badge -->
                        <NeBadge
                          v-if="isOpenVpnTunnel(device)"
                          size="sm"
                          kind="primary"
                          :text="t('standalone.openvpn_tunnel.short_name')"
                        />
                        <!-- openvpn rw badge -->
                        <NeBadge
                          v-if="isOpenVpnRw(device)"
                          size="sm"
                          kind="primary"
                          :text="t('standalone.openvpn_rw.short_name')"
                        />
                        <!-- ipsec tunnel badge -->
                        <NeBadge v-if="isIpsec(device)" size="sm" kind="primary" text="IPSEC" />
                      </div>
                      <!-- second column -->
                      <div class="space-y-2">
                        <div v-if="getDeviceMac(device, allDevices)">
                          <span class="font-medium">MAC: </span>
                          <span>{{ getDeviceMac(device, allDevices) }}</span>
                        </div>
                        <!-- hotspot network -->
                        <div v-if="isHotspot(device)">
                          <span class="font-medium"
                            >{{ t('standalone.interfaces_and_devices.hotspot_network') }}:
                          </span>
                          <span>{{ device.hotspot?.network }}</span>
                        </div>
                        <div>
                          <div v-if="getIpv4Addresses(device, networkConfig)?.length">
                            <div
                              v-for="(ipv4, i) in getIpv4Addresses(device, networkConfig)"
                              :key="i"
                            >
                              <div>
                                <span class="font-medium">IPv4: </span>
                                <span>{{ ipv4 }}</span>
                              </div>
                            </div>
                          </div>
                          <div v-if="getIpv4Gateway(device)">
                            <span class="font-medium"
                              >{{ t('standalone.interfaces_and_devices.ipv4_gateway') }}:
                            </span>
                            <span>{{ getIpv4Gateway(device) }}</span>
                          </div>
                        </div>
                        <div>
                          <div v-if="getIpv6Addresses(device, networkConfig)?.length">
                            <div
                              v-for="(ipv6, i) in getIpv6Addresses(device, networkConfig)"
                              :key="i"
                            >
                              <div>
                                <span class="font-medium">IPv6: </span>
                                <span>{{ ipv6 }}</span>
                              </div>
                            </div>
                          </div>
                          <div v-if="getIpv6Gateway(device)">
                            <span class="font-medium"
                              >{{ t('standalone.interfaces_and_devices.ipv6_gateway') }}:
                            </span>
                            <span>{{ getIpv6Gateway(device) }}</span>
                          </div>
                        </div>
                        <!-- vpn networks -->
                        <div v-if="isVpn(device)" class="!-mt-2">
                          <template v-if="isOpenVpnRw(device)">
                            <!-- openvpn rw -->
                            <div class="font-medium">
                              {{ t('standalone.interfaces_and_devices.clients_network') }}:
                            </div>
                            <!-- skeleton -->
                            <NeSkeleton
                              v-if="!vpnNetworks.openvpnRw[getName(device)]"
                              size="sm"
                              class="mt-1"
                            />
                            <!-- clients network -->
                            <div v-else>
                              {{ vpnNetworks.openvpnRw[getName(device)] }}
                            </div>
                          </template>
                          <template v-if="isIpsec(device)">
                            <!-- ipsec -->
                            <div class="font-medium">
                              {{ t('standalone.ipsec_tunnel.remote_networks') }}:
                            </div>
                            <!-- skeleton -->
                            <NeSkeleton
                              v-if="!vpnNetworks.ipsec[device.ns_link as string]"
                              size="sm"
                              class="mt-1"
                            />
                            <!-- remote networks -->
                            <div
                              v-else
                              v-for="network in vpnNetworks.ipsec[device.ns_link as string]"
                              :key="network"
                            >
                              {{ network }}
                            </div>
                          </template>
                          <template v-if="isOpenVpnTunnel(device)">
                            <!-- openvpn tunnel -->
                            <div class="font-medium">
                              {{ t('standalone.openvpn_tunnel.remote_networks') }}:
                            </div>
                            <!-- no remote networks -->
                            <div v-if="isEmpty(vpnNetworks.openvpn[device.openvpn.ns_name])">-</div>
                            <!-- remote networks -->
                            <div
                              v-else
                              v-for="network in vpnNetworks.openvpn[device.openvpn.ns_name]"
                              :key="network"
                            >
                              {{ network }}
                            </div>
                          </template>
                        </div>
                      </div>
                      <!-- third column -->
                      <div>
                        <div v-if="getRxBytes(device, allDevices)">
                          <span class="font-medium">RX: </span>
                          <span>{{ getRxBytes(device, allDevices) || '-' }}</span>
                          <span v-if="device.stats?.rx_packets">
                            ({{ formatPackets(device.stats.rx_packets) }} pkts)</span
                          >
                        </div>
                        <div v-if="getTxBytes(device, allDevices)">
                          <span class="font-medium">TX: </span>
                          <span>{{ getTxBytes(device, allDevices) || '-' }}</span>
                          <span v-if="device.stats?.tx_packets">
                            ({{ formatPackets(device.stats.tx_packets) }} pkts)</span
                          >
                        </div>
                      </div>
                      <!-- fourth column -->
                      <div>
                        <div v-if="!isVpn(device)">
                          <div
                            v-if="isDeviceUp(device, allDevices)"
                            class="mb-2 flex items-center gap-2"
                          >
                            <font-awesome-icon
                              :icon="['fas', 'circle-check']"
                              class="h-4 w-4"
                              aria-hidden="true"
                            />
                            <span>{{ t('standalone.interfaces_and_devices.up') }}</span>
                          </div>
                          <div v-if="device.speed && device.speed !== -1">
                            <span class="font-medium"
                              >{{ t('standalone.interfaces_and_devices.speed') }}:
                            </span>
                            <span>
                              {{ `${device.speed} Mbps` }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <!-- fifth column -->
                      <div
                        v-if="isDeviceConfigurable(device)"
                        class="hidden items-start justify-end gap-2 border-l border-gray-200 dark:border-gray-600 3xl:flex"
                      >
                        <DeviceButtons
                          :deviceOrIface="device"
                          :networkConfig="networkConfig"
                          :firewallConfig="firewallConfig"
                          @showConfigureDeviceDrawer="showConfigureDeviceDrawer"
                          @configureBond="configureBond"
                          @showCreateAliasInterfaceDrawer="showCreateAliasInterfaceDrawer"
                          @showUnconfigureDeviceModal="showUnconfigureDeviceModal"
                          @showDeleteBondModal="showDeleteBondModal"
                          @showDeleteDeviceModal="showDeleteDeviceModal"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- alias interface -->
                  <Transition name="slide-down">
                    <div
                      v-if="
                        getAliasInterface(device, networkConfig) &&
                        isExpandedAlias[getName(device) || '']
                      "
                    >
                      <!-- v-for is a trick to declare 'alias' variable inside template -->
                      <div
                        v-for="(alias, i) in [getAliasInterface(device, networkConfig)]"
                        :key="i"
                        class="group flex items-start"
                      >
                        <!-- L-shaped dashed line-->
                        <div
                          class="ml-4 h-14 w-4 shrink-0 border-b border-l border-dashed border-gray-400 dark:border-gray-500"
                        ></div>
                        <!-- alias card -->
                        <div
                          :class="`relative mt-4 grow rounded-md border-l-4 bg-white px-8 py-6 shadow dark:bg-gray-800 ${getDeviceBorderStyle(
                            device
                          )}`"
                        >
                          <!-- edit button and overflow menu for smaller screens -->
                          <div class="absolute right-4 top-4 flex items-center gap-2 3xl:hidden">
                            <NeButton
                              kind="tertiary"
                              size="lg"
                              @click="showEditAliasInterfaceDrawer(alias, device)"
                              :disabled="!getFirewallZone(getInterface(device), firewallConfig)"
                            >
                              <template #prefix>
                                <font-awesome-icon
                                  :icon="['fas', 'pen-to-square']"
                                  class="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </template>
                              {{ t('common.edit') }}
                            </NeButton>
                            <NeDropdown
                              :items="getAliasKebabMenuItems(alias, device)"
                              :alignToRight="true"
                            />
                          </div>
                          <div class="flex flex-wrap justify-between gap-8">
                            <!-- alias name -->
                            <div
                              class="w-full border-gray-200 pr-8 dark:border-gray-600 md:w-1/2 md:border-r xl:w-1/4 3xl:w-1/5"
                            >
                              <div class="font-semibold">
                                {{ t('standalone.interfaces_and_devices.alias') }}:
                                {{ alias!['.name'] }}
                              </div>
                            </div>
                            <div class="flex grow flex-wrap gap-8 pr-40">
                              <!-- ipv4 addresses -->
                              <div v-for="(ipv4, i) in alias!.ipaddr" :key="i">
                                <span class="font-medium">
                                  {{ t('standalone.interfaces_and_devices.ipv4') }}: </span
                                ><span>{{ ipv4 }}</span>
                              </div>
                              <!-- ipv6 addresses -->
                              <div v-for="(ipv6, i) in alias!.ip6addr" :key="i">
                                <span class="font-medium">
                                  {{ t('standalone.interfaces_and_devices.ipv6') }}: </span
                                ><span>{{ ipv6 }}</span>
                              </div>
                            </div>
                            <!-- edit alias and overflow menu -->
                            <div
                              class="hidden w-1/5 items-start justify-end gap-2 border-l border-gray-200 pl-8 dark:border-gray-600 3xl:flex"
                            >
                              <NeButton
                                kind="tertiary"
                                size="lg"
                                @click="showEditAliasInterfaceDrawer(alias, device)"
                                :disabled="!getFirewallZone(getInterface(device), firewallConfig)"
                              >
                                <template #prefix>
                                  <font-awesome-icon
                                    :icon="['fas', 'pen-to-square']"
                                    class="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </template>
                                {{ t('common.edit') }}
                              </NeButton>
                              <!-- overflow menu for larger screens -->
                              <NeDropdown
                                :items="getAliasKebabMenuItems(alias, device)"
                                :alignToRight="true"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                  <!-- bridge interface -->
                  <Transition name="slide-down">
                    <div
                      v-if="isBridge(device) && isExpandedBridge[device.name || '']"
                      class="group flex items-start"
                    >
                      <!-- L-shaped dashed line-->
                      <div
                        class="ml-4 h-14 w-4 shrink-0 border-b border-l border-dashed border-gray-400 dark:border-gray-500"
                      ></div>
                      <!-- bridge card -->
                      <div
                        :class="`relative mt-4 grow rounded-md border-l-4 bg-white px-8 py-6 shadow dark:bg-gray-800 ${getDeviceBorderStyle(
                          device
                        )}`"
                      >
                        <div class="flex flex-wrap justify-between gap-8">
                          <!-- bridge name -->
                          <div
                            class="w-full border-gray-200 pr-8 dark:border-gray-600 md:w-1/2 md:border-r xl:w-1/4 3xl:w-1/5"
                          >
                            <div class="font-semibold">
                              {{ t('standalone.interfaces_and_devices.bridge') }}:
                              {{ device.name }}
                            </div>
                          </div>
                          <div class="flex grow flex-wrap gap-8">
                            <span class="font-medium">
                              {{
                                t(
                                  'standalone.interfaces_and_devices.devices_pl',
                                  device.ports?.length || 0
                                )
                              }}:
                            </span>
                            <!-- devices -->
                            <div v-for="(bridgeDev, i) in device.ports" :key="i">
                              <span class="font-medium"> {{ bridgeDev }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                  <!-- bond interface -->
                  <Transition name="slide-down">
                    <div
                      v-if="
                        (isBond(device) || device.name?.startsWith('-bond')) &&
                        isExpandedBond[getName(device) || '']
                      "
                      class="group flex items-start"
                    >
                      <!-- L-shaped dashed line-->
                      <div
                        class="ml-4 h-14 w-4 shrink-0 border-b border-l border-dashed border-gray-400 dark:border-gray-500"
                      ></div>
                      <!-- bond card -->
                      <div
                        :class="`relative mt-4 grow rounded-md border-l-4 bg-white px-8 py-6 shadow dark:bg-gray-800 ${getDeviceBorderStyle(
                          device
                        )}`"
                      >
                        <div class="flex flex-wrap justify-between gap-8">
                          <!-- bond name -->
                          <div
                            class="w-full border-gray-200 pr-8 dark:border-gray-600 md:w-1/2 md:border-r xl:w-1/4 3xl:w-1/5"
                          >
                            <div class="font-semibold">
                              {{ t('standalone.interfaces_and_devices.bond') }}
                            </div>
                          </div>
                          <div class="flex grow flex-wrap gap-8 font-medium">
                            <div>Management IP: {{ device.ipaddr }}</div>
                            {{
                              t(
                                'standalone.interfaces_and_devices.devices_pl',
                                device.slaves?.length || 0
                              )
                            }}:
                            <!-- devices -->
                            <div v-for="(bondDev, i) in device.slaves" :key="i">
                              {{ bondDev }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </template>
            </div>
          </div>
        </template>
      </template>
    </div>
    <!-- create/edit alias interface drawer -->
    <CreateOrEditAliasInterfaceDrawer
      :iface="currentInterface"
      :networkConfigDevice="currentNetworkConfigDevice"
      :networkConfig="networkConfig"
      :isShown="isShownCreateOrEditAliasInterfaceDrawer"
      :aliasToEdit="aliasToEdit"
      @close="hideCreateOrEditAliasInterfaceDrawer"
      @reloadData="loadData"
    />
    <!-- delete alias modal -->
    <DeleteAliasModal
      :visible="isShownDeleteAliasModal"
      :alias="currentAlias"
      :parentInterface="currentParentInterface"
      @close="isShownDeleteAliasModal = false"
      @reloadData="loadData"
    />
    <!-- configure interface drawer -->
    <ConfigureDeviceDrawer
      :device="currentDevice"
      :deviceType="deviceToConfigureType"
      :allDevices="allDevices"
      :networkConfig="networkConfig"
      :isShown="isShownConfigureDeviceDrawer"
      :interfaceToEdit="interfaceToEdit"
      @close="hideConfigureDeviceDrawer"
      @reloadData="loadData"
    />
    <!-- unconfigure device modal -->
    <UnconfigureDeviceModal
      :visible="isShownUnconfigureDeviceModal"
      :device="currentDevice"
      :networkConfig="networkConfig"
      @close="isShownUnconfigureDeviceModal = false"
      @reloadData="loadData"
    />
    <!-- create vlan device drawer -->
    <CreateVlanDeviceDrawer
      :networkConfig="networkConfig"
      :allDevices="allDevices"
      :isShown="isShownCreateVlanDeviceDrawer"
      @close="hideCreateVlanDeviceDrawer"
      @reloadData="loadData"
    />
    <!-- delete device modal -->
    <DeleteDeviceModal
      :visible="isShownDeleteDeviceModal"
      :device="currentDevice"
      @close="isShownDeleteDeviceModal = false"
      @reloadData="loadData"
    />
    <!-- delete bond -->
    <DeleteBondModal
      :visible="isShownDeleteBondModal"
      :bond="bondToDelete"
      @close="isShownDeleteBondModal = false"
      @success="handleBondDeleted()"
    />
  </div>
</template>
