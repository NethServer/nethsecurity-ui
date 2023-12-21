<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeTitle,
  NeButton,
  NeDropdown,
  NeBadge,
  NeInlineNotification,
  getAxiosErrorMessage,
  byteFormat1000
} from '@nethserver/vue-tailwind-lib'
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
  isOpenVpn,
  type ZoneWithDevices,
  getUiZoneName,
  type ZoneWithDeviceNames,
  isVpn
} from '@/lib/standalone/network'
import ConfigureDeviceDrawer, {
  type DeviceType
} from '@/components/standalone/interfaces_and_devices/ConfigureDeviceDrawer.vue'
import UnconfigureDeviceModal from '@/components/standalone/interfaces_and_devices/UnconfigureDeviceModal.vue'
import CreateVlanDeviceDrawer from '@/components/standalone/interfaces_and_devices/CreateVlanDeviceDrawer.vue'
import DeleteDeviceModal from '@/components/standalone/interfaces_and_devices/DeleteDeviceModal.vue'
import { isEmpty, isEqual, uniqWith, toUpper } from 'lodash-es'
import { zonesSorting } from '@/stores/standalone/firewall'

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

let loading = ref({
  networkDevices: true,
  networkConfig: true,
  firewallConfig: true
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

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
    error.value.notificationTitle = t('error.cannot_load_firewall_config')
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

    allDevices.value = res.data.all_devices
    devicesByZone.value = res.data.devices_by_zone
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_network_devices')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
  loading.value.networkDevices = false
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

  if (!zoneName) {
    return 'bg-gray-100 dark:bg-gray-500'
  }

  switch (zoneName) {
    case 'lan':
      return 'bg-green-100 dark:bg-green-700'
    case 'wan':
      return 'bg-rose-100 dark:bg-rose-700'
    case 'guests':
      return 'bg-blue-100 dark:bg-blue-700'
    case 'dmz':
      return 'bg-amber-100 dark:bg-amber-700'
    case 'hotspot':
      return 'bg-sky-100 dark:bg-sky-700'
    case 'vpn':
      return 'bg-teal-100 dark:bg-teal-700'
    case 'unassigned':
      return 'bg-gray-100 dark:bg-gray-500'
    default:
      return 'bg-violet-100 dark:bg-violet-700'
  }
}

function getIconForegroundStyle(device: any) {
  const zoneName = getUiZoneName(device, devicesByZone.value)

  if (!zoneName) {
    return 'text-gray-500 dark:text-gray-50'
  }

  switch (zoneName) {
    case 'lan':
      return 'text-green-700 dark:text-green-50'
    case 'wan':
      return 'text-rose-700 dark:text-rose-50'
    case 'guests':
      return 'text-blue-700 dark:text-blue-50'
    case 'dmz':
      return 'text-amber-700 dark:text-amber-50'
    case 'hotspot':
      return 'text-sky-700 dark:text-sky-50'
    case 'vpn':
      return 'text-teal-700 dark:text-teal-50'
    default:
      return 'text-violet-700 dark:text-violet-50'
  }
}

function getConfiguredDeviceKebabMenuItems(device: any) {
  const iface = getInterface(device)

  return [
    {
      id: 'createAliasInterface',
      label: t('standalone.interfaces_and_devices.create_alias_interface'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => showCreateAliasInterfaceDrawer(device),
      disabled:
        !iface ||
        !!getAliasInterface(device, networkConfig.value) ||
        !getFirewallZone(iface, firewallConfig.value)
    },
    {
      id: 'removeConfiguration',
      label:
        isBridge(device) || isBond(device)
          ? t('standalone.interfaces_and_devices.delete_interface')
          : t('standalone.interfaces_and_devices.remove_configuration'),
      icon: 'circle-minus',
      iconStyle: 'fas',
      action: () => showUnconfigureDeviceModal(device),
      danger: true,
      disabled: !iface || !getFirewallZone(iface, firewallConfig.value)
    }
  ]
}

function getUnconfiguredVlanKebabMenuItems(device: any) {
  return [
    {
      id: 'deleteDevice',
      label: t('standalone.interfaces_and_devices.delete_device'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => showDeleteDeviceModal(device),
      danger: true
    }
  ]
}

function showDeleteDeviceModal(device: any) {
  currentDevice.value = device
  isShownDeleteDeviceModal.value = true
}

function showDeleteAliasModal(alias: any, device: any) {
  const parentIface = getInterface(device)
  currentAlias.value = alias
  currentParentInterface.value = parentIface
  isShownDeleteAliasModal.value = true
}

function getAliasKebabMenuItems(alias: any, device: any) {
  return [
    {
      id: 'deleteAlias',
      label: t('standalone.interfaces_and_devices.delete_alias'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => showDeleteAliasModal(alias, device),
      danger: true
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

function getNumAlias(device: any, networkConfig: any) {
  const alias = getAliasInterface(device, networkConfig)
  const numIpv4Addresses = alias.ipaddr?.length || 0
  const numIpv6Addresses = alias.ip6addr?.length || 0
  return numIpv4Addresses + numIpv6Addresses
}

function showCreateVlanDeviceDrawer() {
  isShownCreateVlanDeviceDrawer.value = true
}

function hideCreateVlanDeviceDrawer() {
  isShownCreateVlanDeviceDrawer.value = false
}

function getIpv4Addresses(device: any) {
  const ipv4Addresses = []
  const iface = getInterface(device)
  const aliasIface = getAliasInterface(device, networkConfig.value)

  // device ip addresses

  if (!isEmpty(device.ipaddrs)) {
    for (const ipv4 of device.ipaddrs) {
      // skip alias addresses
      if (!aliasIface || !aliasIface.ipaddr || !aliasIface.ipaddr.includes(ipv4.address)) {
        ipv4Addresses.push({ address: ipv4.address })
      }
    }
  }

  // interface ip address

  if (iface?.ipaddr) {
    // skip alias addresses
    if (!aliasIface || !aliasIface.ipaddr || !aliasIface.ipaddr.includes(iface.ipaddr)) {
      ipv4Addresses.push({ address: iface.ipaddr })
    }
  }
  return uniqWith(ipv4Addresses, isEqual)
}

function getIpv6Addresses(device: any) {
  // ensure ipv6 is enabled
  if (device.ipv6 !== '1') {
    return
  }

  const ipv6Addresses = []
  const iface = getInterface(device)
  const aliasIface = getAliasInterface(device, networkConfig.value)

  // device ip addresses

  if (!isEmpty(device.ip6addrs)) {
    for (const ipv6 of device.ip6addrs) {
      // skip alias addresses
      if (!aliasIface || !aliasIface.ip6addr || !aliasIface.ip6addr.includes(ipv6.address)) {
        ipv6Addresses.push({ address: ipv6.address })
      }
    }
  }

  // interface ip address

  if (iface?.ip6addr) {
    let addr = iface.ip6addr

    // ipv6 address is stored inside a one-element array
    if (addr instanceof Array) {
      addr = addr[0]
    }

    // skip alias addresses
    if (!aliasIface || !aliasIface.ip6addr || !aliasIface.ip6addr.includes(addr)) {
      ipv6Addresses.push({ address: addr })
    }
  }
  return uniqWith(ipv6Addresses, isEqual)
}

function isDeviceUp(device: any) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    device = getVlanParent(device)
  }
  return device?.up
}

function getDeviceMac(device: any) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    device = getVlanParent(device)
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

function getVlanParent(bridgeDevice: any) {
  const parentDevice = bridgeDevice.ifname
  const deviceFound = allDevices.value.find((dev) => dev.name === parentDevice)
  return deviceFound
}

function getRxBytes(device: any) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    device = getVlanParent(device)
  }

  if (device?.stats?.rx_bytes) {
    return byteFormat1000(device.stats.rx_bytes)
  } else {
    return null
  }
}

function getTxBytes(device: any) {
  // get parent device if it's a vlan
  if (isVlan(device)) {
    device = getVlanParent(device)
  }

  if (device?.stats?.tx_bytes) {
    return byteFormat1000(device.stats.tx_bytes)
  } else {
    return null
  }
}

function isDeviceConfigurable(deviceOrIface: DeviceOrIface) {
  if (isOpenVpn(deviceOrIface) || isIpsec(deviceOrIface) || isHotspot(deviceOrIface)) {
    return false
  } else {
    return true
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col justify-between md:flex-row md:items-center">
      <NeTitle>{{ t('standalone.interfaces_and_devices.title') }}</NeTitle>
      <div class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {{ t('standalone.dashboard.data_updated_every_seconds', { seconds: 10 }) }}
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
            <NeTitle level="h4">{{
              te(`standalone.interfaces_and_devices.zone_label_${zone.name}`)
                ? t(`standalone.interfaces_and_devices.zone_label_${zone.name}`)
                : toUpper(zone.name)
            }}</NeTitle>
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
                      <template v-if="getInterface(device)">
                        <!-- actions for configured devices -->
                        <NeButton
                          kind="tertiary"
                          size="lg"
                          @click="showConfigureDeviceDrawer(device)"
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
                          :items="getConfiguredDeviceKebabMenuItems(device)"
                          :alignToRight="true"
                        />
                      </template>
                      <!-- configure button for unconfigured devices -->
                      <NeButton
                        v-else
                        kind="secondary"
                        size="lg"
                        @click="showConfigureDeviceDrawer(device)"
                      >
                        <template #prefix>
                          <font-awesome-icon
                            :icon="['fas', 'wrench']"
                            class="h-4 w-4"
                            aria-hidden="true"
                          />
                        </template>
                        {{ t('standalone.interfaces_and_devices.configure') }}
                      </NeButton>
                      <!-- actions for unconfigured vlan devices -->
                      <NeDropdown
                        v-if="isVlan(device) && !getInterface(device)"
                        :items="getUnconfiguredVlanKebabMenuItems(device)"
                        :alignToRight="true"
                      />
                    </div>
                    <div
                      class="grid grid-cols-1 gap-x-8 gap-y-8 pr-16 md:grid-cols-2 2xl:grid-cols-4 3xl:grid-cols-5 3xl:pr-0"
                    >
                      <!-- first column -->
                      <div
                        class="flex flex-wrap items-start gap-4 border-gray-200 pr-8 dark:border-gray-600 md:justify-between md:border-r"
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
                            <div v-if="getInterface(device)" class="font-semibold">
                              {{ getInterface(device)['.name'] }}
                            </div>
                            <div>{{ device.name }}</div>
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
                        <NeBadge v-if="isOpenVpn(device)" size="sm" kind="primary" text="OVPN" />
                        <!-- ipsec tunnel badge -->
                        <NeBadge v-if="isIpsec(device)" size="sm" kind="primary" text="IPSEC" />
                      </div>
                      <!-- second column -->
                      <div class="space-y-2">
                        <div v-if="getDeviceMac(device)">
                          <span class="font-medium">MAC: </span>
                          <span>{{ getDeviceMac(device) }}</span>
                        </div>
                        <!-- hotspot network -->
                        <div v-if="isHotspot(device)">
                          <span class="font-medium"
                            >{{ t('standalone.interfaces_and_devices.hotspot_network') }}:
                          </span>
                          <span>{{ device.hotspot?.network }}</span>
                        </div>
                        <div>
                          <div v-if="getIpv4Addresses(device)?.length">
                            <div v-for="(ipv4, i) in getIpv4Addresses(device)" :key="i">
                              <div>
                                <span class="font-medium">IPv4: </span>
                                <span>{{ ipv4.address }}</span>
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
                          <div v-if="getIpv6Addresses(device)?.length">
                            <div v-for="(ipv6, i) in getIpv6Addresses(device)" :key="i">
                              <div>
                                <span class="font-medium">IPv6: </span>
                                <span>{{ ipv6.address }}</span>
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
                      </div>
                      <!-- third column -->
                      <div>
                        <div v-if="getRxBytes(device)">
                          <span class="font-medium">RX: </span>
                          <span>{{ getRxBytes(device) || '-' }}</span>
                          <span v-if="device.stats?.rx_packets">
                            ({{ device.stats.rx_packets }} pkts)</span
                          >
                        </div>
                        <div v-if="getTxBytes(device)">
                          <span class="font-medium">TX: </span>
                          <span>{{ getTxBytes(device) || '-' }}</span>
                          <span v-if="device.stats?.tx_packets">
                            ({{ device.stats.tx_packets || '-' }} pkts)</span
                          >
                        </div>
                      </div>
                      <!-- fourth column -->
                      <div>
                        <div v-if="!isVpn(device)">
                          <div class="mb-2 flex items-center gap-2">
                            <font-awesome-icon
                              :icon="['fas', isDeviceUp(device) ? 'circle-check' : 'circle-xmark']"
                              class="h-4 w-4"
                              aria-hidden="true"
                            />
                            <span>{{
                              isDeviceUp(device)
                                ? t('standalone.interfaces_and_devices.up')
                                : t('standalone.interfaces_and_devices.down')
                            }}</span>
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
                        <template v-if="getInterface(device)">
                          <!-- actions for configured devices -->
                          <NeButton
                            kind="tertiary"
                            size="lg"
                            @click="showConfigureDeviceDrawer(device)"
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
                            :items="getConfiguredDeviceKebabMenuItems(device)"
                            :alignToRight="true"
                          />
                        </template>
                        <!-- configure button for unconfigured devices -->
                        <NeButton
                          v-else
                          kind="secondary"
                          size="lg"
                          @click="showConfigureDeviceDrawer(device)"
                        >
                          <template #prefix>
                            <font-awesome-icon
                              :icon="['fas', 'wrench']"
                              class="h-4 w-4"
                              aria-hidden="true"
                            />
                          </template>
                          {{ t('standalone.interfaces_and_devices.configure') }}
                        </NeButton>
                        <!-- actions for unconfigured vlan devices -->
                        <NeDropdown
                          v-if="isVlan(device) && !getInterface(device)"
                          :items="getUnconfiguredVlanKebabMenuItems(device)"
                          :alignToRight="true"
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
                                {{ alias['.name'] }}
                              </div>
                            </div>
                            <div class="flex grow flex-wrap gap-8 pr-40">
                              <!-- ipv4 addresses -->
                              <div v-for="(ipv4, i) in alias.ipaddr" :key="i">
                                <span class="font-medium">
                                  {{ t('standalone.interfaces_and_devices.ipv4') }}: </span
                                ><span>{{ ipv4 }}</span>
                              </div>
                              <!-- ipv6 addresses -->
                              <div v-for="(ipv6, i) in alias.ip6addr" :key="i">
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
                      v-if="isBond(device) && isExpandedBond[getName(device) || '']"
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
                          <div class="flex grow flex-wrap gap-8">
                            <span class="font-medium">
                              {{
                                t(
                                  'standalone.interfaces_and_devices.devices_pl',
                                  device.slaves?.length || 0
                                )
                              }}:
                            </span>
                            <!-- devices -->
                            <div v-for="(bondDev, i) in device.slaves" :key="i">
                              <span class="font-medium"> {{ bondDev }}</span>
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
  </div>
</template>
