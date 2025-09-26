<script lang="ts" setup>
import {
  NeButton,
  NeCard,
  NeEmptyState,
  NeInlineNotification,
  NeTextInput
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import type { AxiosResponse } from 'axios'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { faCirclePlus, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import WireguardTunnelDetailCard from '@/components/standalone/wireguard/WireguardTunnelDetailCard.vue'
import TunnelDrawer from '@/components/standalone/wireguard/TunnelDrawer.vue'
import DeletePeerModal from '@/components/standalone/wireguard/DeletePeerModal.vue'
import DeleteTunnelModal from '@/components/standalone/wireguard/DeleteTunnelModal.vue'
import PeerDrawer from '@/components/standalone/wireguard/PeerDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'
import type { Peer, Tunnel } from '@/views/standalone/vpn/WireguardTunnelView.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const changes = useUciPendingChangesStore()

type ListInstancesResponse = {
  instances: Tunnel[]
}

const loading = ref(true)
const error = ref<Error>()
const instances = ref<Tunnel[]>([])

async function fetchData(): Promise<AxiosResponse<ListInstancesResponse>> {
  error.value = undefined
  return ubusCall<AxiosResponse<ListInstancesResponse>>('ns.wireguard', 'list-servers')
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
const editPeer = ref<Peer>()
function closePeerDrawer() {
  showPeerDrawer.value = false
  creatingPeerFor.value = undefined
  editPeer.value = undefined
}
function addPeerHandler(instance: Tunnel) {
  showPeerDrawer.value = true
  creatingPeerFor.value = instance
}
function addedPeerHandler() {
  refreshData().then(closePeerDrawer)
}
function editPeerHandler(instance: Tunnel, peer: Peer) {
  showPeerDrawer.value = true
  creatingPeerFor.value = instance
  editPeer.value = peer
}
const peerToDelete = ref<Peer>()
function deletePeerHandler(peer: Peer) {
  peerToDelete.value = peer
}
function closeDeletePeerModal() {
  peerToDelete.value = undefined
}
function peerDeleted() {
  refreshData().then(closeDeletePeerModal)
}
</script>

<template>
  <div>
    <NeCard v-if="loading" loading />
    <div v-else class="space-y-6">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.wireguard_tunnel.description') }}
      </p>
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
          @edit-peer="editPeerHandler"
          @delete-peer="deletePeerHandler"
        />
      </template>
      <NeEmptyState
        v-else
        :title="t('standalone.wireguard_tunnel.no_server_configured')"
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
    :peer="editPeer"
    @close="closePeerDrawer"
    @success="addedPeerHandler"
  />
  <DeletePeerModal :peer="peerToDelete" @success="peerDeleted" @close="closeDeletePeerModal" />
</template>
