<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import type { ReverseProxy } from '@/views/standalone/network/ReverseProxyView.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  itemToDelete: ReverseProxy | null
}>()

const emit = defineEmits(['close', 'proxy-deleted'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteProxy() {
  if (props.itemToDelete) {
    try {
      error.value = {
        notificationDescription: '',
        notificationDetails: ''
      }
      isDeleting.value = true
      await ubusCall('ns.reverseproxy', 'delete-proxy', { id: props.itemToDelete.id })
      emit('proxy-deleted')
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
  error.value = {
    notificationDescription: '',
    notificationDetails: ''
  }
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('standalone.reverse_proxy.delete_proxy')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    :close-aria-label="t('common.close')"
    @primaryClick="deleteProxy()"
    @close="close()"
  >
    {{
      t('standalone.reverse_proxy.delete_proxy_message', {
        path: itemToDelete?.domain ?? itemToDelete?.path ?? itemToDelete?.location ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_proxy')"
      :description="error.notificationDescription"
      class="my-2"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
