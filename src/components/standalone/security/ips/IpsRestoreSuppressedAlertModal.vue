<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SuppressedAlert } from '@/components/standalone/security/ips/IpsSuppressedAlerts.vue'
import { ref, watchEffect } from 'vue'
import { getAxiosErrorMessage, NeInlineNotification, NeModal } from '@nethesis/vue-components'
import { ubusCall } from '@/lib/standalone/ubus'

const { t } = useI18n()

const { alert } = defineProps<{
  alert?: SuppressedAlert
}>()

const _alert = ref<SuppressedAlert>()
watchEffect(() => {
  if (alert != undefined) {
    _alert.value = alert
  }
})

const emit = defineEmits(['close', 'restored'])
const loading = ref(false)
const error = ref<Error>()

function handleClose() {
  if (!loading.value) {
    emit('close')
  }
}

function deleteAlertSuppression() {
  loading.value = true
  error.value = undefined
  ubusCall('ns.snort', 'delete-suppression', {
    gid: alert!.gid,
    sid: alert!.sid,
    direction: alert!.direction,
    ip: alert!.ip
  })
    .then(() => {
      emit('restored')
    })
    .catch((reason: Error) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<template>
  <NeModal
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    :primary-button-disabled="loading"
    :primary-button-loading="loading"
    :primary-label="t('common.delete')"
    :title="t('standalone.ips.delete_suppressed_alert_modal_title')"
    :visible="alert != undefined"
    kind="warning"
    primary-button-kind="danger"
    @close="handleClose()"
    @primary-click="deleteAlertSuppression()"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="error"
        kind="error"
        :title="t('standalone.ips.delete_suppressed_alert_error')"
        :description="t(getAxiosErrorMessage(error))"
      />
      <p>
        {{
          t('standalone.ips.delete_suppressed_alert_description', {
            id: `${_alert!.gid}:${_alert!.sid}`,
            ip: _alert!.ip,
            direction:
              _alert!.direction == 'by_src'
                ? t('standalone.ips.source')
                : t('standalone.ips.destination')
          })
        }}
      </p>
    </div>
  </NeModal>
</template>
