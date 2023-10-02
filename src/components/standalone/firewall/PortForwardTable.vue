<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PortForward } from '@/views/standalone/firewall/PortForward.vue'
import type { PropType } from 'vue'
import { toRefs } from 'vue'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeButton } from '@nethserver/vue-tailwind-lib'

const { t } = useI18n()

const props = defineProps({
  portForwards: {
    type: Object as PropType<PortForward[]>,
    required: true
  },
  header: {
    type: String,
    required: true
  }
})

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
    label: t('standalone.port_forward.restrict_access_to'),
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
</script>

<template>
  <div>
    <p
      class="z-0 -my-1 table max-w-md rounded-se-md rounded-ss-md bg-indigo-300 p-2 text-sm dark:bg-indigo-800"
    >
      {{ t('standalone.port_forward.destination') }}: <strong>{{ header }}</strong>
    </p>
    <NeTable :data="portForwards" :headers="tableHeaders" class="z-10">
      <template #source_port="{ item }: { item: PortForward }">
        {{ item.source_port }} {{ item.source_port_name ? `(${item.source_port_name})` : '' }}
      </template>
      <template #protocols="{ item }: { item: PortForward }">
        {{ item.protocol.map((prot) => prot.toUpperCase()).join(', ') }}
      </template>
      <template #restrict="{ item }: { item: PortForward }">
        {{ item.restrict.length > 0 ? item.restrict.join(', ') : '-' }}
      </template>
      <template #enabled="{ item }: { item: PortForward }">
        <div class="flex flex-row items-center">
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
          <NeDropdown
            class="item-dropdown"
            :items="getDropdownItems(item)"
            :align-to-right="true"
          />
        </div>
      </template>
    </NeTable>
  </div>
</template>

<style scoped>
.item-dropdown {
  position: static;
}

.item-dropdown:deep(div[role='menu']) {
  right: 10px;
}
</style>
