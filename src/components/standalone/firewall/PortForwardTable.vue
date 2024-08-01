<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PortForward } from '@/views/standalone/firewall/PortForward.vue'
import { toRefs } from 'vue'
import NeTable from '../NeTable.vue'
import { NeDropdown } from '@nethesis/vue-components'
import { NeButton } from '@nethesis/vue-components'
import ObjectTooltip from '@/components/standalone/users_objects/ObjectTooltip.vue'

const { t } = useI18n()

const props = defineProps<{
  portForwards: PortForward[]
  header: string
}>()

const { portForwards, header } = toRefs(props)

const emit = defineEmits([
  'port-forward-duplicate',
  'port-forward-toggle-enable',
  'port-forward-delete',
  'port-forward-edit'
])

const tableHeaders = [
  {
    label: t('standalone.port_forward.name'),
    key: 'name'
  },
  {
    label: t('standalone.port_forward.source_port'),
    key: 'source_port'
  },
  {
    label: t('standalone.port_forward.destination_port'),
    key: 'destination_port'
  },
  {
    label: t('standalone.port_forward.protocols'),
    key: 'protocols'
  },
  {
    label: t('standalone.port_forward.wan_ip'),
    key: 'wan'
  },
  {
    label: t('standalone.port_forward.restrict_access_from'),
    key: 'restrict'
  },
  {
    label: t('standalone.port_forward.status'),
    key: 'enabled'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: PortForward) {
  return [
    {
      id: 'enable_disable',
      label: item.enabled
        ? t('standalone.port_forward.disable')
        : t('standalone.port_forward.enable'),
      iconStyle: 'fas',
      icon: item.enabled ? 'circle-xmark' : 'circle-check',
      action: () => {
        emit('port-forward-toggle-enable', item)
      }
    },
    {
      id: 'duplicate',
      label: t('standalone.port_forward.duplicate'),
      iconStyle: 'fas',
      icon: 'clone',
      action: () => {
        emit('port-forward-duplicate', item)
      }
    },
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('port-forward-delete', item)
      }
    }
  ]
}

function getCellClasses(item: PortForward) {
  return !item.enabled ? ['text-gray-400', 'dark:text-gray-700'] : []
}
</script>

<template>
  <div>
    <p
      class="z-0 -my-1 table max-w-md rounded-se-md rounded-ss-md bg-indigo-300 p-2 text-sm dark:bg-indigo-800"
    >
      {{ t('standalone.port_forward.destination') }}: <strong>{{ header }}</strong>
    </p>
    <NeTable :data="portForwards" :headers="tableHeaders" class="z-10">
      <template #name="{ item }: { item: PortForward }">
        <p :class="[...getCellClasses(item)]">{{ item.name }}</p>
      </template>
      <template #source_port="{ item }: { item: PortForward }">
        <p :class="[...getCellClasses(item)]">
          {{ item.source_port ? item.source_port : t('common.any') }}
          {{ item.source_port_name ? `(${item.source_port_name})` : '' }}
        </p>
      </template>
      <template #destination_port="{ item }: { item: PortForward }">
        <p :class="[...getCellClasses(item)]">
          {{ item.destination_port ? item.destination_port : t('common.any') }}
        </p>
      </template>
      <template #protocols="{ item }: { item: PortForward }">
        <p
          v-for="(prot, idx) in item.protocol.slice(0, 2)"
          :key="prot"
          :class="[...getCellClasses(item)]"
        >
          {{ prot.toUpperCase() }}{{ item.protocol.length > 2 && idx == 1 ? '...' : '' }}
        </p>
      </template>
      <template #wan="{ item }: { item: PortForward }">
        <p :class="[...getCellClasses(item)]">
          {{ item.wan === 'any' ? t('common.any') : item.wan }}
        </p>
      </template>
      <template #restrict="{ item }: { item: PortForward }">
        <template v-if="item.ns_src">
          <ObjectTooltip :object-id="item.ns_src" />
        </template>
        <template v-else-if="item.restrict.length > 0">
          <p
            v-for="(restrictIP, idx) in item.restrict.slice(0, 2)"
            :key="restrictIP"
            :class="[...getCellClasses(item)]"
          >
            {{ restrictIP }}{{ item.restrict.length > 2 && idx == 1 ? '...' : '' }}
          </p>
        </template>
        <p :class="[...getCellClasses(item)]" v-else>-</p>
      </template>
      <template #enabled="{ item }: { item: PortForward }">
        <div :class="['flex', 'flex-row', 'items-center', ...getCellClasses(item)]">
          <font-awesome-icon
            :icon="['fas', item.enabled ? 'circle-check' : 'circle-xmark']"
            class="mr-2 h-5 w-5"
            aria-hidden="true"
          />
          <p>
            {{
              item.enabled
                ? t('standalone.port_forward.enabled')
                : t('standalone.port_forward.disabled')
            }}
          </p>
        </div>
      </template>
      <template #menu="{ item }: { item: PortForward }">
        <div class="align-center flex justify-end">
          <NeButton kind="tertiary" @click="emit('port-forward-edit', item)">
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
  </div>
</template>
