<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../../NeTable.vue'
import { NeDropdown } from '@nethesis/vue-components'
import { NeButton } from '@nethserver/vue-tailwind-lib'
import type { AllowlistAddress } from './AllowlistTab.vue'

const { t } = useI18n()

defineProps<{
  allowlist: AllowlistAddress[]
}>()

const emit = defineEmits<{
  delete: [item: AllowlistAddress]
  edit: [item: AllowlistAddress]
}>()

const tableHeaders = [
  {
    label: t('standalone.threat_shield.address'),
    key: 'address'
  },
  {
    label: t('standalone.threat_shield.description'),
    key: 'description'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: AllowlistAddress) {
  return [
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
  <NeTable :data="allowlist" :headers="tableHeaders" class="z-10">
    <template #download="{ item }: { item: AllowlistAddress }">
      <p>{{ item.address }}</p>
    </template>
    <template #upload="{ item }: { item: AllowlistAddress }">
      <p>{{ item.description ? item.description : '-' }}</p>
    </template>
    <template #menu="{ item }: { item: AllowlistAddress }">
      <div class="align-center flex justify-end">
        <NeButton kind="tertiary" @click="emit('edit', item)">
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
