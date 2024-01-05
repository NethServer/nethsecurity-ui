<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { QoSInterface } from '@/views/standalone/network/QoSView.vue'
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeButton, NeDropdown } from '@nethserver/vue-tailwind-lib'

const { t } = useI18n()

defineProps<{
  qosInterfaces: QoSInterface[]
}>()

const emit = defineEmits<{
  delete: [item: QoSInterface]
  edit: [item: QoSInterface]
  enableDisable: [item: QoSInterface]
}>()

const tableHeaders = [
  {
    label: t('standalone.qos.interface'),
    key: 'interface'
  },
  {
    label: `${t('standalone.qos.download_speed')} (Mbps)`,
    key: 'download'
  },
  {
    label: `${t('standalone.qos.upload_speed')} (Mbps)`,
    key: 'upload'
  },
  {
    label: t('standalone.qos.status'),
    key: 'status'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: QoSInterface) {
  return [
    {
      id: 'enable_disable',
      label: !item.disabled ? t('common.disable') : t('common.enable'),
      iconStyle: 'fas',
      icon: !item.disabled ? 'circle-xmark' : 'circle-check',
      action: () => {
        emit('enableDisable', item)
      }
    },
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

function getCellClasses(item: QoSInterface) {
  return item.disabled ? ['opacity-50'] : []
}
</script>

<template>
  <NeTable :data="qosInterfaces" :headers="tableHeaders" class="z-10">
    <template #interface="{ item }: { item: QoSInterface }">
      <div class="flex flex-row items-center gap-x-4">
        <div
          :class="`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-700`"
        >
          <font-awesome-icon
            :icon="['fas', 'earth-americas']"
            aria-hidden="true"
            :class="`h-5 w-5  text-rose-700  dark:text-rose-50`"
          />
        </div>
        <p :class="[...getCellClasses(item)]">{{ item.interface }} ({{ item.device }})</p>
      </div>
    </template>
    <template #download="{ item }: { item: QoSInterface }">
      <p :class="[...getCellClasses(item)]">{{ item.download }}</p>
    </template>
    <template #upload="{ item }: { item: QoSInterface }">
      <p :class="[...getCellClasses(item)]">{{ item.upload }}</p>
    </template>
    <template #status="{ item }: { item: QoSInterface }">
      <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
        <font-awesome-icon
          :icon="['fas', !item.disabled ? 'circle-check' : 'circle-xmark']"
          :class="[
            'mr-2',
            'h-5',
            'w-5',
            !item.disabled ? 'text-green-600 dark:text-green-400' : ''
          ]"
          aria-hidden="true"
        />
        {{ !item.disabled ? t('common.enabled') : t('common.disabled') }}
      </div>
    </template>
    <template #menu="{ item }: { item: QoSInterface }">
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
