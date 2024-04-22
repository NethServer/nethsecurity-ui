<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  alias: {
    type: Object,
    required: true
  },
  parentInterface: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let loading = ref({
  deleteAlias: false
})

let error = ref({
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
    }
  }
)

function closeModal() {
  emit('close')
}

async function deleteAlias() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  loading.value.deleteAlias = true

  try {
    await ubusCall('ns.devices', 'delete-alias-interface', {
      alias_iface_name: props.alias['.name'],
      parent_iface_name: props.parentInterface['.name']
    })
    emit('reloadData')
    emit('close')
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t(
      'standalone.interfaces_and_devices.cannot_delete_alias_interface'
    )
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value.deleteAlias = false
    await uciChangesStore.getChanges()
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.interfaces_and_devices.delete_alias')"
    kind="warning"
    :primaryLabel="t('standalone.interfaces_and_devices.delete_alias')"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonDisabled="loading.deleteAlias"
    :primaryButtonLoading="loading.deleteAlias"
    :closeAriaLabel="t('common.close')"
    @close="closeModal"
    @primaryClick="deleteAlias"
  >
    <div>
      {{
        t('standalone.interfaces_and_devices.delete_alias_interface_name', { name: alias['.name'] })
      }}
    </div>
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mt-4"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
