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

defineProps({
  showRunBackupModal: {
    type: Boolean,
    required: true
  },
  unitName: {
    type: String
  }
})

const emit = defineEmits(['success', 'close'])
const loading = ref(false)

let objNotification = {
  notificationTitle: '',
  notificationDescription: ''
}

let errorRunBackup = ref({ ...objNotification })

async function runBackup() {
  loading.value = true
  try {
    let res = await ubusCall('ns.backup', 'registered-backup')
    if (res?.data?.message && res?.data?.message === 'success') {
      emit('success')
    }
  } catch (exception: any) {
    errorRunBackup.value.notificationTitle = t('error.cannot_run_backup')
    errorRunBackup.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NeModal
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :primary-label="t('standalone.backup_and_restore.backup.run_backup')"
    :secondary-button-disabled="loading"
    :title="t('standalone.backup_and_restore.backup.run_backup')"
    :visible="showRunBackupModal"
    kind="info"
    primary-button-kind="primary"
    :close-aria-label="t('common.close')"
    @close="$emit('close')"
    @primary-click="runBackup()"
  >
    <div>
      {{ t('standalone.backup_and_restore.backup.run_backup_description', { name: unitName }) }}
    </div>
    <NeInlineNotification
      v-if="errorRunBackup.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorRunBackup.notificationTitle"
      :description="errorRunBackup.notificationDescription"
    />
  </NeModal>
</template>
