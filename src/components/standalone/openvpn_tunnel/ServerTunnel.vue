<script setup lang="ts">
import {
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton,
  NeButton,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TunnelTable from './TunnelTable.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import CreateOrEditServerTunnelDrawer from './CreateOrEditServerTunnelDrawer.vue'
import DeleteTunnelModal from './DeleteTunnelModal.vue'
import DownloadTunnelModal from './DownloadTunnelModal.vue'

export type ServerTunnelType = {
  name: string
  lport: string
  proto: string
  topology: string
  ifconfig: string
  public_ip: string[]
  locals: string[]
  remotes: string[]
  enabled: boolean
  connected: boolean
}

const { t } = useI18n()

const uciChangesStore = useUciPendingChangesStore()

const loading = ref(true)
const serverTunnels = ref<ServerTunnelType[]>([
  {
    name: 'server1',
    lport: '2001',
    proto: 'udp',
    topology: 'p2p',
    ifconfig: '10.96.83.1 10.96.83.2',
    public_ip: ['192.168.122.49'],
    locals: ['192.168.102.0/24'],
    remotes: ['192.168.5.0/24'],
    enabled: true,
    connected: true
  }
])
const selectedServerTunnel = ref<ServerTunnelType | null>(null)
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const showDownloadModal = ref(false)
const error = ref('')

async function fetchServerTunnels() {
  try {
    loading.value = true
    //serverTunnels.value = []
    loading.value = false
  } catch (err: any) {
    error.value = t(getAxiosErrorMessage(err))
  }
}

function openCreateEditDrawer(itemToEdit: ServerTunnelType | null) {
  selectedServerTunnel.value = itemToEdit
  showCreateEditDrawer.value = true
}

function openDeleteModal(itemToDelete: ServerTunnelType) {
  selectedServerTunnel.value = itemToDelete
  showDeleteModal.value = true
}

function openDownloadModal(itemToDownload: ServerTunnelType) {
  selectedServerTunnel.value = itemToDownload
  showDownloadModal.value = true
}

function closeModalsAndDrawers() {
  selectedServerTunnel.value = null
  showDeleteModal.value = false
  showDownloadModal.value = false
  showCreateEditDrawer.value = false
}

async function toggleTunnelEnable(tunnel: ServerTunnelType) {
  //TODO: toggle tunnel enable
}

async function reloadServerTunnels() {
  await fetchServerTunnels()
  await uciChangesStore.getChanges()
}

onMounted(() => {
  fetchServerTunnels()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.openvpn_tunnel.server_tunnel_description') }}
      </p>
      <div class="ml-2 shrink-0">
        <NeButton
          kind="secondary"
          @click="openCreateEditDrawer(null)"
          v-if="serverTunnels.length > 0"
        >
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.openvpn_tunnel.add_server_tunnel') }}
        </NeButton>
      </div>
    </div>
    <NeInlineNotification
      kind="error"
      :title="t('error.cannot_retrieve_server_tunnels')"
      :description="error"
      v-if="error"
    />
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else>
      <NeEmptyState
        v-if="serverTunnels.length == 0"
        :title="t('standalone.openvpn_tunnel.no_server_tunnel_found')"
        :icon="['fas', 'globe']"
        ><NeButton kind="primary" @click="openCreateEditDrawer(null)"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.openvpn_tunnel.add_server_tunnel') }}</NeButton
        ></NeEmptyState
      >
      <TunnelTable
        v-else
        :is-client-tunnel="false"
        :tunnels="serverTunnels"
        @tunnel-delete="openDeleteModal"
        @tunnel-download="openDownloadModal"
        @tunnel-edit="openCreateEditDrawer"
        @tunnel-toggle-enable="toggleTunnelEnable"
      />
    </template>
  </div>
  <CreateOrEditServerTunnelDrawer
    :item-to-edit="selectedServerTunnel"
    @close="closeModalsAndDrawers"
    @add-edit-tunnel="reloadServerTunnels"
    :is-shown="showCreateEditDrawer"
  />
  <DeleteTunnelModal
    :visible="showDeleteModal"
    :item-to-delete="selectedServerTunnel"
    @close="closeModalsAndDrawers"
    @tunnel-deleted="reloadServerTunnels"
  />
  <DownloadTunnelModal
    :visible="showDownloadModal"
    :item-to-download="selectedServerTunnel"
    @close="closeModalsAndDrawers"
  />
</template>
