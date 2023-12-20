<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeModal, NeInlineNotification } from '@nethserver/vue-tailwind-lib'

const props = defineProps<{
  visible: boolean
  instanceName?: string
}>()

const emit = defineEmits(['close', 'server-deleted'])

const { t } = useI18n()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteServer() {
  if (props.instanceName) {
    try {
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
      isDeleting.value = true
      await ubusCall('ns.ovpnrw', 'remove-instance', {
        instance: props.instanceName
      })
      emit('server-deleted')
      emit('close')
    } catch (err: any) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    } finally {
      isDeleting.value = false
    }
  }
}

function close() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.openvpn_rw.delete_server_rw')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    @primaryClick="deleteServer()"
    @close="close()"
  >
    {{ t('standalone.openvpn_rw.delete_server_rw_message') }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_server')"
      :description="error.notificationDescription"
      class="my-2"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
