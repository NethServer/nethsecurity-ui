<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeDropdown,
  NeModal,
  NeLink,
  NeButton,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  NeSortDropdown,
  useItemPagination,
  useSort,
  type SortEvent
} from '@nethesis/vue-components'
import type { IpsecTunnel } from '@/views/standalone/vpn/IPsecTunnelView.vue'
import {
  faCircleCheck,
  faCircleXmark,
  faTrash,
  faMagnifyingGlassPlus,
  faPenToSquare,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { t } = useI18n()

const showDetailsModal = ref(false)
const showRawOutput = ref(false)
const selectedTunnel = ref<IpsecTunnel | null>(null)

function openDetailsModal(tunnel: IpsecTunnel) {
  selectedTunnel.value = tunnel
  showRawOutput.value = false
  showDetailsModal.value = true
}

function closeDetailsModal() {
  showDetailsModal.value = false
  showRawOutput.value = false
  selectedTunnel.value = null
}

const props = defineProps<{
  tunnels: IpsecTunnel[]
}>()

const emit = defineEmits(['tunnel-delete', 'tunnel-edit', 'tunnel-toggle-enable'])

const sortKey = ref<keyof IpsecTunnel>('name')
const sortDescending = ref(false)

const { sortedItems } = useSort(() => props.tunnels, sortKey, sortDescending)

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
  itemsPerPage: pageSize
})

const onSort = (payload: SortEvent) => {
  sortKey.value = payload.key as keyof IpsecTunnel
  sortDescending.value = payload.descending
}

function getDropdownItems(item: IpsecTunnel) {
  const items = []

  items.push({
    id: 'enable_disable',
    label:
      item.enabled === '1'
        ? t('standalone.ipsec_tunnel.disable')
        : t('standalone.ipsec_tunnel.enable'),
    icon: item.enabled === '1' ? faCircleXmark : faCircleCheck,
    action: () => {
      emit('tunnel-toggle-enable', item)
    }
  })

  items.push({
    id: 'delete',
    label: t('common.delete'),
    icon: faTrash,
    danger: true,
    action: () => {
      emit('tunnel-delete', item)
    }
  })

  return items
}
</script>

