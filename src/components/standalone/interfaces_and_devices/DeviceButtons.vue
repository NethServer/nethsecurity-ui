<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import {
  type DeviceOrIface,
  getInterface,
  isBond,
  isVlan,
  isConfiguredBond,
  isBridge,
  isUnconfiguredBond,
  getAliasInterface,
  getFirewallZone
} from '@/lib/standalone/network'
import type { PropType } from 'vue'
import { NeDropdown, NeButton } from '@nethesis/vue-components'

const { t } = useI18n()

const props = defineProps({
  deviceOrIface: {
    type: Object as PropType<DeviceOrIface>,
    required: true
  },
  networkConfig: {
    type: Object,
    required: true
  },
  firewallConfig: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'showConfigureDeviceDrawer',
  'configureBond',
  'showCreateAliasInterfaceDrawer',
  'showUnconfigureDeviceModal',
  'showDeleteBondModal',
  'showDeleteDeviceModal'
])

function getConfiguredDeviceKebabMenuItems(device: DeviceOrIface) {
  const iface = getInterface(device)

  return [
    {
      id: 'createAliasInterface',
      label: t('standalone.interfaces_and_devices.create_alias_interface'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => emit('showCreateAliasInterfaceDrawer', device),
      disabled:
        !iface ||
        !!getAliasInterface(device, props.networkConfig) ||
        !getFirewallZone(iface, props.firewallConfig)
    },
    {
      id: 'removeConfiguration',
      label: isBridge(device)
        ? t('standalone.interfaces_and_devices.delete_interface')
        : t('standalone.interfaces_and_devices.remove_configuration'),
      icon: 'circle-minus',
      iconStyle: 'fas',
      action: () => emit('showUnconfigureDeviceModal', device),
      danger: true,
      disabled: !iface
    }
  ]
}

function getUnconfiguredVlanKebabMenuItems(device: DeviceOrIface) {
  return [
    {
      id: 'deleteDevice',
      label: t('standalone.interfaces_and_devices.delete_device'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => emit('showDeleteDeviceModal', device),
      danger: true
    }
  ]
}
</script>

<template>
  <!-- reconfigure button -->
  <NeButton
    v-if="getInterface(deviceOrIface) && !isBond(deviceOrIface)"
    kind="tertiary"
    size="lg"
    @click="emit('showConfigureDeviceDrawer', deviceOrIface)"
  >
    <template #prefix>
      <font-awesome-icon :icon="['fas', 'pen-to-square']" class="h-4 w-4" aria-hidden="true" />
    </template>
    {{ t('common.edit') }}
  </NeButton>
  <!-- configure button for unconfigured bonds -->
  <NeButton
    v-else-if="isUnconfiguredBond(deviceOrIface)"
    kind="secondary"
    size="lg"
    @click="emit('configureBond', deviceOrIface)"
  >
    <template #prefix>
      <font-awesome-icon :icon="['fas', 'wrench']" class="h-4 w-4" aria-hidden="true" />
    </template>
    {{ t('standalone.interfaces_and_devices.configure_bond') }}
  </NeButton>
  <!-- configure button for non-bond unconfigured devices -->
  <NeButton
    v-else-if="!isBond(deviceOrIface)"
    kind="secondary"
    size="lg"
    @click="emit('showConfigureDeviceDrawer', deviceOrIface)"
  >
    <template #prefix>
      <font-awesome-icon :icon="['fas', 'wrench']" class="h-4 w-4" aria-hidden="true" />
    </template>
    {{ t('standalone.interfaces_and_devices.configure') }}
  </NeButton>
  <NeDropdown
    v-if="
      (getInterface(deviceOrIface) && !isBond(deviceOrIface)) || isConfiguredBond(deviceOrIface)
    "
    :items="getConfiguredDeviceKebabMenuItems(deviceOrIface)"
    :alignToRight="true"
  />
  <NeDropdown
    v-if="isUnconfiguredBond(deviceOrIface)"
    :items="[
      {
        id: 'deleteBond',
        label: t('standalone.interfaces_and_devices.delete_bond'),
        icon: 'trash',
        iconStyle: 'fas',
        action: () => emit('showDeleteBondModal', deviceOrIface),
        danger: true
      }
    ]"
    :alignToRight="true"
  />
  <!-- actions for unconfigured vlan devices -->
  <NeDropdown
    v-else-if="isVlan(deviceOrIface) && !getInterface(deviceOrIface)"
    :items="getUnconfiguredVlanKebabMenuItems(deviceOrIface)"
    :alignToRight="true"
  />
</template>
