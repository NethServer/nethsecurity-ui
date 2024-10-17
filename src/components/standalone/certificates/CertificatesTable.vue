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
  NeTooltip
} from '@nethesis/vue-components'
import type { Certificate } from '@/views/standalone/system/CertificatesView.vue'
import { ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  certificates: Certificate[]
}>()

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.certificates, {
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
</script>

<template>
  <NeTable :ariaLabel="t('standalone.certificates.title')" cardBreakpoint="lg" class="z-10">
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.certificates.name') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.certificates.domains') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.certificates.type') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.certificates.expire') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
        <NeTableCell :data-label="t('standalone.certificates.name')">
          <div class="flex flex-row items-center">
            <div class="mr-6">
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
          <div class="align-center flex justify-end">
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
        :total-rows="props.certificates.length"
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
