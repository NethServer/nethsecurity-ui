<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watchEffect } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus.ts'

const { t } = useI18n()

const { ipToDelete } = defineProps<{
  ipToDelete?: string
}>()

const shallowIpToDelete = ref<typeof ipToDelete>()
watchEffect(() => {
  if (ipToDelete != undefined) {
    shallowIpToDelete.value = ipToDelete
  }
})

const emit = defineEmits(['success', 'close'])

const deleting = ref(false)
const error = ref<Error>()

function handleClose() {
  if (!deleting.value) {
    emit('close')
  }
}

function unbanIp() {
  deleting.value = true
  error.value = undefined
  ubusCall('ns.threatshield', 'remove-active-block', {
    ip: ipToDelete
  })
    .then(() => {
      emit('success')
    })
    .catch((reason) => {
      error.value = reason
    })
    .finally(() => {
      deleting.value = false
    })
}
</script>

<template>
  <NeModal
    kind="warning"
    :visible="ipToDelete != undefined"
    :close-aria-label="t('common.cancel')"
    :cancel-label="t('common.cancel')"
    :primary-button-loading="deleting"
    :primary-button-disabled="deleting"
    :primary-label="t('standalone.threat_shield.unban')"
    :title="t('standalone.threat_shield.unban_ip_modal_title')"
    @close="handleClose"
    @primary-click="unbanIp"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="error"
        kind="error"
        :title="t('standalone.threat_shield.cannot_unban_ip')"
        :description="t(getAxiosErrorMessage(error))"
        :close-aria-label="t('common.close')"
      />
      <p>
        {{ t('standalone.threat_shield.unban_ip_modal_description', { ip: shallowIpToDelete }) }}
      </p>
    </div>
  </NeModal>
</template>
