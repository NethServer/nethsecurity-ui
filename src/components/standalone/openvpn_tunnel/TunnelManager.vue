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
import CreateOrEditTunnelDrawer from './CreateOrEditTunnelDrawer.vue'
import DeleteTunnelModal from './DeleteTunnelModal.vue'
import DownloadTunnelModal from './DownloadTunnelModal.vue'
import ImportConfigurationDrawer from './ImportConfigurationDrawer.vue'

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

export type ClientTunnelType = {
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

type Tunnel = ServerTunnelType | ClientTunnelType

const props = defineProps<{
  manageClientTunnels: boolean
}>()

const { t } = useI18n()

const uciChangesStore = useUciPendingChangesStore()

const loading = ref(true)
const tunnels = ref<ServerTunnelType[] | ClientTunnelType[]>([
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
const selectedTunnel = ref<Tunnel | null>(null)
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const showDownloadModal = ref(false)
const showImportConfigurationDrawer = ref(false)
const error = ref('')

async function fetchTunnels() {
  try {
    loading.value = true
    tunnels.value = []
    if (props.manageClientTunnels) {
      // fetch client tunnels
    } else {
      //fetch server tunnels
    }
    loading.value = false
  } catch (err: any) {
    error.value = t(getAxiosErrorMessage(err))
  }
}

function openCreateEditDrawer(itemToEdit: Tunnel | null) {
  selectedTunnel.value = itemToEdit
  showCreateEditDrawer.value = true
}

function openDeleteModal(itemToDelete: Tunnel) {
  selectedTunnel.value = itemToDelete
  showDeleteModal.value = true
}

function openDownloadModal(itemToDownload: Tunnel) {
  selectedTunnel.value = itemToDownload
  showDownloadModal.value = true
}

function openImportConfigurationDrawer() {
  showImportConfigurationDrawer.value = true
}

function closeModalsAndDrawers() {
  selectedTunnel.value = null
  showDeleteModal.value = false
  showDownloadModal.value = false
  showCreateEditDrawer.value = false
  showImportConfigurationDrawer.value = false
}

async function toggleTunnelEnable(tunnel: Tunnel) {
  //TODO: toggle tunnel enable
}

async function reloadTunnels() {
  await fetchTunnels()
  await uciChangesStore.getChanges()
}

onMounted(() => {
  fetchTunnels()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{
          manageClientTunnels
            ? t('standalone.openvpn_tunnel.client_tunnel_description')
            : t('standalone.openvpn_tunnel.server_tunnel_description')
        }}
      </p>
      <template v-if="tunnels.length > 0">
        <div class="ml-2 shrink-0" v-if="!manageClientTunnels">
          <NeButton kind="secondary" @click="openCreateEditDrawer(null)">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-plus']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.openvpn_tunnel.add_server_tunnel') }}
          </NeButton>
        </div>
        <div
          class="ml-2 flex shrink-0 flex-col gap-x-0 gap-y-2 sm:flex-row sm:gap-x-2 sm:gap-y-0"
          v-else
        >
          <NeButton kind="tertiary" @click="openCreateEditDrawer(null)">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-plus']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.openvpn_tunnel.add_client_tunnel') }}
          </NeButton>
          <NeButton kind="secondary" @click="openImportConfigurationDrawer">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-arrow-up']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.openvpn_tunnel.import_configuration') }}
          </NeButton>
        </div>
      </template>
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
        v-if="tunnels.length == 0"
        :title="
          manageClientTunnels
            ? t('standalone.openvpn_tunnel.no_client_tunnel_found')
            : t('standalone.openvpn_tunnel.no_server_tunnel_found')
        "
        :icon="['fas', 'globe']"
        ><NeButton v-if="!manageClientTunnels" kind="primary" @click="openCreateEditDrawer(null)"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.openvpn_tunnel.add_server_tunnel') }}</NeButton
        ><template v-else
          ><div class="flex flex-col gap-y-2">
            <NeButton kind="primary" @click="openImportConfigurationDrawer">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'circle-arrow-up']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('standalone.openvpn_tunnel.import_configuration') }}
            </NeButton>
            <NeButton kind="tertiary" @click="openCreateEditDrawer(null)">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'circle-plus']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('standalone.openvpn_tunnel.add_client_tunnel') }}
            </NeButton>
          </div></template
        ></NeEmptyState
      >
      <TunnelTable
        v-else
        :is-client-tunnel="manageClientTunnels"
        :tunnels="tunnels"
        @tunnel-delete="openDeleteModal"
        @tunnel-download="openDownloadModal"
        @tunnel-edit="openCreateEditDrawer"
        @tunnel-toggle-enable="toggleTunnelEnable"
      />
    </template>
  </div>
  <CreateOrEditTunnelDrawer
    :item-to-edit="selectedTunnel"
    @close="closeModalsAndDrawers"
    @add-edit-tunnel="reloadTunnels"
    :is-shown="showCreateEditDrawer"
    :is-client-tunnel="manageClientTunnels"
  />
  <DeleteTunnelModal
    :visible="showDeleteModal"
    :item-to-delete="selectedTunnel"
    @close="closeModalsAndDrawers"
    @tunnel-deleted="reloadTunnels"
  />
  <DownloadTunnelModal
    :visible="showDownloadModal"
    :item-to-download="selectedTunnel"
    @close="closeModalsAndDrawers"
  />
  <ImportConfigurationDrawer
    v-if="manageClientTunnels"
    :is-shown="showImportConfigurationDrawer"
    @close="closeModalsAndDrawers"
    @tunnel-imported="reloadTunnels"
  />
</template>
