<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import {
  NeButton,
  NeCard,
  NeEmptyState,
  NeInlineNotification,
  NeTable,
  NeTableHeadCell,
  NeTableHead,
  NeTableBody,
  NePaginator,
  NeTableRow,
  NeTableCell,
  useItemPagination,
  NeDropdown,
  NeTextInput
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import {
  faCircleArrowUp,
  faCircleCheck,
  faCirclePlus,
  faCircleXmark,
  faGlobe,
  faPenToSquare
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ClientTunnelDrawer from '@/components/standalone/wireguard/ClientTunnelDrawer.vue'
import ImportTunnelDrawer from '@/components/standalone/wireguard/ImportTunnelDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'

const { t } = useI18n()
const changes = useUciPendingChangesStore()

export type ClientTunnel = {
  id: string
  peer_id: string
  name: string
  enabled: boolean
  address: string
  peer_private_key: string
  dns: string[]
  server_public_key: string
  pre_shared_key: string
  endpoint: string
  udp_port: number
  network_routes: string[]
  route_all_traffic: boolean
}

type ListTunnelsResponse = AxiosResponse<{
  tunnels: ClientTunnel[]
}>

const loading = ref(true)
const error = ref<Error>()
const instances = ref<ClientTunnel[]>([])

async function fetchInstances() {
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
const peerToEdit = ref<ClientTunnel>()

function editPeer(item: ClientTunnel) {
  peerToEdit.value = item
  showTunnelDrawer.value = true
}

function addedTunnelHandler() {
  Promise.all([changes.getChanges(), fetchInstances()]).then(() => closeTunnelDrawer())
}

function closeTunnelDrawer() {
  showImportTunnelDrawer.value = false
  showTunnelDrawer.value = false
  peerToEdit.value = undefined
}

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => instances.value, {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeCard v-if="loading" loading />
  <div v-else class="space-y-6">
    <p>{{ t('standalone.wireguard_peers.description') }}</p>
    <div v-if="instances.length > 0" class="flex flex-wrap gap-4">
      <NeTextInput is-search :placeholder="t('common.filter')" class="mr-auto" />
      <NeButton kind="tertiary" @click="showTunnelDrawer = true">
        <template #prefix>
          <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="size-4" />
        </template>
        {{ t('standalone.wireguard_peers.add_peer_tunnel') }}
      </NeButton>
      <NeButton kind="primary" @click="showImportTunnelDrawer = true">
        <template #prefix>
          <FontAwesomeIcon :icon="faCircleArrowUp" aria-hidden="true" class="size-4" />
        </template>
        {{ t('standalone.wireguard_peers.import_peer_tunnel') }}
      </NeButton>
    </div>
    <NeInlineNotification v-if="error != undefined" kind="error" :title="t('common.error')" />
    <NeTable
      v-else-if="instances.length > 0"
      :aria-label="t('standalone.wireguard_peers.peers')"
      card-breakpoint="lg"
    >
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('standalone.wireguard_peers.name') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.wireguard_peers.reserved_ip') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.wireguard_peers.network_routes') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.wireguard_peers.status') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.wireguard_peers.connection') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="instance in paginatedItems" :key="instance.id">
          <NeTableCell :data-label="t('standalone.wireguard_peers.name')">
            {{ instance.name }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.wireguard_peers.reserved_ip')">
            {{ instance.address }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.wireguard_peers.network_routes')">
            <template v-if="instance.route_all_traffic">
              {{ t('standalone.wireguard_peers.all_traffic') }}
            </template>
            <template v-else>
              {{ instance.network_routes.join(', ') }}
            </template>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.wireguard_peers.status')">
            <div class="flex items-center gap-2">
              <template v-if="instance.enabled">
                <FontAwesomeIcon :icon="faCircleCheck" class="size-4 text-enabled" />
                {{ t('common.enabled') }}
              </template>
              <template v-else>
                <FontAwesomeIcon :icon="faCircleXmark" class="size-4 text-disabled" />
                {{ t('common.disabled') }}>
              </template>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.wireguard_peers.connection')">
            FIXME
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="flex justify-end gap-2">
              <NeButton kind="tertiary" @click="editPeer(instance)">
                <template #prefix>
                  <FontAwesomeIcon :icon="faPenToSquare" aria-hidden="true" class="size-4" />
                </template>
                {{ t('common.edit') }}
              </NeButton>
              <NeDropdown
                :items="
                  () => {
                    // FIXME
                    return []
                  }
                "
                :align-to-right="true"
              />
            </div>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :page-size="pageSize"
          :page-size-label="t('ne_table.show')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :total-rows="instances.length"
          @select-page="
            (page: number) => {
              currentPage = page
            }
          "
          @select-page-size="
            (size: number) => {
              pageSize = size
            }
          "
        />
      </template>
    </NeTable>
    <NeEmptyState
      v-else
      :title="t('standalone.wireguard_peers.no_peer_configured')"
      :description="t('standalone.wireguard_peers.no_peer_configured_description')"
      :icon="faGlobe"
    >
      <div class="flex flex-col gap-5">
        <NeButton kind="primary" @click="showImportTunnelDrawer = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faCircleArrowUp" aria-hidden="true" class="size-4" />
          </template>
          {{ t('standalone.wireguard_peers.import_peer_tunnel') }}
        </NeButton>
        <NeButton kind="secondary" @click="showTunnelDrawer = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="size-4" />
          </template>
          {{ t('standalone.wireguard_peers.add_peer_tunnel') }}
        </NeButton>
      </div>
    </NeEmptyState>
  </div>
  <ImportTunnelDrawer
    :is-shown="showImportTunnelDrawer"
    @close="showImportTunnelDrawer = false"
    @success="addedTunnelHandler"
  />
  <ClientTunnelDrawer
    :is-shown="showTunnelDrawer"
    :peer="peerToEdit"
    @close="closeTunnelDrawer"
    @success="addedTunnelHandler"
  />
</template>
