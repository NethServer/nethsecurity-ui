<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { NeModal, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  device: {
    type: Object,
    required: true
  },
  networkConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let loading = ref({
  deleteDevice: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: ''
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

async function deleteNetworkDevice() {
  console.log('deleteNetworkDevice', props.device) ////

  const sectionFound = props.networkConfig.device.find((dev: any) => dev.name === props.device.name)

  await ubusCall('uci', 'delete', {
    config: 'network',
    options: null,
    section: sectionFound['.name']
  })
}

async function deleteDevice() {
  loading.value.deleteDevice = true

  try {
    await deleteNetworkDevice()
    emit('reloadData')
    emit('close')
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('standalone.interfaces_and_devices.cannot_delete_device')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.deleteDevice = false
    await uciChangesStore.getChanges()
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.interfaces_and_devices.delete_device')"
    kind="warning"
    :primaryLabel="t('standalone.interfaces_and_devices.delete_device')"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonDisabled="loading.deleteDevice"
    :primaryButtonLoading="loading.deleteDevice"
    :closeAriaLabe="t('common.close')"
    @close="closeModal"
    @primaryClick="deleteDevice"
  >
    <div>
      {{ t('standalone.interfaces_and_devices.delete_device_name', { name: device.name }) }}
    </div>
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mt-4"
    />
  </NeModal>
</template>