<template>
  <NeSortDropdown
    v-model:sort-key="sortKey"
    v-model:sort-descending="sortDescending"
    :label="t('sort.sort')"
    :options="[{ id: 'name', label: t('standalone.ipsec_tunnel.name') }]"
    :open-menu-aria-label="t('ne_dropdown.open_menu')"
    :sort-by-label="t('sort.sort_by')"
    :sort-direction-label="t('sort.direction')"
    :ascending-label="t('sort.ascending')"
    :descending-label="t('sort.descending')"
    class="mb-2 xl:hidden"
  />
  <NeTable
    :sort-key="sortKey"
    :sort-descending="sortDescending"
    :aria-label="t('standalone.ipsec_tunnel.title')"
    card-breakpoint="xl"
  >
    <NeTableHead>
      <NeTableHeadCell sortable column-key="name" @sort="onSort">
        {{ t('standalone.ipsec_tunnel.name') }}
      </NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.ipsec_tunnel.local_networks') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.ipsec_tunnel.remote_networks') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.ipsec_tunnel.status') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.ipsec_tunnel.connection') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.id">
        <NeTableCell :data-label="t('standalone.ipsec_tunnel.name')">
          <div class="flex items-center gap-2">
            <NeButton
              v-if="item.enabled === '1'"
              kind="tertiary"
              size="sm"
              @click="openDetailsModal(item)"
            >
              <FontAwesomeIcon :icon="faMagnifyingGlassPlus" class="h-4 w-4" aria-hidden="true" />
            </NeButton>
            <span v-else class="w-8"></span>
            <p :class="item.enabled === '0' ? 'opacity-50' : ''">{{ item.name }}</p>
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.ipsec_tunnel.local_networks')">
          <template v-if="item.local.length > 0">
            <p
              v-for="(local, idx) in item.local.slice(0, 2)"
              :key="local"
              :class="item.enabled === '0' ? 'opacity-50' : ''"
            >
              {{ local }}{{ item.local.length > 2 && idx == 1 ? '...' : '' }}
            </p>
          </template>
          <p v-else>-</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.ipsec_tunnel.remote_networks')">
          <template v-if="item.remote.length > 0">
            <p
              v-for="(remote, idx) in item.remote.slice(0, 2)"
              :key="remote"
              :class="item.enabled === '0' ? 'opacity-50' : ''"
            >
              {{ remote }}{{ item.remote.length > 2 && idx == 1 ? '...' : '' }}
            </p>
          </template>
          <p v-else>-</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.ipsec_tunnel.status')">
          <div :class="['flex', 'flex-row', 'items-center']">
            <FontAwesomeIcon
              :icon="item.enabled === '1' ? faCircleCheck : faCircleXmark"
              :class="[
                'mr-2',
                'h-5',
                'w-5',
                item.enabled === '0' ? 'opacity-50' : ['text-green-700', 'dark:text-green-500']
              ]"
              aria-hidden="true"
            />
            <p :class="item.enabled === '0' ? 'opacity-50' : ''">
              {{
                item.enabled === '1'
                  ? t('standalone.ipsec_tunnel.enabled')
                  : t('standalone.ipsec_tunnel.disabled')
              }}
            </p>
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.ipsec_tunnel.connection')">
          <div :class="['flex', 'flex-col']">
            <div class="flex items-center">
              <FontAwesomeIcon
                :icon="
                  item.connected === 'yes'
                    ? faCircleCheck
                    : item.connected === 'warning'
                      ? faTriangleExclamation
                      : faCircleXmark
                "
                :class="[
                  'mr-2',
                  'h-5',
                  'w-5',
                  item.enabled === '0'
                    ? 'opacity-50'
                    : item.connected === 'yes'
                      ? 'text-green-700 dark:text-green-500'
                      : item.connected === 'warning'
                        ? 'text-amber-700 dark:text-amber-500'
                        : 'text-red-700 dark:text-red-500'
                ]"
                aria-hidden="true"
              />
              <div>
                <p :class="item.enabled === '0' ? 'opacity-50' : ''">
                  {{
                    item.connected === 'yes'
                      ? t('standalone.ipsec_tunnel.connected')
                      : item.connected === 'warning'
                        ? t('standalone.ipsec_tunnel.warning')
                        : t('standalone.ipsec_tunnel.not_connected')
                  }}
                </p>
                <NeLink v-if="item.connected === 'warning'" @click="openDetailsModal(item)">
                  {{ t('standalone.ipsec_tunnel.more_info') }}
                </NeLink>
              </div>
            </div>
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="align-center flex justify-end">
            <NeButton kind="tertiary" @click="emit('tunnel-edit', item)">
              <template #prefix>
                <FontAwesomeIcon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('common.edit') }}
            </NeButton>
            <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="sortedItems.length"
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

  <!-- Details Modal -->
  <NeModal
    :visible="showDetailsModal"
    kind="info"
    size="xl"
    :title="t('standalone.ipsec_tunnel.tunnel_details')"
    :primary-label="t('common.close')"
    :close-aria-label="t('common.close')"
    @primary-click="closeDetailsModal"
    @close="closeDetailsModal"
  >
    <template v-if="selectedTunnel">
      <p class="mb-4">
        {{ selectedTunnel.name }} {{ t('standalone.ipsec_tunnel.child_tunnels') }}:
      </p>

      <!-- Children list -->
      <div class="mb-4">
        <ul class="space-y-1">
          <li
            v-for="child in selectedTunnel.children"
            :key="child.name"
            class="flex items-center text-sm"
          >
            <FontAwesomeIcon
              :icon="child.installed ? faCircleCheck : faCircleXmark"
              :class="[
                'mr-2',
                'h-4',
                'w-4',
                child.installed
                  ? 'text-green-700 dark:text-green-500'
                  : 'text-red-700 dark:text-red-500'
              ]"
              aria-hidden="true"
            />
            <span>{{ child.name }}</span>
            <span class="ml-2 text-gray-500 dark:text-gray-400">
              {{
                child.installed
                  ? t('standalone.ipsec_tunnel.installed')
                  : t('standalone.ipsec_tunnel.not_installed')
              }},
            </span>
            <template v-if="child.local_subnet.length || child.remote_subnet.length">
              <span class="ml-3 text-sm text-gray-500 dark:text-gray-400">
                <template v-if="child.local_subnet.length">{{
                  child.local_subnet.join(', ')
                }}</template>
                <template v-if="child.local_subnet.length && child.remote_subnet.length">
                  →
                </template>
                <template v-if="child.remote_subnet.length">{{
                  child.remote_subnet.join(', ')
                }}</template>
              </span>
            </template>
          </li>
        </ul>
      </div>

      <!-- Raw output toggle -->
      <div>
        <NeLink @click="showRawOutput = !showRawOutput">
          {{
            showRawOutput
              ? t('standalone.ipsec_tunnel.hide_full_status')
              : t('standalone.ipsec_tunnel.show_full_status')
          }}
        </NeLink>
        <pre
          v-if="showRawOutput"
          class="mt-2 max-h-96 overflow-auto rounded bg-gray-100 p-3 text-sm whitespace-pre-wrap dark:bg-gray-800"
          >{{ selectedTunnel.raw_output }}</pre
        >
      </div>
    </template>
  </NeModal>
</template>
