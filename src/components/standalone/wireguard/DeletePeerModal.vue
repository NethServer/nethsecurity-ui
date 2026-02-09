<script lang="ts" setup>
import type { Peer } from '@/views/standalone/vpn/WireguardTunnelView.vue'
import { NeModal } from '@nethesis/vue-components'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { peer = undefined } = defineProps<{
  peer?: Peer
}>()

const emit = defineEmits(['success', 'close'])

const _internalPeer = ref<Peer>()
const loading = ref(false)
const error = ref<Error>()

watchEffect(() => {
  if (peer != undefined) {
    _internalPeer.value = peer
    loading.value = false
  }
})

function deleteTunnel() {
  error.value = undefined
  loading.value = true
  ubusCall('ns.wireguard', 'delete-peer', {
    id: _internalPeer.value!.id
  })
    .then(() => emit('success'))
    .catch((err) => {
      error.value = err
      loading.value = false
    })
}
</script>

<template>
  <NeModal
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :primary-label="t('common.delete')"
    :title="t('standalone.wireguard_tunnel.delete_peer_title')"
    :visible="peer != undefined"
    kind="warning"
    primary-button-kind="danger"
    @close="
      () => {
        if (!loading) {
          emit('close')
        }
      }
    "
    @primary-click="deleteTunnel"
  >
    {{ t('standalone.wireguard_tunnel.delete_peer_confirm', { name: _internalPeer?.name }) }}
  </NeModal>
</template>
