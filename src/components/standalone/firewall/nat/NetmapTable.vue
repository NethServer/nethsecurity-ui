<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeButton } from '@nethesis/vue-components'
import { NeDropdown } from '@nethesis/vue-components'
import { computed, type PropType } from 'vue'
import NeTable from '@/components/standalone/NeTable.vue'
import { type NetmapRule } from '@/stores/standalone/firewall'

const props = defineProps({
  rules: {
    type: Array as PropType<NetmapRule[]>,
    required: true
  },
  netmapType: {
    type: String as PropType<'src' | 'dest'>,
    required: true
  },
  loading: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['reloadRules', 'editRule', 'deleteRule'])

const { t } = useI18n()

const nameHeader = {
  label: t('common.name'),
  key: 'name'
}

const srcHeader = {
  label: t('standalone.netmap.source_network'),
  key: 'src'
}

const destHeader = {
  label: t('standalone.netmap.destination_network'),
  key: 'dest'
}

const mapFromHeader = {
  label:
    props.netmapType === 'src'
      ? t('standalone.netmap.source_network')
      : t('standalone.netmap.destination_network'),
  key: 'map_from'
}

const mapToHeader = {
  label: t('standalone.netmap.mapped_network'),
  key: 'map_to'
}

const menuHeader = {
  label: '',
  key: 'menu'
}

const headers = computed(() => {
  if (props.netmapType === 'src') {
    return [nameHeader, destHeader, mapFromHeader, mapToHeader, menuHeader]
  } else {
    return [nameHeader, srcHeader, mapFromHeader, mapToHeader, menuHeader]
  }
})

function getDropdownItems(rule: NetmapRule) {
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
    <p
      class="z-0 -mb-1 table max-w-md rounded-se-md rounded-ss-md bg-indigo-300 p-2 text-sm dark:bg-indigo-800"
    >
      {{
        netmapType === 'src'
          ? t('standalone.netmap.source_netmap')
          : t('standalone.netmap.destination_netmap')
      }}
    </p>
    <NeTable :data="rules" :headers="headers" :loading="loading">
      <template #menu="{ item }: { item: NetmapRule }">
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
