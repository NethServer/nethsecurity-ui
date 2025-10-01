<script lang="ts" setup>
import type { Peer } from '@/views/standalone/vpn/WireguardTunnelView.vue'
import {
  humanDistanceToNowLoc,
  NeButton,
  NeDropdown,
  type NeDropdownItem,
  NeTableCell,
  NeTableRow,
  NeTooltip
} from '@nethesis/vue-components'
import {
  faCircleArrowDown,
  faCircleCheck,
  faCircleXmark,
  faPenToSquare,
  faQrcode,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'
import { useQRCode } from '@vueuse/integrations/useQRCode'

const { t } = useI18n()

const { peer } = defineProps<{
  peer: Peer
}>()

const emit = defineEmits<{
  edit: [item: Peer]
  delete: [item: Peer]
}>()

const qrCode = useQRCode(peer.config)

function downloadConfig() {
  const blob = new Blob([peer.config], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${peer.name}.conf`
  link.click()
  URL.revokeObjectURL(url)
}

function downloadQrCode() {
  const link = document.createElement('a')
  link.href = qrCode.value
  link.download = `${peer.name}.png`
  link.click()
  URL.revokeObjectURL(qrCode.value)
}

const peerActions: NeDropdownItem[] = [
  {
    id: 'download-config',
    label: t('standalone.wireguard_tunnel.download_configuration'),
    icon: faCircleArrowDown,
    action: () => downloadConfig()
  },
  {
    id: 'download-qr',
    label: t('standalone.wireguard_tunnel.download_qr_code'),
    icon: faQrcode,
    action: () => downloadQrCode()
  },
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
      {{ peer.name }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.wireguard_tunnel.reserved_ip')">
      {{ peer.reserved_ip }}
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.wireguard_tunnel.server_networks')">
      <template v-if="peer.route_all_traffic">
        {{ t('standalone.wireguard_tunnel.all_traffic') }}
      </template>
      <template v-else-if="peer.local_networks.length > 0">
        {{ peer.local_networks.join(', ') }}
      </template>
      <template v-else> - </template>
    </NeTableCell>
    <NeTableCell :data-label="t('standalone.wireguard_tunnel.peer_networks')">
      <template v-if="peer.remote_networks.length > 0">
        {{ peer.remote_networks.join(', ') }}
      </template>
      <template v-else> - </template>
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
    <NeTableCell :data-label="t('standalone.wireguard_tunnel.connection')">
      <div class="flex items-center gap-2">
        <template v-if="peer.active">
          <FontAwesomeIcon :icon="faCircleCheck" class="size-4 text-enabled" />
          {{ t('common.connected') }}
        </template>
        <template v-else>
          <FontAwesomeIcon :icon="faCircleXmark" class="size-4 text-disabled" />
          {{ t('common.not_connected') }}
        </template>
        <template v-if="peer.latest_handshake != undefined">
          <NeTooltip>
            <template #content>
              {{
                t('standalone.wireguard_tunnel.latest_handshake', {
                  time: humanDistanceToNowLoc(new Date(peer.latest_handshake))
                })
              }}
            </template>
          </NeTooltip>
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
