<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeButton } from '@nethserver/vue-tailwind-lib'
import type { StaticLease } from './StaticLeases.vue'
import type { DynamicLease } from './DynamicLeases.vue'

const { t } = useI18n()

const props = defineProps<{
  leases: StaticLease[] | DynamicLease[]
  showDynamicLeases: boolean
}>()

const emit = defineEmits(['lease-delete', 'lease-edit'])

const tableHeaders = [
  {
    label: t('standalone.dns_dhcp.hostname'),
    key: 'hostname'
  },
  ...(!props.showDynamicLeases
    ? [
        {
          label: t('standalone.dns_dhcp.reservation_name'),
          key: 'description'
        }
      ]
    : []),
  {
    label: t('standalone.dns_dhcp.interface'),
    key: 'interface'
  },
  {
    label: t('standalone.dns_dhcp.ip_address'),
    key: 'ipaddr'
  },
  {
    label: t('standalone.dns_dhcp.mac_address'),
    key: 'macaddr'
  },
  ...(!props.showDynamicLeases
    ? [
        {
          label: '',
          key: 'menu'
        }
      ]
    : [
        {
          label: t('standalone.dns_dhcp.timestamp'),
          key: 'timestamp'
        }
      ])
]

function getDropdownItems(item: StaticLease) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('lease-delete', item)
      }
    }
  ]
}
</script>

<template>
  <NeTable :data="leases" :headers="tableHeaders" :readonly="showDynamicLeases">
    <template v-if="!showDynamicLeases" #description="{ item }: { item: StaticLease }">
      {{ item.description ? item.description : '-' }}
    </template>
    <template #interface="{ item }: { item: DynamicLease | StaticLease }">
      <p v-if="!item.interface && !item.device">-</p>
      <p v-else>{{ item.interface }}<br />{{ item.device }}</p>
    </template>
    <template v-if="showDynamicLeases" #timestamp="{ item }: { item: DynamicLease }">
      {{ new Date(Number.parseInt(item.timestamp) * 1000).toLocaleDateString() }}
      {{ new Date(Number.parseInt(item.timestamp) * 1000).toLocaleTimeString() }}
    </template>
    <template v-if="!showDynamicLeases" #menu="{ item }: { item: StaticLease }">
      <div class="align-center flex justify-end">
        <NeButton kind="tertiary" @click="emit('lease-edit', item)">
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
