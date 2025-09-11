<script setup lang="ts">
import {
  NeHeading,
  NeCard,
  NeTabs,
  NeEmptyState,
  NeButton,
  NeTextInput,
  NeInlineNotification
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs.ts'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { onMounted, ref } from 'vue'
import type { AxiosResponse } from 'axios'
import WireguardTunnelDetailCard from '@/components/standalone/wireguard/WireguardTunnelDetailCard.vue'
import { faCirclePlus, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import TunnelDrawer from '@/components/standalone/wireguard/TunnelDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import DeleteTunnelModal from '@/components/standalone/wireguard/DeleteTunnelModal.vue'
import PeerDrawer from '@/components/standalone/wireguard/PeerDrawer.vue'

const { t } = useI18n()
const changes = useUciPendingChangesStore()

const { tabs, selectedTab } = useTabs([
  {
    name: 'server',
    label: t('standalone.wireguard_tunnel.tabs.server')
  },
  {
    name: 'tunnel',
    label: t('standalone.wireguard_tunnel.tabs.tunnel')
  }
])

type Peer = {
  allowed_ips: string[]
  enabled: boolean
  name: string
  id: string
  reserved_ip: string
}

export type Tunnel = {
  id: string
  address: string
  client_to_client: boolean
  enabled: boolean
  listen_port: number
  name: string
  network: string
  peers: Peer[]
  public_endpoint: string
  route_all_traffic: boolean
  routes: string[]
  mtu: number
  dns: string
}

type ListInstancesResponse = {
  instances: Tunnel[]
}

const loading = ref(true)
const error = ref<Error>()
const instances = ref<Tunnel[]>([])

async function fetchData(): Promise<AxiosResponse<ListInstancesResponse>> {
  error.value = undefined
  return ubusCall<AxiosResponse<ListInstancesResponse>>('ns.wireguard', 'list-instances')
    .then((response) => {
      instances.value = response.data.instances
    })
    .catch((err) => (error.value = err))
    .finally(() => (loading.value = false))
}

onMounted(() => fetchData())

function refreshData(): Promise<unknown> {
  return Promise.all([changes.getChanges(), fetchData()])
}

const showTunnelDrawer = ref(false)
function createdTunnel() {
  refreshData().finally(() => closeTunnelDrawer())
}

const editingTunnel = ref<Tunnel>()
function editTunnel(instance: Tunnel) {
  editingTunnel.value = instance
  showTunnelDrawer.value = true
}

function closeTunnelDrawer() {
  showTunnelDrawer.value = false
  editingTunnel.value = undefined
}

const deletingTunnel = ref<Tunnel>()
function deleteTunnel(instance: Tunnel) {
  deletingTunnel.value = instance
}
function closeDeleteModal() {
  deletingTunnel.value = undefined
}
function tunnelDeleted() {
  refreshData().then(closeDeleteModal)
}

const showPeerDrawer = ref(false)
const creatingPeerFor = ref<Tunnel>()
function closePeerDrawer() {
  showPeerDrawer.value = false
  creatingPeerFor.value = undefined
}
function addPeerHandler(instance: Tunnel) {
  showPeerDrawer.value = true
  creatingPeerFor.value = instance
}
function addedPeerHandler() {
  refreshData().then(closePeerDrawer)
}
</script>

<template>
  <div class="space-y-8">
    <NeHeading tag="h3">{{ t('standalone.wireguard_tunnel.title') }}</NeHeading>
    <NeTabs
      :selected="selectedTab"
      :sr-select-tab-label="t('ne_tabs.select_a_tab')"
      :sr-tabs-label="t('ne_tabs.tabs')"
      :tabs="tabs"
      @select-tab="selectedTab = $event"
    />
    <div v-if="selectedTab == 'server'">
      <NeCard v-if="loading" loading />
      <div v-else class="space-y-6">
        <p>{{ t('standalone.wireguard_tunnel.description') }}</p>
        <NeInlineNotification v-if="error != undefined" kind="error" :title="t('common.error')" />
        <template v-else-if="instances.length > 0">
          <div class="flex flex-wrap gap-4">
            <NeTextInput is-search :placeholder="t('common.filter')" class="mr-auto" />
            <NeButton kind="secondary" @click="showTunnelDrawer = true">
              <template #prefix>
                <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
              </template>
              {{ t('standalone.wireguard_tunnel.add_server') }}
            </NeButton>
          </div>
          <WireguardTunnelDetailCard
            v-for="instance in instances"
            :key="instance.id"
            :instance="instance"
            @edit="editTunnel"
            @delete="deleteTunnel"
            @add-peer="addPeerHandler"
          />
        </template>
        <NeEmptyState
          v-else
          :title="t('standalone.wireguard_tunnel.no_server_configured')"
          :description="t('standalone.wireguard_tunnel.no_server_configured_description')"
          :icon="faGlobe"
        >
          <NeButton kind="primary" @click="showTunnelDrawer = true">
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
            </template>
            {{ t('standalone.wireguard_tunnel.add_server') }}
          </NeButton>
        </NeEmptyState>
      </div>
    </div>
  </div>
  <TunnelDrawer
    :is-shown="showTunnelDrawer"
    :tunnel="editingTunnel"
    @success="createdTunnel"
    @close="closeTunnelDrawer"
  />
  <DeleteTunnelModal
    :instance="deletingTunnel"
    @success="tunnelDeleted"
    @close="closeDeleteModal"
  />
  <PeerDrawer
    :is-shown="showPeerDrawer"
    :instance="creatingPeerFor"
    @close="closePeerDrawer"
    @success="addedPeerHandler"
  />
</template>
