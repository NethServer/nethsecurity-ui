<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeInlineNotification } from '@nethesis/vue-components'
import { NeModal, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DnsRecord } from './DnsRecords.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  itemToDelete?: DnsRecord
}>()

const emit = defineEmits(['close', 'record-deleted'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteDnsRecord() {
  if (props.itemToDelete) {
    error.value = {
      notificationDescription: '',
      notificationDetails: ''
    }
    isDeleting.value = true
    try {
      await ubusCall('ns.dns', 'delete-record', {
        record: props.itemToDelete.record
      })
      emit('record-deleted')
      emit('close')
    } catch (err: any) {
      error.value.notificationDescription =
        err.response.data.message == 'record_not_found'
          ? t('standalone.dns_dhcp.record_not_found')
          : t(getAxiosErrorMessage(err))
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
    :title="t('standalone.dns_dhcp.delete_dns_record')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    @primaryClick="deleteDnsRecord()"
    @close="close()"
  >
    {{
      t('standalone.dns_dhcp.delete_dns_record_message', {
        name: itemToDelete?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_dns_record')"
      :description="error.notificationDescription"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
