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
import type { StaticLease } from './StaticLeases.vue'
import CannotDeleteObjectModal from '../users_objects/CannotDeleteObjectModal.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  itemToDelete?: StaticLease
}>()

const emit = defineEmits(['close', 'lease-deleted'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteStaticLease() {
  if (props.itemToDelete) {
    error.value = {
      notificationDescription: '',
      notificationDetails: ''
    }
    isDeleting.value = true
    try {
      await ubusCall('ns.dhcp', 'delete-static-lease', {
        lease: props.itemToDelete.lease
      })
      emit('lease-deleted')
      emit('close')
    } catch (err: any) {
      error.value.notificationDescription =
        err.response.data.message == 'lease_not_found'
          ? t('standalone.dns_dhcp.lease_not_found')
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
  <div>
    <!-- cannot delete object modal -->
    <CannotDeleteObjectModal
      v-if="itemToDelete?.used"
      :visible="visible"
      :objectName="itemToDelete?.hostname"
      :usageIds="itemToDelete?.matches"
      :showGoToObjectsButton="true"
      @close="close"
    />
    <!-- delete static lease modal -->
    <NeModal
      v-else
      :visible="visible"
      kind="warning"
      :title="t('standalone.dns_dhcp.delete_reservation')"
      :primaryLabel="t('common.delete')"
      primaryButtonKind="danger"
      :primaryButtonDisabled="isDeleting"
      :primaryButtonLoading="isDeleting"
      :close-aria-label="t('common.close')"
      @primaryClick="deleteStaticLease()"
      @close="close()"
    >
      {{
        t('standalone.dns_dhcp.delete_reservation_message', {
          hostname: itemToDelete?.hostname ?? ''
        })
      }}
      <NeInlineNotification
        v-if="error.notificationDescription"
        kind="error"
        :title="t('error.cannot_delete_reservation')"
        :description="error.notificationDescription"
      >
        <template #details v-if="error.notificationDetails">
          {{ error.notificationDetails }}
        </template></NeInlineNotification
      >
    </NeModal>
  </div>
</template>
