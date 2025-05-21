<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toRef } from 'vue'
import {
  NeButton,
  NeDropdown,
  NeSortDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  useSort
} from '@nethesis/vue-components'
import type { StaticLease } from './StaticLeases.vue'
import type { DynamicLease } from './DynamicLeases.vue'
import { ref } from 'vue'
import { faCirclePlus, faTrash } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()

const props = defineProps<{
  leases: StaticLease[] | DynamicLease[]
  showDynamicLeases: boolean
}>()

const leasesRef = toRef(props, 'leases')
const emit = defineEmits(['lease-delete', 'lease-edit', 'create-static-lease-from-dynamic'])

const pageSize = ref(10)
const sortKey = ref<keyof StaticLease | keyof DynamicLease>('hostname')
const sortDescending = ref(false)

function compareIpAddresses(ip1: string, ip2: string): number {
  const octets1 = ip1.split('.').map(Number)
  const octets2 = ip2.split('.').map(Number)

  for (let i = 0; i < 4; i++) {
    if (octets1[i] !== octets2[i]) {
      return octets1[i] - octets2[i]
    }
  }
  return 0
}

function sortAddresses<T extends StaticLease | DynamicLease>(a: T, b: T) {
  return compareIpAddresses(a.ipaddr, b.ipaddr)
}

// Declare sortedItems before useItemPagination
const { sortedItems } = useSort(leasesRef, sortKey, sortDescending, {
  address: sortAddresses
})

// Now use sortedItems in useItemPagination
const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
  itemsPerPage: pageSize
})

function getDropdownItems(item: StaticLease) {
  return !props.showDynamicLeases
    ? [
        {
          id: 'delete',
          label: t('common.delete'),
          icon: faTrash,
          danger: true,
          action: () => {
            emit('lease-delete', item)
          }
        }
      ]
    : [
        {
          id: 'create-static-lease',
          label: t('standalone.dns_dhcp.add_reservation'),
          icon: faCirclePlus,
          action: () => {
            emit('create-static-lease-from-dynamic', item)
          }
        }
      ]
}

// FIXME: return typed event from NeTableHeadCell
const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}
</script>

<template>
  <NeSortDropdown
    v-model:sort-key="sortKey"
    v-model:sort-descending="sortDescending"
    :label="t('sort.sort')"
    :options="[
      { id: 'hostname', label: t('standalone.dns_dhcp.hostname') },
      { id: 'description', label: t('standalone.dns_dhcp.reservation_name') },
      { id: 'interface', label: t('standalone.dns_dhcp.interface') },
      { id: 'expiration', label: t('standalone.dns_dhcp.lease_expiration') },
      { id: 'address', label: t('standalone.dns_dhcp.ip_address') }
    ]"
    :open-menu-aria-label="t('ne_dropdown.open_menu')"
    :sort-by-label="t('sort.sort_by')"
    :sort-direction-label="t('sort.direction')"
    :ascending-label="t('sort.ascending')"
    :descending-label="t('sort.descending')"
    class="lg:hidden"
  />
  <NeTable
    :sort-key="sortKey"
    :sort-descending="sortDescending"
    :aria-label="t('standalone.dns_dhcp.tabs.static_leases')"
    card-breakpoint="xl"
  >
    <NeTableHead>
      <NeTableHeadCell column-key="hostname" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.hostname') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="interface" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.interface') }}
      </NeTableHeadCell>
      <NeTableHeadCell column-key="address" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.ip_address') }}
      </NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dns_dhcp.mac_address') }}</NeTableHeadCell>
      <NeTableHeadCell v-if="showDynamicLeases" column-key="expiration" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.lease_expiration') }}
      </NeTableHeadCell>
      <NeTableHeadCell v-if="!showDynamicLeases" column-key="description" sortable @sort="onSort">
        {{ t('standalone.dns_dhcp.reservation_name') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
        <NeTableCell :data-label="t('standalone.dns_dhcp.hostname')">
          {{ item.hostname }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.interface')">
          <p v-if="!item.interface && !item.device">-</p>
          <p v-else>{{ item.interface }} ({{ item.device }})</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.ip_address')">
          {{ item.ipaddr }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dns_dhcp.mac_address')">
          {{ item.macaddr }}
        </NeTableCell>
        <NeTableCell
          v-if="showDynamicLeases"
          :data-label="t('standalone.dns_dhcp.lease_expiration')"
        >
          {{ new Date(Number.parseInt(item.timestamp) * 1000).toLocaleDateString() }}
          {{ new Date(Number.parseInt(item.timestamp) * 1000).toLocaleTimeString() }}
        </NeTableCell>
        <NeTableCell
          v-if="!showDynamicLeases"
          :data-label="t('standalone.dns_dhcp.reservation_name')"
        >
          {{ item.description ? item.description : '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="align-center -ml-2.5 flex gap-2 xl:ml-0 xl:justify-end">
            <NeButton v-if="!showDynamicLeases" kind="tertiary" @click="emit('lease-edit', item)">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'pen-to-square']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
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
</template>
