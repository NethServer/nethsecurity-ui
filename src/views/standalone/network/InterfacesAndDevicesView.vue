<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeTitle,
  NeSkeleton,
  NeButton,
  NeDropdown,
  NeInlineNotification,
  getAxiosErrorMessage,
  byteFormat1000
} from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import CreateOrEditAliasInterfaceDrawer from '@/components/standalone/interfaces_and_devices/CreateOrEditAliasInterfaceDrawer.vue'
import DeleteAliasModal from '@/components/standalone/interfaces_and_devices/DeleteAliasModal.vue'
import { getFirewallZone } from '@/lib/standalone/network'
import ConfigureDeviceDrawer from '@/components/standalone/interfaces_and_devices/ConfigureDeviceDrawer.vue'

const GET_DEVICES_INTERVAL_TIME = 10000
const { t } = useI18n()
let interfaces: any = ref([])
let devices: any = ref({})
// used for setInterval
let devicesIntervalId: Ref<number> = ref(0)
let firewallConfig: Ref<any> = ref({})
let networkConfig: Ref<any> = ref({})
let currentDevice: Ref<any> = ref({})
let currentInterface: Ref<any> = ref({})
let isShownCreateOrEditAliasInterfaceDrawer = ref(false)
let isShownAlias: Ref<{ [index: string]: boolean }> = ref({})
let isShownDeleteAliasModal = ref(false)
let currentAlias: Ref<any> = ref({})
let currenteParentInterface: Ref<any> = ref({})
let aliasToEdit: Ref<any> = ref(null)
let isShownConfigureDeviceDrawer = ref(false)

let loading = ref({
  networkInterfaces: true,
  networkDevices: true,
  networkConfig: true,
  firewallConfig: true
})

let error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

