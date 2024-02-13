<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeButton } from '@nethserver/vue-tailwind-lib'
import { NeBadge, NeDropdown } from '@nethesis/vue-components'
import { type PropType } from 'vue'
import NeTable from '@/components/standalone/NeTable.vue'
import { type NatRule } from '@/stores/standalone/firewall'
import { getZoneColorClasses } from '@/lib/standalone/network'

defineProps({
  rules: {
    type: Array as PropType<NatRule[]>,
    required: true
  },
  loading: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['reloadRules', 'editRule', 'deleteRule'])

const { t } = useI18n()

const headers = [
  {
    label: t('standalone.nat.name'),
    key: 'name'
  },
  {
    label: t('standalone.nat.source_address'),
    key: 'src_ip'
  },
  {
    label: t('standalone.nat.outbound_zone'),
    key: 'src'
  },
  {
    label: t('standalone.nat.destination_address'),
    key: 'dest_ip'
  },
  {
    label: t('standalone.nat.action'),
    key: 'target'
  },
  {
    label: t('standalone.nat.rewrite_ip'),
    key: 'snat_ip'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(rule: NatRule) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => emit('deleteRule', rule),
      danger: true
    }
  ]
}
</script>

<template>
  <div>
    <NeTable :data="rules" :headers="headers" :loading="loading">
      <template #src="{ item }: { item: NatRule }">
        <span v-if="item.src === '*'">{{ t('common.any') }}</span>
        <NeBadge
          v-else
          :text="item.src.toUpperCase()"
          kind="custom"
          :customColorClasses="getZoneColorClasses(item.src)"
        />
      </template>
      <template #target="{ item }: { item: NatRule }">
        {{ t(`standalone.nat.action_${item.target.toLowerCase()}`) }}
      </template>
      <template #snat_ip="{ item }: { item: NatRule }">
        <span v-if="item.snat_ip">{{ item.snat_ip }}</span>
        <span v-else> - </span>
      </template>
      <template #menu="{ item }: { item: NatRule }">
        <div class="align-center flex justify-end">
          <NeButton kind="tertiary" size="lg" @click="emit('editRule', item)" class="mr-2">
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
