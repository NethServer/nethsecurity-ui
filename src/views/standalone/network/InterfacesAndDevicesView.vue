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
  getAxiosErrorMessage,
  byteFormat1000
} from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const GET_DEVICES_INTERVAL_TIME = 5000 //// 10000
const { t } = useI18n()
let interfaces: any = ref([])
let devices: any = ref({})
// used for setInterval
let devicesIntervalId: Ref<number> = ref(0)

let loading = ref({
  networkInterfaces: true,
  networkDevices: true
})

let error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

const isLoading = computed(() => {
  return loading.value.networkInterfaces || loading.value.networkDevices
})

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  console.log('unmounted') ////

  if (devicesIntervalId.value) {
    clearInterval(devicesIntervalId.value)

    console.log('cleared', devicesIntervalId.value) ////
  }
})

async function loadData() {
  getNetworkInterfaces()
  getNetworkDevices()

  // clear previous setInterval (if needed)
  if (devicesIntervalId.value) {
    clearInterval(devicesIntervalId.value)

    console.log('cleared', devicesIntervalId.value) ////

    devicesIntervalId.value = 0
  }

  // reload devices periodically
  devicesIntervalId.value = setInterval(getNetworkDevices, GET_DEVICES_INTERVAL_TIME)

  console.log('setInterval, devicesIntervalId', devicesIntervalId.value) ////
}

async function getNetworkInterfaces() {
  loading.value.networkInterfaces = true

  try {
    const res = await ubusCall('network.interface', 'dump')

    console.log('getNetworkInterfaces res', res.data) ////

    interfaces.value = res.data.interface
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

//// move to local library?
function getRole(iface: any) {
  //// fix
  if (iface.interface.includes('lan')) {
    return 'green'
  } else if (iface.interface.includes('wan')) {
    return 'red'
  }
}

function getInterfaceBorderStyle(iface: any) {
  switch (getRole(iface)) {
    case 'green':
      return 'border-green-700 dark:border-green-600'
    case 'red':
      return 'border-rose-700 dark:border-rose-600'
    default:
      return 'border-gray-400 dark:border-gray-500'
  }
}

function getInterfaceIconName(iface: any) {
  switch (getRole(iface)) {
    case 'green':
      return 'location-dot'
    case 'red':
      return 'earth-americas'
    default:
      return 'circle-question'
  }
}

function getIconBackgroundStyle(iface: any) {
  switch (getRole(iface)) {
    case 'green':
      return 'bg-green-100 dark:bg-green-800'
    case 'red':
      return 'bg-rose-100 dark:bg-rose-800'
    default:
      return 'bg-gray-200 dark:bg-gray-600'
  }
}

function getIconForegroundStyle(iface: any) {
  switch (getRole(iface)) {
    case 'green':
      return 'text-green-700 dark:text-green-50'
    case 'red':
      return 'text-rose-700 dark:text-rose-50'
    default:
      return 'text-gray-600 dark:text-gray-50'
  }
}
</script>

<template>
  <div>
    <NeTitle>{{ t('standalone.interfaces_and_devices.title') }}</NeTitle>
  </div>
  <!-- //// improve skeleton -->
  <NeSkeleton v-if="isLoading" size="lg" :lines="12" />
  <!-- //// group interfaces by role -->
  <div v-else class="text-sm space-y-6">
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
    <template v-for="iface in interfaces">
      <div
        v-if="iface.interface !== 'loopback'"
        :class="`relative px-8 py-6 shadow rounded-md border-l-4 bg-white dark:bg-gray-800 ${getInterfaceBorderStyle(
          iface
        )}`"
      >
        <!-- overflow menu for smaller screens -->
        <div class="3xl:hidden absolute right-4 top-4 flex items-center">
          <!-- <div class="3xl:hidden absolute right-8 inset-y-0 flex items-center">  //// centered vertically -->
          <NeButton kind="tertiary" size="lg" class="py-3">
            <font-awesome-icon
              :icon="['fas', 'ellipsis-vertical']"
              aria-hidden="true"
              :class="`h-4 w-4`"
            />
          </NeButton>
        </div>
        <div
          class="grid gap-x-4 gap-y-8 pr-6 3xl:pr-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5"
        >
          <!-- first column -->
          <div class="flex items-center md:border-r border-gray-200 dark:border-gray-600">
            <!-- use component for interface icon? //// -->
            <div
              :class="`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full mr-4 ${getIconBackgroundStyle(
                iface
              )}`"
            >
              <font-awesome-icon
                :icon="['fas', getInterfaceIconName(iface)]"
                aria-hidden="true"
                :class="`h-5 w-5 ${getIconForegroundStyle(iface)}`"
              />
            </div>
            <div>
              <div class="font-semibold">{{ iface.interface }}</div>
              <div>{{ iface.device }}</div>
            </div>
          </div>
          <!-- second column -->
          <div>
            <div>
              <span class="font-semibold">MAC: </span>
              <span class="font-mono">{{ devices[iface.device]?.mac || '-' }}</span>
            </div>
            <div v-for="ipv4Address in iface['ipv4-address']">
              <span class="font-semibold">IPv4: </span>
              <span>{{ ipv4Address.address }}/{{ ipv4Address.mask }}</span>
            </div>
          </div>
          <!-- third column -->
          <div>
            <div>
              <span class="font-semibold">RX: </span>
              <span>{{ byteFormat1000(devices[iface.device]?.stats?.rx_bytes) }}</span>
              <span v-if="devices[iface.device]?.stats?.rx_packets">
                ({{ devices[iface.device]?.stats.rx_packets || '-' }} pkts)</span
              >
            </div>
            <div>
              <span class="font-semibold">TX: </span>
              <span>{{ byteFormat1000(devices[iface.device]?.stats?.tx_bytes) }}</span>
              <span v-if="devices[iface.device]?.stats?.tx_packets">
                ({{ devices[iface.device]?.stats.tx_packets || '-' }} pkts)</span
              >
            </div>
          </div>
          <!-- fourth column -->
          <div>
            <div>
              <div class="flex items-center gap-2 mb-2">
                <font-awesome-icon
                  :icon="['fas', devices[iface.device]?.flags.up ? 'circle-check' : 'circle-xmark']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                <span>{{
                  devices[iface.device]?.flags.up
                    ? t('standalone.interfaces_and_devices.up')
                    : t('standalone.interfaces_and_devices.down')
                }}</span>
              </div>
              <div>
                <span class="font-semibold"
                  >{{ t('standalone.interfaces_and_devices.speed') }}:
                </span>
                <span>
                  {{
                    devices[iface.device]?.link.speed && devices[iface.device]?.link.speed !== -1
                      ? devices[iface.device].link.speed
                      : '-'
                  }}
                </span>
              </div>
            </div>
          </div>
          <!-- fifth column -->
          <div
            class="hidden 3xl:flex items-center gap-4 justify-end border-l border-gray-200 dark:border-gray-600"
          >
            <NeButton kind="tertiary" size="lg">
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
            <NeButton kind="tertiary" size="lg" class="py-3">
              <font-awesome-icon
                :icon="['fas', 'ellipsis-vertical']"
                aria-hidden="true"
                :class="`h-4 w-4`"
              />
            </NeButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
