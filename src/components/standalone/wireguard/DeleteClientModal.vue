<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ClientTunnel } from '@/components/standalone/wireguard/WireguardPeerTunnelList.vue'
import { ref, watchEffect } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { NeModal } from '@nethesis/vue-components'

const { t } = useI18n()
const { tunnel = undefined } = defineProps<{
  tunnel?: ClientTunnel
}>()

const emit = defineEmits(['success', 'close'])

const _internalTunnel = ref<ClientTunnel>()
const loading = ref(false)
const error = ref<Error>()

watchEffect(() => {
  if (tunnel != undefined) {
    loading.value = false
    error.value = undefined
    _internalTunnel.value = tunnel
  }
})

function deleteTunnel() {
  error.value = undefined
  loading.value = true
  ubusCall('ns.wireguard', 'delete-tunnel', {
    id: _internalTunnel.value!.id
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
    :title="t('standalone.wireguard_peers.delete_peer_title')"
    :visible="tunnel != undefined"
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
    {{ t('standalone.wireguard_peers.delete_peer_confirm', { name: _internalTunnel?.name }) }}
  </NeModal>
</template>
