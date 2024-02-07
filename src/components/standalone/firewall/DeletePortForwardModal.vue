<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import type { PortForward } from '@/views/standalone/firewall/PortForward.vue'
import { NeInlineNotification } from '@nethesis/vue-components'
import { NeModal, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  visible: boolean
  itemToDelete: PortForward | null
}>()

const emit = defineEmits(['close', 'port-forward-deleted'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)
const { t } = useI18n()

async function deletePortForward() {
  if (props.itemToDelete) {
    try {
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
      isDeleting.value = true
      await ubusCall('ns.redirects', 'delete-redirect', {
        id: props.itemToDelete.id
      })
      emit('port-forward-deleted')
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
    :title="t('standalone.port_forward.delete_port_forward')"
    :primaryLabel="t('standalone.port_forward.delete_port_forward')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    @primaryClick="deletePortForward()"
    @close="close()"
  >
    {{
      t('standalone.port_forward.delete_port_forward_message', {
        name: itemToDelete?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_port_forward')"
      :description="error.notificationDescription"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
