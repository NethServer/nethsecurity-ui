<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { useAccountsStore, type ControllerAccount } from '@/stores/controller/accounts'

const props = defineProps<{
  visible: boolean
  itemToDelete?: ControllerAccount
}>()

const emit = defineEmits(['close', 'user-deleted'])
const accountsStore = useAccountsStore()

const { t } = useI18n()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteUser() {
  if (props.itemToDelete) {
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    isDeleting.value = true
    try {
      await accountsStore.deleteAccount(props.itemToDelete.id)
      emit('user-deleted')
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
    :title="t('controller.users.delete_user')"
    :primary-label="t('common.delete')"
    :primary-button-disabled="isDeleting"
    :primary-button-loading="isDeleting"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @primary-click="deleteUser()"
    @close="close()"
  >
    {{
      t('controller.users.delete_user_message', {
        name: itemToDelete?.username ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_user')"
      :description="error.notificationDescription"
      class="my-2"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
