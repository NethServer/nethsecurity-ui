<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { DpiRule } from '@/lib/standalone/dpi'
import { ubusCall } from '@/lib/standalone/ubus'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  visible: boolean
  rule?: DpiRule
}

const props = defineProps<Props>()

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()

const loading = ref({
  deleteRule: false
})

const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      error.value.notificationTitle = ''
      error.value.notificationDescription = ''
      error.value.notificationDetails = ''
    }
  }
)

async function deleteRule() {
  if (!props.rule) {
    return
  }
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  loading.value.deleteRule = true

  try {
    await ubusCall('ns.dpi', 'delete-rule', {
      'config-name': props.rule['config-name']
    })
    emit('close')
    emit('reloadData')
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_delete_rule')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value.deleteRule = false
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.dpi.delete_rule')"
    kind="warning"
    :primary-label="t('standalone.dpi.delete_rule')"
    :cancel-label="t('common.cancel')"
    primary-button-kind="danger"
    :primary-button-disabled="loading.deleteRule"
    :primary-button-loading="loading.deleteRule"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="deleteRule"
  >
    {{ t('standalone.dpi.confirm_delete_rule', { iface: rule?.interface }) }}
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mt-4"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
