<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PortForward } from '@/views/standalone/firewall/PortForward.vue'
import { toRefs } from 'vue'
import {
  NeDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NeButton
} from '@nethesis/vue-components'
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
    <NeTable
      :ariaLabel="t('standalone.port_forward.port_forwards_for_destination_name', { name: header })"
      cardBreakpoint="xl"
      class="z-10"
    >
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('standalone.port_forward.name') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.port_forward.source_port') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.port_forward.destination_port') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.port_forward.protocols') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.port_forward.wan_ip') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.port_forward.restrict_access_from') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('standalone.port_forward.status') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="item in portForwards" :key="item.id">
          <NeTableCell :data-label="t('standalone.port_forward.name')">
            <p :class="[...getCellClasses(item)]">{{ item.name }}</p>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.port_forward.source_port')">
            <p :class="[...getCellClasses(item)]">
              {{ item.source_port ? item.source_port : t('common.any') }}
              {{ item.source_port_name ? `(${item.source_port_name})` : '' }}
            </p>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.port_forward.destination_port')">
            <p :class="[...getCellClasses(item)]">
              {{ item.destination_port ? item.destination_port : t('common.any') }}
            </p>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.port_forward.protocols')">
            <p :class="[...getCellClasses(item), 'uppercase']">
              {{ item.protocol.slice(0, 3).join(', ')
              }}<span v-if="item.protocol.length > 3">...</span>
            </p>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.port_forward.wan_ip')">
            <p :class="[...getCellClasses(item)]">
              {{ item.wan === 'any' ? t('common.any') : item.wan }}
            </p>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.port_forward.restrict_access_from')">
            <template v-if="item.ns_src">
              <ObjectTooltip :object-id="item.ns_src" />
            </template>
            <template v-else-if="item.restrict.length > 0">
              <p :class="[...getCellClasses(item)]">
                {{ item.restrict.slice(0, 2).join(', ')
                }}<span v-if="item.restrict.length > 2">...</span>
              </p>
            </template>
            <p :class="[...getCellClasses(item)]" v-else>-</p>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.port_forward.status')">
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
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
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
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
    </NeTable>
  </div>
</template>
