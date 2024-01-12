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

function getDropdownItems(item: Certificate) {
  return [
    ...(!item.default && !item.expired
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
        <NeBadge
          v-if="item.default"
          kind="success"
          class="-mt-2"
          :text="t('standalone.certificates.default')"
        />
      </div>
    </template>
    <template #domains="{ item }: { item: Certificate }">
      <p>{{ item.domains.join(', ') }}</p>
    </template>
    <template #expire="{ item }: { item: Certificate }">
      <div class="flex flex-row gap-x-2">
        <p>
          {{
            `${new Date(item.expiration * 1000).toLocaleDateString()} ${new Date(
              item.expiration * 1000
            ).toLocaleTimeString()}`
          }}
        </p>
        <!-- certificate expired warning -->
        <NeTooltip interactive v-if="item.expired">
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
        <!-- TODO: hide/disable dropdown if item is system certificate and is default -->
        <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
      </div>
    </template>
  </NeTable>
</template>