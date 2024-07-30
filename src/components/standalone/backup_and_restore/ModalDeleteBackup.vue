<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'

const { t } = useI18n()
const props = defineProps({
  showDeleteModal: {
    type: Boolean,
    required: true
  },
  selectedBackupId: {
    type: String,
    required: true
  },
  selectedBackupLabel: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

let loadingDelete = ref(false)

let objNotification = {
  notificationTitle: '',
  notificationDescription: ''
}

let errorDeleteBackup = ref({ ...objNotification })

async function deleteBackup() {
  try {
    loadingDelete.value = true

    let payload = {}
    let methodCall = 'backup'
    if (props.selectedBackupId) {
      methodCall = 'registered-delete-backup'
      payload = {
        id: props.selectedBackupId
      }
    }

    let res = await ubusCall('ns.backup', methodCall, payload)
    if (res?.data?.result === 'success') {
      emit('close')
    }
  } catch (exception: any) {
    errorDeleteBackup.value.notificationTitle = t('error.cannot_delete_backup')
    errorDeleteBackup.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loadingDelete.value = false
  }
}
</script>

<template>
  <NeModal
    :primary-button-disabled="loadingDelete"
    :primary-button-loading="loadingDelete"
    :primary-label="t('standalone.backup_and_restore.backup.delete')"
    :secondary-button-disabled="loadingDelete"
    :title="t('standalone.backup_and_restore.backup.modal_delete_title')"
    :visible="showDeleteModal"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @close="$emit('close')"
    @primary-click="deleteBackup()"
  >
    <div>
      {{
        t('standalone.backup_and_restore.backup.modal_delete_description', {
          name: selectedBackupLabel
        })
      }}
    </div>
    <NeInlineNotification
      v-if="errorDeleteBackup.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorDeleteBackup.notificationTitle"
      :description="errorDeleteBackup.notificationDescription"
    />
  </NeModal>
</template>
