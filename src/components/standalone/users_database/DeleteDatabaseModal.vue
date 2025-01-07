<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import type { UserDatabase } from '@/views/standalone/users_objects/UsersDatabaseView.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'

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

const isUsed = computed((): boolean => {
  return (props.itemToDelete.used?.length ?? 0) > 0
})
</script>

<template>
  <NeModal
    v-if="isUsed"
    :close-aria-label="t('common.close')"
    :primary-label="t('common.close')"
    :title="t('standalone.users_database.cannot_delete_database', { name: itemToDelete.name })"
    :visible="visible"
    kind="warning"
    @close="close()"
    @primary-click="close()"
  >
    <div class="space-y-2">
      <p>
        {{
          t('standalone.users_database.cannot_delete_database_description', {
            name: itemToDelete.name
          })
        }}
      </p>
      <ul class="list-inside list-disc">
        <li v-for="item in itemToDelete.used" :key="item">
          {{ t('standalone.users_database.' + item) }}
        </li>
      </ul>
    </div>
  </NeModal>
  <NeModal
    v-else
    :visible="visible"
    kind="warning"
    :title="t('standalone.users_database.delete_database')"
    :primaryLabel="t('common.delete')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    :close-aria-label="t('common.close')"
    @primaryClick="deleteDatabase()"
    @close="close()"
  >
    {{
      t('standalone.users_database.delete_database_message', {
        name: itemToDelete.name
      })
    }}
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
