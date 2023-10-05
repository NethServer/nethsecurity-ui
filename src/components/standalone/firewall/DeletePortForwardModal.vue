<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import type { PortForward } from '@/views/standalone/firewall/PortForward.vue'
import { NeModal, NeInlineNotification, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  visible: boolean
  itemToDelete: PortForward | null
}>()

const emit = defineEmits(['close', 'port-forward-deleted'])

const { visible, itemToDelete } = toRefs(props)
const error = ref('')
const isDeleting = ref(false)
const { t } = useI18n()

async function deletePortForward() {
  if (itemToDelete.value) {
    try {
      isDeleting.value = true
      await ubusCall('ns.redirects', 'delete-redirect', {
        id: itemToDelete.value.id
      })
      emit('port-forward-deleted')
      emit('close')
    } catch (err: any) {
      error.value = t(getAxiosErrorMessage(err))
    } finally {
      isDeleting.value = false
    }
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.port_forward.delete_port_forward')"
    :primaryLabel="t('standalone.port_forward.delete_port_forward')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    @primaryClick="deletePortForward()"
    @close="emit('close')"
  >
    {{
      t('standalone.port_forward.delete_port_forward_message', {
        name: itemToDelete?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('error.delete_port_forward_error')"
      :description="error"
    />
  </NeModal>
</template>
