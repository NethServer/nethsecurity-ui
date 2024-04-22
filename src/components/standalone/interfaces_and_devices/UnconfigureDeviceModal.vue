<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getInterface, isBridge, isBond } from '@/lib/standalone/network'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  device: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let loading = ref({
  unconfigureDevice: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

const iface = computed(() => {
  return getInterface(props.device)
})

function closeModal() {
  emit('close')
}

async function unconfigureDevice() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  loading.value.unconfigureDevice = true

  try {
    await ubusCall('ns.devices', 'unconfigure-device', { iface_name: iface.value['.name'] })
    emit('reloadData')
    emit('close')
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t(
      'standalone.interfaces_and_devices.cannot_remove_device_configuration'
    )
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value.unconfigureDevice = false
    await uciChangesStore.getChanges()
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="
      isBridge(device)
        ? t('standalone.interfaces_and_devices.delete_interface')
        : t('standalone.interfaces_and_devices.remove_configuration')
    "
    kind="warning"
    :primaryLabel="
      isBridge(device)
        ? t('standalone.interfaces_and_devices.delete_interface')
        : t('standalone.interfaces_and_devices.remove_configuration')
    "
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonDisabled="loading.unconfigureDevice"
    :primaryButtonLoading="loading.unconfigureDevice"
    :closeAriaLabel="t('common.close')"
    @close="closeModal"
    @primaryClick="unconfigureDevice"
  >
    <div v-if="device && iface">
      <template v-if="isBridge(device)">
        <!-- bridge -->
        {{
          t('standalone.interfaces_and_devices.delete_bridge_explanation', {
            iface: iface['.name'],
            device: device.name
          })
        }}
      </template>
      <template v-else-if="isBond(device)">
        <!-- bond -->
        {{
          t('standalone.interfaces_and_devices.delete_bond_explanation', {
            iface: iface['.name']
          })
        }}
      </template>
      <template v-else>
        <!-- physical interfaces and VLAN -->
        {{
          t('standalone.interfaces_and_devices.remove_configuration_explanation', {
            iface: iface['.name'],
            device: device.name
          })
        }}
      </template>
    </div>
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