const isLoading = computed(() => {
  return (
    loading.value.networkInterfaces ||
    loading.value.networkDevices ||
    loading.value.networkConfig ||
    loading.value.firewallConfig
  )
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
  getNetworkInterfaces()
  getNetworkDevices()
  getNetworkConfig()
  getFirewallConfig()

  // clear previous setInterval (if needed)
  if (devicesIntervalId.value) {
    clearInterval(devicesIntervalId.value)
    devicesIntervalId.value = 0
  }

  // reload devices periodically
  devicesIntervalId.value = setInterval(getNetworkDevices, GET_DEVICES_INTERVAL_TIME)
}

async function getFirewallConfig() {
  loading.value.firewallConfig = true

  try {
    firewallConfig.value = await getUciConfig('firewall')

    console.log('firewall config', firewallConfig) ////
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

    console.log('network config', networkConfig) ////
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_firewall_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.networkConfig = false
}

async function getNetworkInterfaces() {
  loading.value.networkInterfaces = true

  try {
    const res = await ubusCall('network.interface', 'dump')

    console.log('getNetworkInterfaces res', res.data) ////

    interfaces.value = res.data.interface

    // alias visibility
    const isShownAliasObj: { [index: string]: boolean } = {}

    for (const iface of interfaces.value) {
      isShownAliasObj[iface.interface] = false
    }
    isShownAlias.value = isShownAliasObj
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_network_interfaces')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.networkInterfaces = false
}

async function getNetworkDevices() {
  // show skeleton only the first time
  if (!devicesIntervalId.value) {
    loading.value.networkDevices = true
  }

  try {
    const res = await ubusCall('luci-rpc', 'getNetworkDevices')

    console.log('networkDevices res', res.data) ////

    devices.value = res.data
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_network_devices')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.networkDevices = false
}

function isAlias(iface: any) {
  const ifaceFound = networkConfig.value.interface.find(
    (ifaceElem: any) => ifaceElem['.name'] === iface.interface
  )

  if (ifaceFound) {
    return ifaceFound.device.startsWith('@')
  }
}

function hasAlias(device: any) {
  const iface = getInterface(device)

  if (!iface) {
    return false
  }

  return networkConfig.value?.interface.find(
    (ifaceElem: any) => ifaceElem.device === `@${iface.interface}`
  )
}

function getAliasInterfaces(device: any) {
  const iface = getInterface(device)

  if (!iface) {
    return []
  }

  return networkConfig.value.interface.filter(
    (ifaceElem: any) => ifaceElem.device === `@${iface.interface}`
  )
}

function getInterface(device: any) {
  return interfaces.value.find((iface: any) => iface.device === device.name)
}

function getDeviceBorderStyle(device: any) {
  const iface = getInterface(device)

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
  const iface = getInterface(device)

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
  const iface = getInterface(device)

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
  const iface = getInterface(device)

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

function getDeviceKebabMenuItems(device: any) {
  const iface = getInterface(device)

  return [
    {
      id: 'createAliasInterface',
      label: t('standalone.interfaces_and_devices.create_alias_interface'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => showCreateAliasInterfaceDrawer(device),
      disabled: !iface || hasAlias(device) || !getFirewallZone(iface, firewallConfig.value)
    },
    {
      id: 'removeConfiguration',
      label: t('standalone.interfaces_and_devices.remove_configuration'),
      icon: 'unlock',
      iconStyle: 'fas',
      action: () => removeConfiguration(device),
      danger: true,
      disabled: !iface || !getFirewallZone(iface, firewallConfig.value)
    }
  ]
}

function showDeleteAliasModal(alias: any, device: any) {
  const parentIface = getInterface(device)
  currentAlias.value = alias
  currenteParentInterface.value = parentIface
  isShownDeleteAliasModal.value = true
}

function getAliasKebabMenuItems(alias: any, device: any) {
  const parentIface = getInterface(device)
  return [
    {
      id: 'deleteAlias',
      label: t('standalone.interfaces_and_devices.delete_alias'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => showDeleteAliasModal(alias, parentIface),
      danger: true
    }
  ]
}

function showCreateAliasInterfaceDrawer(device: any) {
  const iface = getInterface(device)
  currentInterface.value = iface
  aliasToEdit.value = null
  isShownCreateOrEditAliasInterfaceDrawer.value = true
}

function showEditAliasInterfaceDrawer(alias: any, device: any) {
  const iface = getInterface(device)
  currentInterface.value = iface
  aliasToEdit.value = alias
  isShownCreateOrEditAliasInterfaceDrawer.value = true
}

function hideCreateOrEditAliasInterfaceDrawer() {
  isShownCreateOrEditAliasInterfaceDrawer.value = false
}

function showConfigureDeviceDrawer(device: any) {
  currentDevice.value = device
  isShownConfigureDeviceDrawer.value = true
}

function hideConfigureDeviceDrawer() {
  isShownConfigureDeviceDrawer.value = false
}

// function isIfaceMarkedForDeletion(device: any) { ////
//   const iface = getInterface(device)

//   const ifaceFound = networkConfig.value.interface.find(
//     (el: any) => el['.name'] === iface.interface
//   )

//   if (ifaceFound) {
//     return false
//   } else {
//     return true
//   }
// }

function removeConfiguration(device: any) {
  console.log('removeConfiguration', device) ////
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
    <!-- //// improve skeleton -->
    <NeSkeleton v-if="isLoading" size="lg" :lines="12" />
    <!-- //// group interfaces by zone -->
    <div v-else-if="!error.notificationTitle" class="text-sm space-y-6">
      <div class="flex justify-end gap-4">
        <NeButton kind="tertiary" size="lg">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.interfaces_and_devices.add_vlan_device') }}
        </NeButton>
        <NeButton size="lg">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.interfaces_and_devices.add_logical_interface') }}
        </NeButton>
        <NeButton size="lg">
          <font-awesome-icon
            :icon="['fas', 'ellipsis-vertical']"
            aria-hidden="true"
            :class="`h-4 w-4`"
          />
        </NeButton>
      </div>
      <template v-for="device in devices">
        <div v-if="!['lo', 'ifb-dns'].includes(device.name)">
          <!-- <div v-if="device.name !== 'lo' && !isAlias(device)"> ////  -->

          <!-- device card -->
          <div
            :class="[
              `relative px-8 py-6 shadow rounded-md border-l-4 bg-white dark:bg-gray-800 ${getDeviceBorderStyle(
                device
              )}`
              // isIfaceMarkedForDeletion(device) ? 'opacity-50' : '' ////
            ]"
          >
            <!-- edit button and overflow menu for smaller screens -->
            <div class="3xl:hidden absolute right-4 top-4 flex items-center gap-2">
              <NeButton kind="tertiary" size="lg" @click="showConfigureDeviceDrawer(device)">
                <template #prefix>
                  <font-awesome-icon
                    :icon="['fas', 'pen-to-square']"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </template>
                {{ t('common.edit') }}
              </NeButton>
              <NeDropdown :items="getDeviceKebabMenuItems(device)" :alignToRight="true" />
            </div>
            <div
              class="grid gap-x-8 gap-y-8 pr-6 3xl:pr-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 3xl:grid-cols-5"
            >
              <!-- first column -->
              <div
                class="flex gap-4 flex-wrap items-start justify-between pr-8 md:border-r border-gray-200 dark:border-gray-600"
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
                    <div v-if="getInterface(device)" class="font-semibold">
                      {{ getInterface(device).interface }}
                    </div>
                    <div>{{ device.name }}</div>
                  </div>
                </div>
                <!-- alias -->
                <div v-if="hasAlias(device)">
                  <NeButton kind="tertiary" size="sm" class="-mt-2 -mr-2">
                    <template #suffix>
                      <font-awesome-icon
                        :icon="['fas', 'chevron-down']"
                        class="h-3 w-3"
                        aria-hidden="true"
                      />
                    </template>
                    {{
                      t('standalone.interfaces_and_devices.num_alias', {
                        num: getAliasInterfaces(device).length
                      })
                    }}
                  </NeButton>
                  <!--  //// bridge -->
                  <!-- <div>bridge</div> -->
                </div>
              </div>
              <!-- second column -->
              <!-- <div v-if="isIfaceMarkedForDeletion(device)"  //// class="xl:col-span-3 3xl:grid-cols-4">
                {{ t('standalone.interfaces_and_devices.this_interface_is_marked_for_deletion') }}
              </div>
              <template v-else> -->
              <div>
                <div>
                  <span class="font-medium">MAC: </span>
                  <span>{{ device.mac || '-' }}</span>
                </div>
                <div
                  v-if="getInterface(device)"
                  v-for="ipv4Address in getInterface(device)['ipv4-address']"
                >
                  <span class="font-medium">IPv4: </span>
                  <span>{{ ipv4Address.address }}/{{ ipv4Address.mask }}</span>
                </div>
                <div
                  v-if="getInterface(device)"
                  v-for="ipv6Address in getInterface(device)['ipv6-address']"
                >
                  <span class="font-medium">IPv6: </span>
                  <span>{{ ipv6Address.address }}/{{ ipv6Address.mask }}</span>
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
                      :icon="['fas', device.flags.up ? 'circle-check' : 'circle-xmark']"
                      class="h-4 w-4"
                      aria-hidden="true"
                    />
                    <span>{{
                      device.flags.up
                        ? t('standalone.interfaces_and_devices.up')
                        : t('standalone.interfaces_and_devices.down')
                    }}</span>
                  </div>
                  <div>
                    <span class="font-medium"
                      >{{ t('standalone.interfaces_and_devices.speed') }}:
                    </span>
                    <span>
                      {{ device.link.speed && device.link.speed !== -1 ? device.link.speed : '-' }}
                    </span>
                  </div>
                </div>
              </div>
              <!-- fifth column -->
              <div
                class="hidden 3xl:flex items-start gap-2 justify-end border-l border-gray-200 dark:border-gray-600"
              >
                <NeButton kind="tertiary" size="lg" @click="showConfigureDeviceDrawer(device)">
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
                <NeDropdown :items="getDeviceKebabMenuItems(device)" :alignToRight="true" />
              </div>
              <!-- </template> ////  -->
            </div>
          </div>
          <!-- alias interfaces -->
          <div v-for="alias in getAliasInterfaces(device)" class="flex items-start group">
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
                <NeDropdown :items="getAliasKebabMenuItems(alias, device)" :alignToRight="true" />
              </div>
              <div class="flex justify-between">
                <div class="flex gap-x-8">
                  <!-- alias name -->
                  <div class="pr-8 border-r border-gray-200 dark:border-gray-600">
                    <div class="font-semibold">
                      {{ alias['.name'] }}
                    </div>
                    <div>{{ t('standalone.interfaces_and_devices.alias') }}</div>
                  </div>
                  <div class="flex flex-wrap gap-8 pr-8">
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
                </div>
                <div>
                  <!-- edit alias and overflow menu -->
                  <div
                    class="hidden 3xl:flex items-start gap-2 justify-end pl-8 border-l border-gray-200 dark:border-gray-600"
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
        </div>
      </template>
    </div>
    <!-- create/edit alias interface drawer -->
    <CreateOrEditAliasInterfaceDrawer
      :iface="currentInterface"
      :firewallConfig="firewallConfig"
      :interfaces="interfaces"
      :isShown="isShownCreateOrEditAliasInterfaceDrawer"
      :aliasToEdit="aliasToEdit"
      @close="hideCreateOrEditAliasInterfaceDrawer"
      @reloadData="loadData"
    />
    <!-- delete alias modal -->
    <DeleteAliasModal
      :visible="isShownDeleteAliasModal"
      :alias="currentAlias"
      :parentInterface="currenteParentInterface"
      :firewallConfig="firewallConfig"
      @close="isShownDeleteAliasModal = false"
      @aliasDeleted="loadData"
    />
    <!-- configure interface drawer -->
    <ConfigureDeviceDrawer
      :device="currentDevice"
      :firewallConfig="firewallConfig"
      :isShown="isShownConfigureDeviceDrawer"
      @close="hideConfigureDeviceDrawer"
      @reloadData="loadData"
    />
  </div>
</template>
