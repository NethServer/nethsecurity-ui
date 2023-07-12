<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTitle, getAxiosErrorMessage, byteFormat1000 } from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'

const { t } = useI18n()
let interfaces: any = ref([])
let devices: any = ref({})

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

async function loadData() {
  getNetworkInterfaces()
  getNetworkDevices()
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
  loading.value.networkDevices = true

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
</script>

<template>
  <div>
    <NeTitle>{{ t('standalone.interfaces_and_devices.title') }}</NeTitle>
  </div>
  <!-- //// skeleton -->
  <!-- //// group interfaces by role -->
  <div v-if="!isLoading" class="text-sm space-y-8">
    <div v-for="iface in interfaces" class="px-8 py-6 bg-white rounded-md">
      <div class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <!-- first column -->
        <div>
          <div class="font-semibold">{{ iface.interface }}</div>
          <div>{{ iface.device }}</div>
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
            <span class="font-semibold">{{ t('standalone.interfaces_and_devices.speed') }}: </span>
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
    </div>
  </div>
</template>
