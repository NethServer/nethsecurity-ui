<script lang="ts" setup>
import {
  NeBadgeV2,
  NeCard,
  NeHeading,
  NeEmptyState,
  NeButton,
  NeDropdown,
  type NeDropdownItem,
  NeTable,
  NeTableHeadCell,
  NeTableHead,
  NeTableRow,
  NeTableCell,
  NeTableBody,
  useItemPagination,
  NePaginator
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faCircleCheck,
  faCirclePlus,
  faCircleXmark,
  faPenToSquare,
  faTrash,
  faUserGroup
} from '@fortawesome/free-solid-svg-icons'
import type { Tunnel } from '@/views/standalone/vpn/WireguardTunnelView.vue'

const { t } = useI18n()

const { instance } = defineProps<{
  instance: Tunnel
}>()

const emit = defineEmits<{
  edit: [item: Tunnel]
  delete: [item: Tunnel]
}>()

const tunnelActions: NeDropdownItem[] = [
  {
    id: 'edit',
    label: t('standalone.wireguard_tunnel.edit_tunnel'),
    icon: faPenToSquare,
    action: () => emit('edit', instance)
  },
  {
    id: 'delete',
    label: t('standalone.wireguard_tunnel.delete_tunnel'),
    icon: faTrash,
    danger: true,
    action: () => emit('delete', instance)
  }
]

const peerActions: NeDropdownItem[] = [
  {
    id: 'edit',
    label: t('standalone.wireguard_tunnel.edit_peer'),
    icon: faPenToSquare,
    action: () => {
      /* FIXME */
    }
  },
  {
    id: 'delete',
    label: t('standalone.wireguard_tunnel.delete_peer'),
    icon: faTrash,
    danger: true,
    action: () => {
      /* FIXME */
    }
  }
]

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => instance.peers ?? [], {
  itemsPerPage: pageSize
})
</script>

<template>
  <NeCard>
    <div class="space-y-6">
      <div class="flex flex-wrap gap-8">
        <div class="mr-auto space-y-2">
          <div class="flex items-center gap-8">
            <NeHeading tag="h4">{{ instance.name }}</NeHeading>
            <NeBadgeV2 v-if="instance.enabled" kind="green" size="xs">
              <FontAwesomeIcon :icon="faCircleCheck" class="size-4" />
              {{ t('common.enabled') }}
            </NeBadgeV2>
            <NeBadgeV2 v-else kind="gray" size="xs">
              <FontAwesomeIcon :icon="faCircleXmark" class="size-4" />
              {{ t('common.disabled') }}
            </NeBadgeV2>
          </div>
          <div class="flex flex-wrap gap-x-8 gap-y-2">
            <span>
              <span class="font-bold"> {{ t('standalone.wireguard_tunnel.vpn_network') }}: </span>
              {{ instance.network }}
            </span>
            <span>
              <span class="font-bold"> {{ t('standalone.wireguard_tunnel.port') }}: </span>
              {{ instance.listen_port }}
            </span>
            <span>
              <span class="font-bold"> {{ t('standalone.wireguard_tunnel.endpoint') }}: </span>
              {{ instance.public_endpoint }}
            </span>
            <span>
              <span class="font-bold"> {{ t('standalone.wireguard_tunnel.mtu') }}: </span>
              {{ instance.mtu }}
            </span>
            <span v-if="instance.dns">
              <span class="font-bold"> {{ t('standalone.wireguard_tunnel.dns') }}: </span>
              {{ instance.dns }}
            </span>
          </div>
        </div>
        <div class="flex items-start gap-2">
          <NeButton
            v-if="instance.peers.length > 0"
            kind="secondary"
            @click="
              () => {
                /* FIXME */
              }
            "
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
            </template>
            {{ t('standalone.wireguard_tunnel.add_peer') }}
          </NeButton>
          <NeDropdown :items="tunnelActions" :align-to-right="true" />
        </div>
      </div>
      <NeTable
        v-if="instance.peers.length > 0"
        :aria-label="t('standalone.wireguard_tunnel.peers')"
        card-breakpoint="lg"
      >
        <NeTableHead>
          <NeTableHeadCell>
            {{ t('standalone.wireguard_tunnel.name') }}
          </NeTableHeadCell>
          <NeTableHeadCell>
            {{ t('standalone.wireguard_tunnel.reserved_ip') }}
          </NeTableHeadCell>
          <NeTableHeadCell>
            {{ t('standalone.wireguard_tunnel.status') }}
          </NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-for="peer in paginatedItems" :key="peer.name">
            <NeTableCell :data-label="t('standalone.wireguard_tunnel.name')">
              <div>{{ peer.name }}</div>
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.wireguard_tunnel.reserved_ip')">
              {{ peer.reserved_ip }}
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.wireguard_tunnel.status')">
              <div class="flex items-center gap-1">
                <template v-if="peer.enabled">
                  <FontAwesomeIcon :icon="faCircleCheck" class="size-4 text-enabled" />
                  {{ t('common.enabled') }}
                </template>
                <template v-else>
                  <FontAwesomeIcon :icon="faCircleXmark" class="size-4 text-disabled" />
                  {{ t('common.disabled') }}
                </template>
              </div>
            </NeTableCell>
            <NeTableCell :data-label="t('common.actions')">
              <div class="flex justify-end gap-2">
                <NeButton kind="tertiary">
                  <template #prefix>
                    <FontAwesomeIcon :icon="faPenToSquare" aria-hidden="true" class="size-4" />
                  </template>
                  {{ t('common.edit') }}
                </NeButton>
                <NeDropdown :items="peerActions" :align-to-right="true" />
              </div>
            </NeTableCell>
          </NeTableRow>
        </NeTableBody>
        <template #paginator>
          <NePaginator
            :current-page="currentPage"
            :total-rows="instance.peers.length"
            :page-size="pageSize"
            :nav-pagination-label="t('ne_table.pagination')"
            :next-label="t('ne_table.go_to_next_page')"
            :previous-label="t('ne_table.go_to_previous_page')"
            :range-of-total-label="t('ne_table.of')"
            :page-size-label="t('ne_table.show')"
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
        :title="t('standalone.wireguard_tunnel.no_peer_configured')"
        :icon="faUserGroup"
      >
        <NeButton
          kind="primary"
          @click="
            () => {
              /* FIXME */
            }
          "
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.wireguard_tunnel.add_peer') }}
        </NeButton>
      </NeEmptyState>
    </div>
  </NeCard>
</template>
