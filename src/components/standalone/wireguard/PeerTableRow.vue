<script lang="ts" setup>
import type { Peer } from '@/views/standalone/vpn/WireguardTunnelView.vue'
import {
  NeButton,
  NeDropdown,
  type NeDropdownItem,
  NeTableCell,
  NeTableRow
} from '@nethesis/vue-components'
import {
  faCircleCheck,
  faCircleXmark,
  faPenToSquare,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { peer } = defineProps<{
  peer: Peer
}>()

const emit = defineEmits<{
  edit: [item: Peer]
  delete: [item: Peer]
}>()

const peerActions: NeDropdownItem[] = [
  {
    id: 'divider1'
  },
  {
    id: 'delete',
    label: t('standalone.wireguard_tunnel.delete_peer'),
    icon: faTrash,
    danger: true,
    action: () => emit('delete', peer)
  }
]
</script>

<template>
  <NeTableRow>
    <NeTableCell :data-label="t('standalone.wireguard_tunnel.name')">
      <div>{{ peer.name }}</div>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.wireguard_tunnel.reserved_ip')">
      {{ peer.reserved_ip }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.wireguard_tunnel.status')">
      <div class="flex items-center gap-1">
        <template v-if="peer.enabled">
          <FontAwesomeIcon :icon="faCircleCheck" class="size-4 text-enabled" />
          {{ t('common.enabled') }}
        </template>
        <template v-else>
          <FontAwesomeIcon :icon="faCircleXmark" class="size-4 text-disabled" />
          {{ t('common.disabled') }}
        </template>
      </div>
    </NeTableCell>
    <NeTableCell :data-label="t('common.actions')">
      <div class="flex justify-end gap-2">
        <NeButton kind="tertiary" @click="$emit('edit', peer)">
          <template #prefix>
            <FontAwesomeIcon :icon="faPenToSquare" aria-hidden="true" class="size-4" />
          </template>
          {{ t('common.edit') }}
        </NeButton>
        <NeDropdown :items="peerActions" :align-to-right="true" />
      </div>
    </NeTableCell>
  </NeTableRow>
</template>
