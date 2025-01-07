<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import type { UserDatabase } from '@/views/standalone/users_objects/UsersDatabaseView.vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'

const props = defineProps<{
  visible: boolean
  itemToDelete: UserDatabase
}>()

const emit = defineEmits(['close', 'database-deleted'])

const { t } = useI18n()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteDatabase() {
  try {
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    isDeleting.value = true
    await ubusCall('ns.users', 'delete-ldap-database', { name: props.itemToDelete.name })
    emit('database-deleted')
    emit('close')
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isDeleting.value = false
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
    :title="t('standalone.users_database.delete_database')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting || itemToDelete.used"
    :primaryButtonLoading="isDeleting"
    :close-aria-label="t('common.close')"
    @primaryClick="deleteDatabase()"
    @close="close()"
    :cancel-label="itemToDelete.used ? t('common.cancel') : t('common.close')"
  >
    <p v-if="itemToDelete.used">
      {{ t('standalone.users_database.database_in_use') }}
    </p>
    <p v-else>
      {{
        t('standalone.users_database.delete_database_message', {
          name: itemToDelete.name
        })
      }}
    </p>
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_database')"
      :description="error.notificationDescription"
      class="my-2"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
