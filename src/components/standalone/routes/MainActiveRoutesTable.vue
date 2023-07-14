<script setup lang="ts">
import { onMounted, ref } from 'vue'
import NeTable from '../NeTable.vue'
import { ubusCall } from '@/lib/standalone/ubus'

const loading = ref(false)
const data = ref(Array<any>())

const headers = [
  {
    label: 'Interface',
    key: 'interface'
  },
  {
    label: 'Network Address',
    key: 'network_address'
  },
  {
    label: 'Gateway',
    key: 'gateway'
  },
  {
    label: 'Metric',
    key: 'metric'
  },
  {
    label: 'Table',
    key: 'table'
  },
  {
    label: 'Protocol',
    key: 'protocol'
  }
]

function fetchData() {
  loading.value = true
  ubusCall('network.interface', 'dump', {})
    .then(() => {
      data.value = [
        {
          interface: 'WAN',
          network_address: '0.0.0.0/24',
          gateway: '192.168.100.1',
          metric: '0',
          table: 'main',
          protocol: 'static'
        },
        {
          interface: 'WAN',
          network_address: '192.168.100.0/24',
          gateway: '-',
          metric: '0',
          table: 'main',
          protocol: 'kernel'
        },
        {
          interface: 'LAN',
          network_address: '192.168.122.0/24',
          gateway: '-',
          metric: '0',
          table: 'main',
          protocol: 'kernel'
        }
      ]
    })
    .catch((error) => {
      console.log(error)
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <NeTable :data="data" :headers="headers" :loading="loading" readonly></NeTable>
</template>
