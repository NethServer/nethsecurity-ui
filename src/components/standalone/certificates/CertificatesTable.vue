<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeDropdown,
  NeBadge,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeButton,
  NeTooltip,
  useSort,
  NeSortDropdown
} from '@nethesis/vue-components'
import type { Certificate } from '@/views/standalone/system/CertificatesView.vue'
import { ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  certificates: Certificate[]
}>()

const sortKey = ref('name')
const sortDescending = ref(false)

const sortFunctions = {
  // custom sorting function for domains attribute
  domains: (a: Certificate, b: Certificate) => {
    if (a.type === 'acme' && b.type === 'acme') {
      if (a.requested_domains?.length && b.requested_domains?.length) {
        return a.requested_domains[0].localeCompare(b.requested_domains[0])
      } else {
        return 0
      }
    } else if (a.type === 'self-signed' && b.type === 'self-signed') {
      return a.domain.localeCompare(b.domain)
    } else if (a.type === 'self-signed') {
      return -1
    } else {
      return 1
    }
  }
}
const { sortedItems } = useSort(props.certificates, sortKey, sortDescending, sortFunctions)

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => sortedItems.value, {
  itemsPerPage: pageSize
})

const emit = defineEmits<{
  delete: [item: Certificate]
  edit: [item: Certificate]
  setAsDefault: [item: Certificate]
  showCertificate: [item: Certificate]
}>()

function isCertificateExpired(item: Certificate) {
  return item.expiration ? new Date(Date.parse(item.expiration)).getTime() < Date.now() : false
}

function getFormattedExpiration(item: Certificate) {
  return item.expiration
    ? new Date(Date.parse(item.expiration)).toLocaleString([], {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-'
}

function getCertificateType(item: Certificate) {
  switch (item.type) {
    case 'self-signed':
      return t('standalone.certificates.self_signed')
    case 'custom':
      return t('standalone.certificates.custom')
    case 'acme':
      return t('standalone.certificates.lets_encrypt')
  }
}

function getDropdownItems(item: Certificate) {
  return [
    // "Set as default" option is enabled only if certificate isn't expired and, in the case of an
    // ACME certificate, it isn't pending
    {
      id: 'set_as_default',
      label: t('standalone.certificates.set_as_default'),
      iconStyle: 'fas',
      disabled: isCertificateExpired(item) || item.pending,
      icon: 'circle-check',
      action: () => {
        emit('setAsDefault', item)
      }
    },
    // The self-signed system certificate cannot be deleted
    ...(item.name != '_lan'
      ? [
          {
            id: 'delete',
            label: t('common.delete'),
            iconStyle: 'fas',
            icon: 'trash',
            danger: true,
            action: () => {
              emit('delete', item)
            }
          }
        ]
      : [])
  ]
}

const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}
</script>

<template>
  <NeSortDropdown
    v-model:sortKey="sortKey"
    v-model:sortDescending="sortDescending"
    :label="t('sort.sort')"
    :options="[
      { id: 'name', label: t('standalone.certificates.name') },
      { id: 'domains', label: t('standalone.certificates.domains') },
      { id: 'type', label: t('standalone.certificates.type') },
      { id: 'expiration', label: t('standalone.certificates.expire') }
    ]"
    :openMenuAriaLabel="t('ne_dropdown.open_menu')"
    :sortByLabel="t('sort.sort_by')"
    :sortDirectionLabel="t('sort.direction')"
    :ascendingLabel="t('sort.ascending')"
    :descendingLabel="t('sort.descending')"
    class="lg:hidden"
  />
  <NeTable
    :sortKey="sortKey"
    :sortDescending="sortDescending"
    :ariaLabel="t('standalone.certificates.title')"
    cardBreakpoint="lg"
    class="z-10"
  >
    <NeTableHead>
      <NeTableHeadCell sortable columnKey="name" @sort="onSort">{{
        t('standalone.certificates.name')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="domains" @sort="onSort">{{
        t('standalone.certificates.domains')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="type" @sort="onSort">{{
        t('standalone.certificates.type')
      }}</NeTableHeadCell>
      <NeTableHeadCell sortable columnKey="expiration" @sort="onSort">{{
        t('standalone.certificates.expire')
      }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
        <NeTableCell :data-label="t('standalone.certificates.name')">
          <div class="flex flex-row items-center gap-6">
            <div class="flex flex-col gap-1">
              <p>{{ item.name }}</p>
              <NeButton
                :disabled="!item.details"
                class="-mx-2"
                kind="tertiary"
                @click="emit('showCertificate', item)"
                >{{ t('standalone.certificates.more_info') }}</NeButton
              >
            </div>
            <!-- default certificate badge and tooltip -->
            <NeTooltip interactive v-if="item.default">
              <template #trigger>
                <NeBadge
                  kind="success"
                  class="-mt-2"
                  :text="t('standalone.certificates.default')"
                />
              </template>
              <template #content>
                <p class="text-center">
                  {{ t('standalone.certificates.default_certificate_tooltip') }}
                </p>
              </template></NeTooltip
            >
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.certificates.domains')">
          <p v-if="item.type != 'acme'">{{ item.domain ? item.domain : '-' }}</p>
          <template v-else>
            <div class="flex flex-col gap-1">
              <p>{{ item.requested_domains!.slice(0, 2).join(', ') }}</p>
              <NeTooltip interactive placement="bottom" v-if="item.requested_domains!.length > 2">
                <template #trigger>
                  <NeButton size="sm" kind="tertiary" class="-mx-2">{{
                    t('standalone.certificates.plus_n_others', {
                      n: item.requested_domains!.length - 2
                    })
                  }}</NeButton>
                </template>
                <template #content>
                  <p>{{ item.requested_domains!.slice(2).join(', ') }}</p>
                </template>
              </NeTooltip>
            </div>
          </template>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.certificates.type')">
          <div class="flex flex-row items-center">
            <p class="mr-6">{{ getCertificateType(item) }}</p>
            <!-- pending badge and tooltip -->
            <NeTooltip interactive v-if="item.pending">
              <template #trigger>
                <NeBadge kind="warning" :text="t('standalone.certificates.pending')" />
              </template>
              <template #content>
                <p class="text-center">
                  {{ t('standalone.certificates.pending_tooltip') }}
                </p>
              </template></NeTooltip
            >
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.certificates.expire')">
          <div class="flex flex-row gap-x-2">
            <p>
              {{ getFormattedExpiration(item) }}
            </p>
            <!-- certificate expired warning -->
            <NeTooltip interactive v-if="isCertificateExpired(item)">
              <template #trigger>
                <font-awesome-icon
                  :icon="['fas', 'triangle-exclamation']"
                  class="h-4 w-4 text-amber-500"
                />
              </template>
              <template #content>
                <p class="text-center">{{ t('standalone.certificates.certificate_expired') }}</p>
              </template>
            </NeTooltip>
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-4 flex items-center lg:ml-0 lg:justify-end">
            <NeDropdown
              v-if="!item.default"
              :items="getDropdownItems(item)"
              :align-to-right="true"
            />
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
            }"
        @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
      />
    </template>
  </NeTable>
</template>
