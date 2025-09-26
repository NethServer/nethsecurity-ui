<script lang="ts" setup>
import type { Tunnel } from '@/views/standalone/vpn/WireguardTunnelView.vue'
import { NeModal } from '@nethesis/vue-components'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { instance = undefined } = defineProps<{
  instance?: Tunnel
}>()

const emit = defineEmits(['success', 'close'])

const _internalInstance = ref<Tunnel>()
const loading = ref(false)
const error = ref<Error>()

watchEffect(() => {
  if (instance != undefined) {
    loading.value = false
    error.value = undefined
    _internalInstance.value = instance
  }
})

function deleteTunnel() {
  error.value = undefined
  loading.value = true
  ubusCall('ns.wireguard', 'delete-server', {
    instance: _internalInstance.value!.id
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
    :close-aria-label="t('common.close')"
    :visible="instance != undefined"
    kind="warning"
    primary-button-kind="danger"
    :primary-label="t('common.delete')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :title="t('standalone.wireguard_tunnel.delete_tunnel_title')"
    :cancel-label="t('common.cancel')"
    @primary-click="deleteTunnel"
    @close="
      () => {
        if (!loading) {
          emit('close')
        }
      }
    "
  >
    {{ t('standalone.wireguard_tunnel.delete_tunnel_confirm', { name: _internalInstance?.name }) }}
  </NeModal>
</template>
