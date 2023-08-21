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
  isBond
} from '@/lib/standalone/network'
import ConfigureDeviceDrawer, {
  type DeviceType
} from '@/components/standalone/interfaces_and_devices/ConfigureDeviceDrawer.vue'
import UnconfigureDeviceModal from '@/components/standalone/interfaces_and_devices/UnconfigureDeviceModal.vue'
import CreateVlanDeviceDrawer from '@/components/standalone/interfaces_and_devices/CreateVlanDeviceDrawer.vue'
import DeleteDeviceModal from '@/components/standalone/interfaces_and_devices/DeleteDeviceModal.vue'
import { isEmpty, upperFirst } from 'lodash'

const GET_DEVICES_INTERVAL_TIME = 10000
const { t, te } = useI18n()
let physicalDevices: any = ref({})
// used for setInterval
let devicesIntervalId: Ref<number> = ref(0)
let firewallConfig: Ref<any> = ref({})
let networkConfig: Ref<any> = ref({})
let currentDevice: Ref<any> = ref({})
let currentInterface: Ref<any> = ref({})
let isShownCreateOrEditAliasInterfaceDrawer = ref(false)
let isExpandedAlias: Ref<{ [index: string]: boolean }> = ref({})
let isExpandedBridge: Ref<{ [index: string]: boolean }> = ref({})
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
  notificationDescription: ''
})

const isLoading = computed(() => {
  return loading.value.networkDevices || loading.value.networkConfig || loading.value.firewallConfig
})

const allDevices: any = computed(() => {
  // add uncommitted devices

  let uncommittedDevices = []

  if (networkConfig.value.device) {
    uncommittedDevices = networkConfig.value.device.filter((dev: any) => {
      return !Object.keys(physicalDevices.value).includes(dev.name)
    })
  }

  // add interfaces without device (e.g. bond interfaces)

  let ifacesWithoutDevice = networkConfig.value.interface?.filter((iface: any) => !iface.device)

  console.log(
    'allDevices',
    Object.values(physicalDevices.value).concat(uncommittedDevices).concat(ifacesWithoutDevice)
  )
  ////

  return Object.values(physicalDevices.value).concat(uncommittedDevices).concat(ifacesWithoutDevice)
})

