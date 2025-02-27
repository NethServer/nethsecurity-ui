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
import type { RWAccount } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import CannotDeleteObjectModal from '../users_objects/CannotDeleteObjectModal.vue'

const props = defineProps<{
  visible: boolean
  instanceName: string
  account?: RWAccount
}>()

const emit = defineEmits(['close', 'account-deleted'])

const { t } = useI18n()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteAccount() {
  if (props.account) {
    try {
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
      isDeleting.value = true
      await ubusCall('ns.ovpnrw', 'delete-user', {
        instance: props.instanceName,
        username: props.account.name
      })
      emit('account-deleted')
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
  <div>
    <!-- cannot delete object modal -->
    <CannotDeleteObjectModal
      v-if="account?.used"
      :visible="visible"
      :object-name="account?.name"
      :usage-ids="account?.matches"
      :show-go-to-objects-button="true"
      @close="close"
    />
    <!-- delete rw account modal -->
    <NeModal
      v-else
      :visible="visible"
      kind="warning"
      :title="t('standalone.openvpn_rw.delete_account')"
      :primary-label="t('common.delete')"
      :primary-button-disabled="isDeleting"
      :primary-button-loading="isDeleting"
      primary-button-kind="danger"
      :close-aria-label="t('common.close')"
      @primary-click="deleteAccount()"
      @close="close()"
    >
      {{ t('standalone.openvpn_rw.delete_account_message', { name: account?.name }) }}
      <NeInlineNotification
        v-if="error.notificationDescription"
        kind="error"
        :title="t('error.cannot_delete_account')"
        :description="error.notificationDescription"
        class="my-2"
        ><template v-if="error.notificationDetails" #details>
          {{ error.notificationDetails }}
        </template></NeInlineNotification
      >
    </NeModal>
  </div>
</template>
