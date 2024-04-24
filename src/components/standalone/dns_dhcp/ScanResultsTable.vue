<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeDropdown, useItemPagination } from '@nethesis/vue-components'
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ScanResult } from './ScanNetwork.vue'
import NeTable from '../NeTable.vue'

const props = defineProps({
  results: {
    type: Array as PropType<ScanResult[]>,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['addIpReservation', 'addDnsRecord'])

const { t } = useI18n()

const { currentPage, pageCount, paginatedItems } = useItemPagination(() => props.results, {
  itemsPerPage: 10
})

const tableHeaders = [
  {
    label: t('standalone.dns_dhcp.ip_address'),
    key: 'ip'
  },
  {
    label: t('standalone.dns_dhcp.mac_address'),
    key: 'mac'
  },
  {
    label: t('standalone.dns_dhcp.hostname'),
    key: 'hostname'
  },
  {
    label: t('standalone.dns_dhcp.description'),
    key: 'description'
  },
  {
    key: 'actions'
  }
]

function getKebabMenuItems(scanResult: ScanResult) {
  return [
    {
      id: 'addIpReservation',
      label: t('standalone.dns_dhcp.add_reservation'),
      icon: 'circle-plus',
      iconStyle: 'fas',
      action: () => emit('addIpReservation', scanResult)
    },
    {
      id: 'addDnsRecord',
      label: t('standalone.dns_dhcp.add_dns_record'),
      icon: 'circle-plus',
      iconStyle: 'fas',
      action: () => emit('addDnsRecord', scanResult)
    }
  ]
}
</script>

<template>
  <NeTable
    :data="paginatedItems"
    :with-paginator="true"
    :paginator-props="{
      totalPages: pageCount,
      currentPage,
      previousLabel: t('common.previous'),
      nextLabel: t('common.next')
    }"
    @select-page="
      (page) => {
        currentPage = page
      }
    "
    :headers="tableHeaders"
    :loading="loading"
    :skeletonLines="8"
  >
    <!-- ip -->
    <template #ip="{ item }: { item: ScanResult }">
      {{ item.ip || '-' }}
    </template>
    <!-- mac -->
    <template #mac="{ item }: { item: ScanResult }">
      {{ item.mac || '-' }}
    </template>
    <!-- hostname -->
    <template #hostname="{ item }: { item: ScanResult }">
      {{ item.hostname || '-' }}
    </template>
    <!-- description -->
    <template #description="{ item }: { item: ScanResult }">
      {{ item.description || '-' }}
    </template>
    <!-- actions -->
    <template #actions="{ item }: { item: ScanResult }">
      <div class="flex justify-end">
        <NeDropdown :items="getKebabMenuItems(item)" :alignToRight="true" />
      </div>
    </template>
  </NeTable>
</template>