const sortedZonesAndDevices: any = computed(() => {
  const zones = [
    {
      name: 'lan',
      devices: [] as any
    },
    {
      name: 'wan',
      devices: [] as any
    },
    {
      name: 'guests',
      devices: [] as any
    },
    {
      name: 'dmz',
      devices: [] as any
    }
  ]

  const unassignedZone = {
    name: 'unassigned',
    devices: [] as any
  }

  allDevices.value.forEach((dev: any) => {
    const ifaceFound = getInterface(dev, networkConfig.value)

    if (!ifaceFound) {
      unassignedZone.devices.push(dev)
    } else {
      const zoneFound = firewallConfig.value.zone.find((z: any) =>
        z.network.includes(ifaceFound['.name'])
      )

      if (!zoneFound) {
        unassignedZone.devices.push(dev)
      } else {
        const zoneObj = zones.find((z: any) => z.name === zoneFound.name)

        if (zoneObj) {
          zoneObj.devices.push(dev)
        } else {
          zones[zoneFound.name] = { name: zoneFound.name, devices: [dev] }
        }
      }
    }
  })
  zones.push(unassignedZone)
  return zones
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
  getPhysicalDevices()
  getNetworkConfig()
  getFirewallConfig()

  // clear previous setInterval (if needed)
  if (devicesIntervalId.value) {
    clearInterval(devicesIntervalId.value)
    devicesIntervalId.value = 0
  }

  // reload devices periodically
  devicesIntervalId.value = setInterval(getPhysicalDevices, GET_DEVICES_INTERVAL_TIME)
}

async function getFirewallConfig() {
  loading.value.firewallConfig = true

  try {
    firewallConfig.value = await getUciConfig('firewall')

    console.log('firewallConfig', firewallConfig) ////
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

    console.log('networkConfig', networkConfig.value) ////
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_firewall_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.networkConfig = false
}

async function getPhysicalDevices() {
  // show skeleton only the first time
  if (!devicesIntervalId.value) {
    loading.value.networkDevices = true
  }

  try {
    const res = await ubusCall('luci-rpc', 'getNetworkDevices')

    // keep only physical devices

    const devices: any = {}

    for (const devName in res.data) {
      const dev = res.data[devName]

      if (!isVlan(dev) && !['lo', 'ifb-dns'].includes(devName)) {
        devices[devName] = dev
      }
    }
    physicalDevices.value = devices

    // alias visibility

    for (const deviceName in physicalDevices.value) {
      // set to not expanded only if needed (getNetworkDevices is called periodically)

      if (isExpandedAlias.value[deviceName] == undefined) {
        isExpandedAlias.value[deviceName] = false
      }

      if (isExpandedBridge.value[deviceName] == undefined) {
        isExpandedBridge.value[deviceName] = false
      }
    }
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_network_devices')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.networkDevices = false
}

function toggleExpandAlias(device: any) {
  isExpandedAlias.value[device.name] = !isExpandedAlias.value[device.name]
}

function toggleExpandBridge(device: any) {
  isExpandedBridge.value[device.name] = !isExpandedBridge.value[device.name]
}

function getDeviceBorderStyle(device: any) {
  const iface = getInterface(device, networkConfig.value)

  if (!iface) {
    return 'border-gray-500 dark:border-gray-500'
  }

  switch (getFirewallZone(iface, firewallConfig.value)?.name) {
    case 'lan':
      return 'border-green-700 dark:border-green-700'
    case 'wan':
      return 'border-rose-700 dark:border-rose-700'
    case 'guests':
      return 'border-blue-700 dark:border-blue-700'
    case 'openvpnrw':
      return 'border-teal-700 dark:border-teal-700'
    default:
      return 'border-gray-500 dark:border-gray-500'
  }
}

//// add missing zones (dmz?)
function getInterfaceIconName(device: any) {
  const iface = getInterface(device, networkConfig.value)

  if (!iface) {
    return 'circle-question'
  }

  switch (getFirewallZone(iface, firewallConfig.value)?.name) {
    case 'lan':
      return 'location-dot'
    case 'wan':
      return 'earth-americas'
    case 'guests':
      return 'users'
    case 'openvpnrw':
      return 'globe'
    default:
      return 'circle-question'
  }
}

function getIconBackgroundStyle(device: any) {
  const iface = getInterface(device, networkConfig.value)

  if (!iface) {
    return 'bg-gray-100 dark:bg-gray-500'
  }

  switch (getFirewallZone(iface, firewallConfig.value)?.name) {
    case 'lan':
      return 'bg-green-100 dark:bg-green-700'
    case 'wan':
      return 'bg-rose-100 dark:bg-rose-700'
    case 'guests':
      return 'bg-blue-100 dark:bg-blue-700'
    case 'openvpnrw':
      return 'bg-teal-100 dark:bg-teal-700'
    default:
      return 'bg-gray-100 dark:bg-gray-500'
  }
}

function getIconForegroundStyle(device: any) {
  const iface = getInterface(device, networkConfig.value)

  if (!iface) {
    return 'text-gray-500 dark:text-gray-50'
  }
  switch (getFirewallZone(iface, firewallConfig.value)?.name) {
    case 'lan':
      return 'text-green-700 dark:text-green-50'
    case 'wan':
      return 'text-rose-700 dark:text-rose-50'
    case 'guests':
      return 'text-blue-700 dark:text-blue-50'
    case 'openvpnrw':
      return 'text-teal-700 dark:text-teal-50'
    default:
      return 'text-gray-500 dark:text-gray-50'
  }
}

function getConfiguredDeviceKebabMenuItems(device: any) {
  const iface = getInterface(device, networkConfig.value)

  return [
    {
      id: 'createAliasInterface',
      label: t('standalone.interfaces_and_devices.create_alias_interface'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => showCreateAliasInterfaceDrawer(device),
      disabled:
        !iface ||
        getAliasInterface(device, networkConfig.value) ||
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
  const parentIface = getInterface(device, networkConfig.value)
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
  const iface = getInterface(device, networkConfig.value)
  currentInterface.value = iface
  aliasToEdit.value = null
  currentNetworkConfigDevice.value = networkConfig.value.device.find(
    (d: any) => d.name === device.name
  )
  isShownCreateOrEditAliasInterfaceDrawer.value = true
}

function showEditAliasInterfaceDrawer(alias: any, device: any) {
  const iface = getInterface(device, networkConfig.value)
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
  const iface = getInterface(deviceOrIface, networkConfig.value)

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
</script>

<template>
  <div>
    <div>
      <NeTitle>{{ t('standalone.interfaces_and_devices.title') }}</NeTitle>
    </div>
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-4"
    />
    <div class="text-sm space-y-6">
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
        <!-- kebab menu -->
        <!-- <NeButton size="lg" disabled>
          <font-awesome-icon
            :icon="['fas', 'ellipsis-vertical']"
            aria-hidden="true"
            :class="`h-4 w-4`"
          />
        </NeButton> -->
      </div>
      <!-- skeleton -->
      <div v-if="isLoading" class="animate-pulse flex">
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
          <div>
            <NeTitle level="h3">{{
              te(`standalone.interfaces_and_devices.zone_label_${zone.name}`)
                ? t(`standalone.interfaces_and_devices.zone_label_${zone.name}`)
                : upperFirst(zone.name)
            }}</NeTitle>
            <div class="space-y-4">
              <template v-for="device in zone.devices">
                <div>
                  <!-- device card -->
                  <div
                    :class="[
                      `relative px-8 py-6 shadow rounded-md border-l-4 bg-white dark:bg-gray-800 ${getDeviceBorderStyle(
                        device
                      )}`
                    ]"
                  >
                    <!-- edit button and overflow menu for smaller screens -->
                    <div class="3xl:hidden absolute right-4 top-4 flex items-center gap-2">
                      <template v-if="getInterface(device, networkConfig)">
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
                        v-if="isVlan(device) && !getInterface(device, networkConfig)"
                        :items="getUnconfiguredVlanKebabMenuItems(device)"
                        :alignToRight="true"
                      />
                    </div>
                    <div
                      class="grid gap-x-8 gap-y-8 pr-16 3xl:pr-0 grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 3xl:grid-cols-5"
                    >
                      <!-- first column -->
                      <div
                        class="flex gap-8 flex-wrap items-start md:justify-between pr-8 md:border-r border-gray-200 dark:border-gray-600"
                      >
                        <div class="flex items-center">
                          <!-- use component for interface icon? //// -->
                          <div
                            :class="`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full mr-4 ${getIconBackgroundStyle(
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
                            <div v-if="getInterface(device, networkConfig)" class="font-semibold">
                              {{ getInterface(device, networkConfig)['.name'] }}
                            </div>
                            <div>{{ device.name }}</div>
                          </div>
                        </div>
                        <div class="flex flex-col gap-2 items-center">
                          <!-- alias -->
                          <div v-if="getAliasInterface(device, networkConfig)">
                            <NeButton
                              kind="tertiary"
                              size="sm"
                              @click="toggleExpandAlias(device)"
                              class="-mt-2 -mr-2"
                            >
                              <template #suffix>
                                <font-awesome-icon
                                  :icon="[
                                    'fas',
                                    isExpandedAlias[device.name] ? 'chevron-up' : 'chevron-down'
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
                              class="-mt-2 -mr-2"
                            >
                              <template #suffix>
                                <font-awesome-icon
                                  :icon="[
                                    'fas',
                                    isExpandedBridge[device.name] ? 'chevron-up' : 'chevron-down'
                                  ]"
                                  class="h-3 w-3"
                                  aria-hidden="true"
                                />
                              </template>
                              {{ t('standalone.interfaces_and_devices.bridge') }}
                            </NeButton>
                          </div>
                        </div>
                        <!-- vlan badge -->
                        <NeBadge v-if="isVlan(device)" size="sm" kind="primary" text="VLAN" />
                      </div>
                      <!-- second column -->
                      <div class="space-y-2">
                        <div>
                          <span class="font-medium">MAC: </span>
                          <span>{{ device.mac || '-' }}</span>
                        </div>
                        <!-- v-for is a trick to declare 'iface' variable inside template -->
                        <template v-for="iface in [getInterface(device, networkConfig)]">
                          <div v-if="iface?.ipaddr">
                            <span class="font-medium">IPv4: </span>
                            <span>{{ iface.ipaddr }}</span>
                          </div>
                          <div v-if="iface?.netmask">
                            <span class="font-medium"
                              >{{ t('standalone.interfaces_and_devices.ipv4_subnet_mask') }}:
                            </span>
                            <span>{{ iface.netmask }}</span>
                          </div>
                          <div v-if="iface?.ip6addr?.length">
                            <span class="font-medium">IPv6: </span>
                            <span>{{ iface.ip6addr[0] }}</span>
                          </div>
                        </template>
                        <!-- device IP addresses (e.g. assigned by DHCP) -->
                        <div v-for="ip4 in device.ipaddrs">
                          <div v-if="ip4.address">
                            <span class="font-medium">IPv4: </span>
                            <span>{{ ip4.address }}</span>
                          </div>
                          <div v-if="ip4.netmask">
                            <span class="font-medium">
                              {{ t('standalone.interfaces_and_devices.ipv4_subnet_mask') }}:
                            </span>
                            <span>{{ ip4.netmask }}</span>
                          </div>
                        </div>
                        <div v-for="ip6 in device.ip6addrs">
                          <div v-if="ip6.address">
                            <span class="font-medium">IPv6: </span>
                            <span>{{ ip6.address }}</span>
                          </div>
                          <div v-if="ip6.netmask">
                            <span class="font-medium">
                              {{ t('standalone.interfaces_and_devices.ipv6_subnet_mask') }}:
                            </span>
                            <span>{{ ip6.netmask }}</span>
                          </div>
                        </div>
                      </div>
                      <!-- third column -->
                      <div>
                        <div>
                          <span class="font-medium">RX: </span>
                          <span>{{ byteFormat1000(device.stats?.rx_bytes) }}</span>
                          <span v-if="device.stats?.rx_packets">
                            ({{ device.stats.rx_packets || '-' }} pkts)</span
                          >
                        </div>
                        <div>
                          <span class="font-medium">TX: </span>
                          <span>{{ byteFormat1000(device.stats?.tx_bytes) }}</span>
                          <span v-if="device.stats?.tx_packets">
                            ({{ device.stats.tx_packets || '-' }} pkts)</span
                          >
                        </div>
                      </div>
                      <!-- fourth column -->
                      <div>
                        <div>
                          <div class="flex items-center gap-2 mb-2">
                            <font-awesome-icon
                              :icon="['fas', device.flags?.up ? 'circle-check' : 'circle-xmark']"
                              class="h-4 w-4"
                              aria-hidden="true"
                            />
                            <span>{{
                              device.flags?.up
                                ? t('standalone.interfaces_and_devices.up')
                                : t('standalone.interfaces_and_devices.down')
                            }}</span>
                          </div>
                          <div>
                            <span class="font-medium"
                              >{{ t('standalone.interfaces_and_devices.speed') }}:
                            </span>
                            <span>
                              {{
                                device.link?.speed && device.link?.speed !== -1
                                  ? `${device.link.speed} Mbps`
                                  : '-'
                              }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <!-- fifth column -->
                      <div
                        class="hidden 3xl:flex items-start gap-2 justify-end border-l border-gray-200 dark:border-gray-600"
                      >
                        <template v-if="getInterface(device, networkConfig)">
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
                          v-if="isVlan(device) && !getInterface(device, networkConfig)"
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
                        getAliasInterface(device, networkConfig) && isExpandedAlias[device.name]
                      "
                    >
                      <!-- v-for is a trick to declare 'alias' variable inside template -->
                      <div
                        v-for="alias in [getAliasInterface(device, networkConfig)]"
                        class="flex items-start group"
                      >
                        <!-- L-shaped dashed line-->
                        <div
                          class="ml-4 h-14 w-4 border-l border-b border-dashed shrink-0 border-gray-400 dark:border-gray-500"
                        ></div>
                        <!-- alias card -->
                        <div
                          :class="`relative mt-4 px-8 py-6 shadow rounded-md border-l-4 grow bg-white dark:bg-gray-800 ${getDeviceBorderStyle(
                            device
                          )}`"
                        >
                          <!-- edit button and overflow menu for smaller screens -->
                          <div class="3xl:hidden absolute right-4 top-4 flex items-center gap-2">
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
                          <div class="flex justify-between gap-8 flex-wrap">
                            <!-- alias name -->
                            <div
                              class="w-full md:w-1/2 xl:w-1/4 3xl:w-1/5 pr-8 md:border-r border-gray-200 dark:border-gray-600"
                            >
                              <div class="font-semibold">
                                {{ t('standalone.interfaces_and_devices.alias') }}:
                                {{ alias['.name'] }}
                              </div>
                            </div>
                            <div class="flex flex-wrap gap-8 pr-40 grow">
                              <!-- ipv4 addresses -->
                              <div v-for="ipv4 in alias.ipaddr">
                                <span class="font-medium">
                                  {{ t('standalone.interfaces_and_devices.ipv4') }}: </span
                                ><span>{{ ipv4 }}</span>
                              </div>
                              <!-- ipv6 addresses -->
                              <div v-for="ipv6 in alias.ip6addr">
                                <span class="font-medium">
                                  {{ t('standalone.interfaces_and_devices.ipv6') }}: </span
                                ><span>{{ ipv6 }}</span>
                              </div>
                            </div>
                            <!-- edit alias and overflow menu -->
                            <div
                              class="hidden 3xl:flex items-start gap-2 justify-end pl-8 w-1/5 border-l border-gray-200 dark:border-gray-600"
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
                      v-if="isBridge(device) && isExpandedBridge[device.name]"
                      class="flex items-start group"
                    >
                      <!-- L-shaped dashed line-->
                      <div
                        class="ml-4 h-14 w-4 border-l border-b border-dashed shrink-0 border-gray-400 dark:border-gray-500"
                      ></div>
                      <!-- bridge card -->
                      <div
                        :class="`relative mt-4 px-8 py-6 shadow rounded-md border-l-4 grow bg-white dark:bg-gray-800 ${getDeviceBorderStyle(
                          device
                        )}`"
                      >
                        <div class="flex justify-between gap-8 flex-wrap">
                          <!-- bridge name -->
                          <div
                            class="w-full md:w-1/2 xl:w-1/4 3xl:w-1/5 pr-8 md:border-r border-gray-200 dark:border-gray-600"
                          >
                            <div class="font-semibold">
                              {{ t('standalone.interfaces_and_devices.bridge') }}:
                              {{ device.name }}
                            </div>
                          </div>
                          <div class="flex flex-wrap gap-8 pr-40 grow">
                            <span class="font-medium">
                              {{
                                t(
                                  'standalone.interfaces_and_devices.devices_pl',
                                  device.ports.length
                                )
                              }}:
                            </span>
                            <!-- ipv4 addresses -->
                            <div v-for="bridgeDev in device.ports">
                              <span class="font-medium"> {{ bridgeDev }}</span>
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
      :firewallConfig="firewallConfig"
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
      :firewallConfig="firewallConfig"
      @close="isShownDeleteAliasModal = false"
      @reloadData="loadData"
    />
    <!-- configure interface drawer -->
    <ConfigureDeviceDrawer
      :device="currentDevice"
      :deviceType="deviceToConfigureType"
      :allDevices="allDevices"
      :firewallConfig="firewallConfig"
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
      :firewallConfig="firewallConfig"
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
      :networkConfig="networkConfig"
      @close="isShownDeleteDeviceModal = false"
      @reloadData="loadData"
    />
  </div>
</template>
