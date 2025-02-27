<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConntrackRecord } from './ConntrackContent.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  itemToDelete?: ConntrackRecord
}>()

const emit = defineEmits(['close', 'record-deleted'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteConntrackRecord() {
  error.value = {
    notificationDescription: '',
    notificationDetails: ''
  }
  isDeleting.value = true
  try {
    if (props.itemToDelete !== undefined) {
      await ubusCall('ns.conntrack', 'drop', {
        id: props.itemToDelete.id
      })
    } else {
      await ubusCall('ns.conntrack', 'drop_all', {})
    }
    emit('record-deleted')
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isDeleting.value = false
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
    :title="t('standalone.conntrack.delete_conntrack_record')"
    :primary-label="t('common.delete')"
    :secondary-label="t('common.cancel')"
    primary-button-kind="danger"
    secondary-button-kind="tertiary"
    :primary-button-disabled="isDeleting"
    :primary-button-loading="isDeleting"
    :close-aria-label="t('common.close')"
    @primary-click="deleteConntrackRecord()"
    @close="close()"
    @secondary-click="close()"
  >
    <span v-if="itemToDelete !== undefined">
      {{
        t('standalone.conntrack.delete_conntrack_record_message', {
          source: itemToDelete?.destination + ':' + itemToDelete?.destination_port || '',
          destination: itemToDelete?.source + ':' + itemToDelete?.source_port || ''
        })
      }}
    </span>
    <span v-else>
      {{ t('standalone.conntrack.delete_all_record_message') }}
    </span>
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_conntrack_record')"
      :description="error.notificationDescription"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
