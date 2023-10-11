<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { toRefs } from 'vue'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeButton } from '@nethserver/vue-tailwind-lib'
import type { DnsRecord } from './DnsRecords.vue'

const { t } = useI18n()

const props = defineProps<{
  dnsRecords: DnsRecord[]
}>()

const { dnsRecords } = toRefs(props)

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
      {{ item.wildcard ? t('standalone.dns_dhcp.enabled') : t('standalone.dns_dhcp.disabled') }}
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