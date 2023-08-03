<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getAliasInterface, getFirewallZone, getInterface, isVlan } from '@/lib/standalone/network'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { NeModal, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: { type: Boolean, default: false },
  device: {
    type: Object,
    required: true
  },
  firewallConfig: {
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
  unconfigureDevice: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

const iface = computed(() => {
  return getInterface(props.device, props.networkConfig)
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

async function deleteNetworkInterface(ifaceName: string) {
  await ubusCall('uci', 'delete', {
    config: 'network',
    options: null,
    section: ifaceName
  })
}

async function deleteNetworkDevice() {
  const sectionFound = props.networkConfig.device.find((dev: any) => dev.name === props.device.name)

  await ubusCall('uci', 'delete', {
    config: 'network',
    options: null,
    section: sectionFound['.name']
  })
}

async function removeInterfaceFromZone() {
  const zone = getFirewallZone(iface.value, props.firewallConfig)
  const sectionName = zone['.name']

  let zoneInterfaces = zone.network.filter((elem: any) => elem !== iface.value['.name'])

  // if interface has an alias, delete it too
  const aliasFound = getAliasInterface(props.device, props.networkConfig)
  if (aliasFound) {
    zoneInterfaces = zoneInterfaces.filter((elem: any) => elem !== aliasFound['.name'])
  }

  await ubusCall('uci', 'set', {
    config: 'firewall',
    section: sectionName,
    values: {
      network: zoneInterfaces
    }
  })
}

async function unconfigureDevice() {
  loading.value.unconfigureDevice = true

  try {
    await removeInterfaceFromZone()
    await deleteNetworkInterface(iface.value['.name'])

    const aliasFound = getAliasInterface(props.device, props.networkConfig)
    if (aliasFound) {
      // delete alias interface too
      await deleteNetworkInterface(aliasFound['.name'])
    }

    // delete device if it's a physical one //// TODO what about bond/bridges?
    if (!isVlan(props.device)) {
      await deleteNetworkDevice()
    }
    emit('reloadData')
    emit('close')
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t(
      'standalone.interfaces_and_devices.cannot_delete_alias_interface'
    )
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.unconfigureDevice = false
    await uciChangesStore.getChanges()
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.interfaces_and_devices.remove_configuration')"
    kind="warning"
    :primaryLabel="t('standalone.interfaces_and_devices.remove_configuration')"
    :cancelLabel="t('common.cancel')"
    primaryButtonKind="danger"
    :primaryButtonDisabled="loading.unconfigureDevice"
    :primaryButtonLoading="loading.unconfigureDevice"
    :closeAriaLabe="t('common.close')"
    @close="closeModal"
    @primaryClick="unconfigureDevice"
  >
    <div>
      {{
        t('standalone.interfaces_and_devices.remove_configuration_explanation', {
          name: device.name
        })
      }}
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
