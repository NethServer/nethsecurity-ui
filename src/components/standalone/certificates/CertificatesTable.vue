<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeButton, NeDropdown, NeBadge, NeTooltip } from '@nethserver/vue-tailwind-lib'
import type { Certificate } from '@/views/standalone/system/CertificatesView.vue'

const { t } = useI18n()

defineProps<{
  certificates: Certificate[]
}>()

const emit = defineEmits<{
  delete: [item: Certificate]
  edit: [item: Certificate]
  setAsDefault: [item: Certificate]
  showCertificate: [item: Certificate]
}>()

const tableHeaders = [
  {
    label: t('standalone.certificates.name'),
    key: 'name'
  },
  {
    label: t('standalone.certificates.domains'),
    key: 'domains'
  },
  {
    label: t('standalone.certificates.expire'),
    key: 'expire'
  },
  {
    label: '',
    key: 'menu'
  }
]

function isCertificateExpired(item: Certificate) {
  return new Date(Date.parse(item.expiration)).getTime() < Date.now()
}

function getFormattedExpiration(item: Certificate) {
  return `${new Date(Date.parse(item.expiration)).toLocaleDateString()} ${new Date(
    Date.parse(item.expiration)
  ).toLocaleTimeString()}`
}

function getDropdownItems(item: Certificate) {
  return [
    ...(!isCertificateExpired(item)
      ? [
          {
            id: 'set_as_default',
            label: t('standalone.certificates.set_as_default'),
            iconStyle: 'fas',
            icon: 'circle-check',
            action: () => {
              emit('setAsDefault', item)
            }
          }
        ]
      : []),
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
}
</script>

<template>
  <NeTable :data="certificates" :headers="tableHeaders" class="z-10">
    <template #name="{ item }: { item: Certificate }">
      <div class="flex flex-row items-center">
        <div class="mr-6">
          <p>{{ item.path }}</p>
          <NeButton class="-mx-2" kind="tertiary" @click="emit('showCertificate', item)">{{
            t('standalone.certificates.more_info')
          }}</NeButton>
        </div>
        <NeTooltip interactive v-if="item.default">
          <template #trigger>
            <NeBadge
              v-if="item.default"
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
    </template>
    <template #domains="{ item }: { item: Certificate }">
      <p>{{ item.domains.join(', ') }}</p>
    </template>
    <template #expire="{ item }: { item: Certificate }">
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
    </template>
    <template #menu="{ item }: { item: Certificate }">
      <div class="align-center flex justify-end">
        <!-- TODO: hide/disable dropdown if item is system certificate -->
        <NeDropdown v-if="!item.default" :items="getDropdownItems(item)" :align-to-right="true" />
      </div>
    </template>
  </NeTable>
</template>
