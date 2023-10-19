<script setup lang="ts">
import { NeModal, NeInlineNotification, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ServerTunnelType } from './ServerTunnel.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  itemToDelete: ServerTunnelType | null
}>()

const emit = defineEmits(['close', 'tunnel-deleted'])

const { visible, itemToDelete } = toRefs(props)
const error = ref('')
const isDeleting = ref(false)

async function deleteTunnel() {
  if (itemToDelete.value) {
    try {
      error.value = ''
      isDeleting.value = true
      //TODO: delete tunnel
      emit('tunnel-deleted')
      emit('close')
    } catch (err: any) {
      error.value = t(getAxiosErrorMessage(err))
    } finally {
      isDeleting.value = false
    }
  }
}

function close() {
  error.value = ''
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.openvpn_tunnel.delete_tunnel')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    @primaryClick="deleteTunnel()"
    @close="close()"
  >
    {{
      t('standalone.openvpn_tunnel.delete_tunnel_message', {
        name: itemToDelete?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('error.cannot_delete_tunnel')"
      :description="error"
    />
  </NeModal>
</template>
