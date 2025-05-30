<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import type { Certificate } from '@/views/standalone/system/CertificatesView.vue'

const props = defineProps<{
  visible: boolean
  itemToDelete?: Certificate
}>()

const emit = defineEmits(['close', 'certificate-deleted'])

const { t } = useI18n()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteCertificate() {
  if (props.itemToDelete) {
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    isDeleting.value = true
    try {
      await ubusCall('ns.reverseproxy', 'delete-certificate', {
        name: props.itemToDelete.name
      })
      emit('certificate-deleted')
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
    primary-button-kind="danger"
    :title="t('standalone.certificates.delete_certificate')"
    :primary-label="t('common.delete')"
    :primary-button-disabled="isDeleting"
    :primary-button-loading="isDeleting"
    :close-aria-label="t('common.close')"
    @primary-click="deleteCertificate()"
    @close="close()"
  >
    {{
      t('standalone.certificates.delete_certificate_message', {
        certificate: itemToDelete?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_certificate')"
      :description="error.notificationDescription"
      class="my-2"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
