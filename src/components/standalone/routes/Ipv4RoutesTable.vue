<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import NeTable from '../NeTable.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { NeToggle } from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const loading = ref(false)
const data = ref(Array<any>())

const headers = [
  {
    label: 'Label',
    key: 'label'
  },
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
    label: 'Status',
    key: 'status'
  }
]

function fetchData() {
  loading.value = true
  ubusCall('network.interface', 'dump', {})
    .then(() => {
      data.value = [
        {
          label: 'Route Label',
          interface: 'Unspecified',
          network_address: '192.168.56.2/10',
          gateway: '-',
          metric: '0',
          status: true
        },
        {
          label: 'Route Label',
          interface: 'WAN',
          network_address: '192.168.56.2/24',
          gateway: '192.168.0.1',
          metric: '1',
          status: true
        },
        {
          label: 'Route Label',
          interface: 'LAN',
          network_address: '192.168.56.2/11',
          gateway: '-',
          metric: '2',
          status: false
        },
        {
          label: 'Route Label',
          interface: 'Unspecified',
          network_address: '192.168.56.2/24',
          gateway: '-',
          metric: '254',
          status: true
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
  <NeTable :data="data" :headers="headers" :loading="loading" has-actions>
    <template #interface="props">
      <template v-if="props.item.interface == 'LAN'">
        <FontAwesomeIcon :icon="['fas', 'location-dot']" />
      </template>
      <template v-else-if="props.item.interface == 'WAN'">
        <FontAwesomeIcon :icon="['fas', 'earth-americas']" />
      </template>
      <template v-else>
        <FontAwesomeIcon :icon="['fas', 'empty-set']" />
      </template>
      {{ props.item.interface }}
    </template>
    <template #status="props">
      <NeToggle v-model="props.item.status" disabled />
    </template>
  </NeTable>
</template>
