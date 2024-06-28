<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeBadge
} from '@nethesis/vue-components'
import { ref, type PropType } from 'vue'
import { library as faLibrary } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowsLeftRightToLine,
  faAddressCard,
  faDesktop,
  faBoxArchive
} from '@fortawesome/free-solid-svg-icons'
import HostSetRecords from './HostSetRecords.vue'
import { useRouter, useRoute } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { type HostSet } from '@/composables/useHostSets'
import { useObjects } from '@/composables/useObjects'

const props = defineProps({
  filteredHostSets: {
    type: Array as PropType<HostSet[]>
  },
  allHostSets: {
    type: Array as PropType<HostSet[]>
  },
  loading: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits<{
  editHostSet: [item: HostSet]
  deleteHostSet: [item: HostSet]
  showUsagesHostSet: [item: HostSet]
}>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { getObjectIcon } = useObjects()

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.filteredHostSets, {
  itemsPerPage: pageSize
})

faLibrary.add(faArrowsLeftRightToLine)
faLibrary.add(faAddressCard)
faLibrary.add(faDesktop)
faLibrary.add(faBoxArchive)

function getKebabMenuItems(hostSet: HostSet) {
  const kebabItems = [
    {
      id: 'showUsagesHostSet',
      label: t('standalone.objects.show_usages'),
      icon: 'magnifying-glass-plus',
      iconStyle: 'fas',
      action: () => emit('showUsagesHostSet', hostSet),
      disabled: !hostSet.used,
      danger: false
    }
  ]

  if (isHostSetEditable(hostSet)) {
    kebabItems.push({
      id: 'deleteHostSet',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      danger: true,
      action: () => emit('deleteHostSet', hostSet),
      disabled: false
    })
  }
  return kebabItems
}

function isHostSetEditable(hostSet: HostSet) {
  return ['host_set', 'host', 'cidr', 'range'].includes(hostSet.subtype)
}

function goToManagementPage(subtype: string) {
  let path = ''

  switch (subtype) {
    case 'dhcp_static_lease':
      path = 'network/dns-dhcp?tab=static-leases'
      break
    case 'dns_record':
      path = 'network/dns-dhcp?tab=dns-records'
      break
    case 'vpn_user':
      path = 'vpn/openvpn-rw'
  }
  router.push(`${getStandaloneRoutePrefix(route)}/${path}`)
}

function getManagementPageLabel(subtype: string) {
  switch (subtype) {
    case 'dhcp_static_lease':
      return t('common.go_to_page', { page: t('standalone.dns_dhcp.tabs.static_leases') })
    case 'dns_record':
      return t('common.go_to_page', { page: t('standalone.dns_dhcp.tabs.dns_records') })
    case 'vpn_user':
      return t('standalone.objects.go_to_rw_accounts')
  }
}
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.objects.host_sets')"
    cardBreakpoint="xl"
    :loading="loading"
    :skeletonRows="6"
  >
    <NeTableHead>
      <NeTableHeadCell>
        {{ t('standalone.objects.name') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.objects.type') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.objects.ip_version') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.objects.records') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.id">
        <!-- name -->
        <NeTableCell :data-label="t('standalone.objects.name')">
          <div class="flex items-center gap-2">
            <font-awesome-icon
              :icon="getObjectIcon(item.subtype)"
              class="h-4 w-4"
              aria-hidden="true"
            />
            {{ item.name }}
            <NeBadge
              v-if="!item.used"
              kind="secondary"
              :text="t('standalone.objects.not_used')"
              size="xs"
              class="shrink-0"
            />
          </div>
        </NeTableCell>
        <!-- type -->
        <NeTableCell :data-label="t('standalone.objects.type')">
          {{ t(`standalone.objects.subtype_${item.subtype}`) }}
        </NeTableCell>
        <!-- ip version -->
        <NeTableCell :data-label="t('standalone.objects.ip_version')">
          <template v-if="item.family === 'ipv4'"> IPv4 </template>
          <template v-else-if="item.family === 'ipv6'"> IPv6 </template>
          <template v-else> - </template>
        </NeTableCell>
        <!-- records -->
        <NeTableCell :data-label="t('standalone.objects.records')">
          <HostSetRecords :records="item.ipaddr" :allHostSets="allHostSets" />
        </NeTableCell>
        <!-- actions -->
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
            <!-- edit button -->
            <NeButton
              v-if="isHostSetEditable(item)"
              kind="tertiary"
              size="lg"
              @click="emit('editHostSet', item)"
            >
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'pen-to-square']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('common.edit') }}
            </NeButton>
            <!-- go to management page -->
            <NeButton
              v-else
              kind="tertiary"
              @click="goToManagementPage(item.subtype)"
              class="shrink-0"
            >
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'arrow-right']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ getManagementPageLabel(item.subtype) }}
            </NeButton>
            <!-- kebab menu -->
            <NeDropdown :items="getKebabMenuItems(item)" :alignToRight="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.filteredHostSets?.length"
        :page-size="pageSize"
        :nav-pagination-label="t('ne_table.pagination')"
        :next-label="t('ne_table.go_to_next_page')"
        :previous-label="t('ne_table.go_to_previous_page')"
        :range-of-total-label="t('ne_table.of')"
        :page-size-label="t('ne_table.show')"
        @select-page="
            (page: number) => {
              currentPage = page
            }"
        @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
      />
    </template>
  </NeTable>
</template>
