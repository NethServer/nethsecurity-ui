<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { NeButton, NeCard, NeEmptyState, NeInlineNotification } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { faCircleArrowUp, faCirclePlus, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ClientTunnelDrawer from '@/components/standalone/wireguard/ClientTunnelDrawer.vue'
import ImportTunnelDrawer from '@/components/standalone/wireguard/ImportTunnelDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'

const { t } = useI18n()
const changes = useUciPendingChangesStore()

type ClientTunnels = {
  id: string
  name: string
  enabled: boolean
  address: string
  dns: string[]
  pre_shared_key: string
  endpoint: string
  remote_networks: string[]
  route_all_traffic: boolean
}

type ListTunnelsResponse = AxiosResponse<{
  tunnels: ClientTunnels[]
}>

const loading = ref(true)
const error = ref<Error>()
const instances = ref<ClientTunnels[]>([])

function fetchInstances() {
  loading.value = true
  error.value = undefined
  return ubusCall<ListTunnelsResponse>('ns.wireguard', 'list-tunnels')
    .then((response) => {
      instances.value = response.data.tunnels
    })
    .catch((err) => (error.value = err))
    .finally(() => (loading.value = false))
}

onMounted(() => fetchInstances())

const showImportTunnelDrawer = ref(false)
const showTunnelDrawer = ref(false)

function importedTunnelHandler() {
  Promise.all([changes.getChanges(), fetchInstances()]).then(() => {
    showImportTunnelDrawer.value = false
  })
}
</script>

<template>
  <NeCard v-if="loading" loading />
  <div v-else class="space-y-6">
    <p>{{ t('standalone.wireguard_peers.description') }}</p>
    <NeInlineNotification v-if="error != undefined" kind="error" :title="t('common.error')" />
    <template v-else-if="instances.length > 0">
      <!-- TODO: add wireguard peer list -->
    </template>
    <NeEmptyState
      v-else
      :title="t('standalone.wireguard_peers.no_peer_configured')"
      :description="t('standalone.wireguard_peers.no_peer_configured_description')"
      :icon="faGlobe"
    >
      <div class="flex flex-col gap-5">
        <NeButton kind="primary" @click="showImportTunnelDrawer = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faCircleArrowUp" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.wireguard_peers.import_peer_tunnel') }}
        </NeButton>
        <NeButton kind="secondary" @click="showTunnelDrawer = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.wireguard_peers.add_peer_tunnel') }}
        </NeButton>
      </div>
    </NeEmptyState>
  </div>
  <ImportTunnelDrawer
    :is-shown="showImportTunnelDrawer"
    @close="showImportTunnelDrawer = false"
    @success="importedTunnelHandler"
  />
  <ClientTunnelDrawer :is-shown="showTunnelDrawer" @close="showTunnelDrawer = false" />
</template>
