<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getFirewallZone } from '@/lib/standalone/network'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { NeModal, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
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
  },
  firewallConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'aliasDeleted'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let loading = ref({
  deleteAlias: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      clearErrors()
    }
  }
)

function clearErrors() {
  for (const [key, value] of Object.entries(error.value) as [string, any][]) {
    if (typeof value === 'string') {
      // @ts-ignore
      error.value[key] = ''
    } else if (Array.isArray(value)) {
      // @ts-ignore
      error.value[key] = []
    }
  }
}

function closeModal() {
  emit('close')
}

async function deleteNetworkInterface() {
  await ubusCall('uci', 'delete', {
    config: 'network',
    options: null,
    section: props.alias['.name']
  })
}

async function removeInterfaceFromZone() {
  const zone = getFirewallZone(props.parentInterface, props.firewallConfig)
  const sectionName = zone['.name']

  // remove alias from zone interfaces
  const zoneInterfaces = zone.network.filter((iface: any) => iface !== props.alias['.name'])

  await ubusCall('uci', 'set', {
    config: 'firewall',
    section: sectionName,
    values: {
      network: zoneInterfaces
    }
  })
}

async function deleteAlias() {
  loading.value.deleteAlias = true

  try {
    await deleteNetworkInterface()
    await removeInterfaceFromZone()
    emit('aliasDeleted')
    emit('close')
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t(
      'standalone.interfaces_and_devices.cannot_delete_alias_interface'
    )
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
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
    :primaryLabel="t('common.delete')"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonDisabled="loading.deleteAlias"
    :primaryButtonLoading="loading.deleteAlias"
    :closeAriaLabe="t('common.close')"
    @close="closeModal"
    @primaryClick="deleteAlias"
  >
    {{
      t('standalone.interfaces_and_devices.delete_alias_interface_name', { name: alias['.name'] })
    }}
  </NeModal>
</template>
