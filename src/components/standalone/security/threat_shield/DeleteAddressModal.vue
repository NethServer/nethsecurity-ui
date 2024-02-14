<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeInlineNotification } from '@nethesis/vue-components'
import { NeModal, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import type { AllowlistAddress } from './AllowlistTab.vue'

const props = defineProps<{
  visible: boolean
  itemToDelete?: AllowlistAddress
}>()

const emit = defineEmits(['close', 'address-deleted'])

const { t } = useI18n()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteAddress() {
  if (props.itemToDelete) {
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    isDeleting.value = true
    try {
      await ubusCall('ns.threatshield', 'delete-allowed', {
        address: props.itemToDelete.address
      })
      emit('address-deleted')
      close()
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
    primaryButtonKind="danger"
    :title="t('standalone.threat_shield.delete_address')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    @primaryClick="deleteAddress()"
    @close="close()"
  >
    {{
      t('standalone.threat_shield.delete_address_message', {
        address: itemToDelete?.address ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_address')"
      :description="error.notificationDescription"
      class="my-2"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
