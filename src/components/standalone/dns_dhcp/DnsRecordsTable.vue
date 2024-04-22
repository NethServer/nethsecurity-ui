<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown } from '@nethesis/vue-components'
import { NeButton } from '@nethesis/vue-components'
import type { DnsRecord } from './DnsRecords.vue'

const { t } = useI18n()

defineProps<{
  dnsRecords: DnsRecord[]
}>()

const emit = defineEmits(['record-delete', 'record-edit'])

const tableHeaders = [
  {
    label: t('standalone.dns_dhcp.hostname'),
    key: 'name'
  },
  {
    label: t('standalone.dns_dhcp.name'),
    key: 'description'
  },
  {
    label: t('standalone.dns_dhcp.ip_address'),
    key: 'ip'
  },
  {
    label: t('standalone.dns_dhcp.wildcard_dns_record'),
    key: 'wildcard'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: DnsRecord) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('record-delete', item)
      }
    }
  ]
}
</script>

<template>
  <NeTable :data="dnsRecords" :headers="tableHeaders" class="z-10">
    <template #description="{ item }: { item: DnsRecord }">
      {{ item.description ? item.description : '-' }}
    </template>
    <template #wildcard="{ item }: { item: DnsRecord }">
      <div :class="['flex', 'flex-row', 'items-center']">
        <font-awesome-icon
          :icon="['fas', item.wildcard ? 'circle-check' : 'circle-xmark']"
          class="mr-2 h-5 w-5"
          aria-hidden="true"
        />
        {{ item.wildcard ? t('standalone.dns_dhcp.enabled') : t('standalone.dns_dhcp.disabled') }}
      </div>
    </template>
    <template #menu="{ item }: { item: DnsRecord }">
      <div class="align-center flex justify-end">
        <NeButton kind="tertiary" @click="emit('record-edit', item)">
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
    </template>
  </NeTable>
</template>
