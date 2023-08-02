<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getZoneColor, getZoneIcon, getZoneLabel } from '@/lib/standalone/network'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  validateIp4Address,
  validateIp6Address,
  validateIpv4Mtu,
  validateIpv6Mtu,
  validateIpv4SubnetMask,
  validateRequired,
  validateUciName,
  validateHexadecimalString,
  validateHostname
} from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeFormItemLabel,
  NeSideDrawer,
  NeTextInput,
  NeButton,
  NeInlineNotification,
  NeRadioSelection,
  NeCheckbox,
  focusElement,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { isEmpty } from 'lodash'
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
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
  },
  interfaceToEdit: {
    type: Object,
    default: null
  },
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let interfaceName = ref('')
let interfaceNameRef = ref()
let zone = ref('lan')
let protocol = ref('static')
let ipv4Address = ref('')
let ipv4AddressRef = ref()
let ipv4SubnetMask = ref('255.255.255.0')
let ipv4SubnetMaskRef = ref()
let ipv4Gateway = ref('')
let ipv4GatewayRef = ref()
let isIpv6Enabled = ref(false)
let isExpandedAdvancedSettings = ref(false)
let ipv6Address = ref('')
let ipv6AddressRef = ref()
let ipv6Gateway = ref('')
let ipv6GatewayRef = ref()
let ipv4Mtu = ref('')
let ipv4MtuRef = ref()
let ipv6Mtu = ref('')
let ipv6MtuRef = ref()
let dhcpHostnameToSend = ref('deviceHostname')
let dhcpCustomHostname = ref('')
let dhcpCustomHostnameRef = ref()
let dhcpClientId = ref('')
let dhcpClientIdRef = ref()
let dhcpVendorClass = ref('')
let dhcpVendorClassRef = ref()
let pppoeUsername = ref('')
let pppoeUsernameRef = ref()
let pppoePassword = ref('')
let pppoePasswordRef = ref()

let protocolBaseOptions = [
  {
    id: 'static',
    label: t('standalone.interfaces_and_devices.protocol_static')
  },
  {
    id: 'dhcp',
    label: 'DHCP'
  },
  {
    id: 'dhcpv6',
    label: 'DHCPv6'
  }
]

let protocolPppoeOption = {
  id: 'pppoe',
  label: 'PPPoE'
}

const dhcpHostnameToSendOptions = [
  { id: 'deviceHostname', label: t('standalone.interfaces_and_devices.dhcp_hostname_device') },
  {
    id: 'doNotSendHostname',
    label: t('standalone.interfaces_and_devices.dhcp_hostname_do_not_send')
  },
  { id: 'customHostname', label: t('standalone.interfaces_and_devices.dhcp_hostname_custom') }
]

let loading = ref({
  configure: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  interfaceName: '',
  ipv4Address: '',
  ipv4SubnetMask: '',
  ipv4Gateway: '',
  ipv6Address: '',
  ipv6Gateway: '',
  ipv4Mtu: '',
  ipv6Mtu: '',
  dhcpCustomHostname: '',
  dhcpClientId: '',
  dhcpVendorClass: '',
  pppoeUsername: '',
  pppoePassword: ''
})

const zoneOptions = computed(() => {
  const allowedZones = props.firewallConfig.zone.filter(
    (zone: any) => !['openvpnrw', 'dedalo'].includes(zone.name)
  )

  return allowedZones.map((zone: any) => {
    return {
      id: zone.name,
      label: getZoneLabel(zone.name),
      description: getZoneColor(zone.name),
      icon: getZoneIcon(zone.name)
    }
  })
})

const protocolOptions = computed(() => {
  if (zone.value === 'wan') {
    return [...protocolBaseOptions, protocolPppoeOption]
  } else {
    return protocolBaseOptions
  }
})

// returns true when configuring an unassigned device, false when editing an already configured interface
const isConfiguringFromScratch = computed(() => {
  return !props.interfaceToEdit
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()

      if (isConfiguringFromScratch.value) {
        // configuring unassigned device
        interfaceName.value = ''
        zone.value = 'lan'
        protocol.value = 'static'
        ipv4Address.value = ''
        ipv4SubnetMask.value = '255.255.255.0'
        ipv4Gateway.value = ''
        isIpv6Enabled.value = false
        ipv6Address.value = ''
        ipv6Gateway.value = ''
        isExpandedAdvancedSettings.value = false
        ipv4Mtu.value = ''
        ipv6Mtu.value = ''
        dhcpHostnameToSend.value = 'deviceHostname'
        dhcpCustomHostname.value = ''
        dhcpClientId.value = ''
        dhcpVendorClass.value = ''
        pppoeUsername.value = ''
        pppoePassword.value = ''
        focusElement(interfaceNameRef)
      } else {
        // editing configuration

        // uncommitted changes such as ipv4Mtu, ipv6Mtu and ipv6Enabled are saved inside network configuration
        const networkConfigDevice = props.networkConfig.device.find(
          (d: any) => d.name === props.device.name
        )

        interfaceName.value = props.interfaceToEdit['.name']
        const zoneFound = props.firewallConfig.zone.find((z: any) =>
          z.network.includes(interfaceName.value)
        )
        zone.value = zoneFound.name
        protocol.value = props.interfaceToEdit.proto
        ipv4Address.value = props.interfaceToEdit.ipaddr || ''
        ipv4SubnetMask.value = props.interfaceToEdit.netmask || '255.255.255.0'
        ipv4Gateway.value = props.interfaceToEdit.gateway || ''
        isIpv6Enabled.value = networkConfigDevice?.ipv6 === '1' || false
        ipv6Address.value = props.interfaceToEdit.ip6addr ? props.interfaceToEdit.ip6addr[0] : ''
        ipv6Gateway.value = props.interfaceToEdit.ip6gw || ''
        isExpandedAdvancedSettings.value =
          networkConfigDevice?.mtu ||
          networkConfigDevice?.mtu6 ||
          props.interfaceToEdit.clientid ||
          props.interfaceToEdit.vendorid
        ipv4Mtu.value = networkConfigDevice?.mtu || ''
        ipv6Mtu.value = networkConfigDevice?.mtu6 || ''
        dhcpClientId.value = props.interfaceToEdit.clientid || ''
        dhcpVendorClass.value = props.interfaceToEdit.vendorid || ''
        pppoeUsername.value = props.interfaceToEdit.username
        pppoePassword.value = props.interfaceToEdit.password

        // dhcp hostname to send
        switch (props.interfaceToEdit.hostname) {
          case '*':
            dhcpHostnameToSend.value = 'doNotSendHostname'
            dhcpCustomHostname.value = ''
            break
          case undefined:
            dhcpHostnameToSend.value = 'deviceHostname'
            dhcpCustomHostname.value = ''
            break
          default:
            dhcpHostnameToSend.value = 'customHostname'
            dhcpCustomHostname.value = props.interfaceToEdit.hostname
        }
      }
    }
  }
)

watch(zone, () => {
  // only red interface support PPoE
  if (zone.value !== 'wan' && protocol.value === 'pppoe') {
    protocol.value = 'static'
  }
})

function closeDrawer() {
  emit('close')
}

// use composable?
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

async function createAndSetNetworkDevice() {
  let deviceSection = null

  if (isConfiguringFromScratch.value) {
    const res = await ubusCall('uci', 'add', {
      config: 'network',
      type: 'device',
      values: { name: props.device.name }
    })
    deviceSection = res.data.section
  } else {
    // editing configuration: device already exists

    const deviceFound = props.networkConfig.device.find(
      (dev: any) => dev.name === props.device.name
    )

    if (deviceFound) {
      deviceSection = deviceFound['.name']
    }
  }

  // enable/disable ipv6
  const ipv6Value = isIpv6Enabled.value ? '1' : '0'
  const values: any = { mtu: ipv4Mtu.value, ipv6: ipv6Value }

  if (isIpv6Enabled.value) {
    values.mtu6 = ipv6Mtu.value
  }

  ubusCall('uci', 'set', {
    config: 'network',
    section: deviceSection,
    values: values
  })
}

async function addInterfaceToFirwallZone() {
  const fwZone = props.firewallConfig.zone.find((z: any) => z.name === zone.value)

  // add the new interface to zone interfaces
  fwZone.network.push(interfaceName.value)

  if (fwZone) {
    await ubusCall('uci', 'set', {
      config: 'firewall',
      section: fwZone['.name'],
      values: {
        network: fwZone.network
      }
    })
  }
}

async function removeInterfaceFromOldFirewallZone(oldZone: any) {
  oldZone.network = oldZone.network.filter((iface: any) => iface !== interfaceName.value)

  await ubusCall('uci', 'set', {
    config: 'firewall',
    section: oldZone['.name'],
    values: {
      network: oldZone.network
    }
  })
}

async function setFirewallZone() {
  if (isConfiguringFromScratch.value) {
    addInterfaceToFirwallZone()
  } else {
    // editing configuration: if firewall zone has changed, remove interface from the old zone

    const oldZone = props.firewallConfig.zone.find((z: any) =>
      z.network.includes(interfaceName.value)
    )

    if (oldZone.name !== zone.value) {
      removeInterfaceFromOldFirewallZone(oldZone)
      addInterfaceToFirwallZone()
    }
  }
}

async function setNetworkConfiguration() {
  const values: any = { proto: protocol.value }

  if (protocol.value === 'static') {
    if (ipv4Address.value) {
      values.ipaddr = ipv4Address.value
      values.netmask = ipv4SubnetMask.value
      values.gateway = ipv4Gateway.value
    }

    if (ipv6Address.value) {
      values.ip6addr = [ipv6Address.value]
      values.ip6gw = ipv6Gateway.value
    }
  } else if (['dhcp', 'dhcpv6'].includes(protocol.value)) {
    // dhcp client id
    values.clientid = dhcpClientId.value

    if (protocol.value === 'dhcp') {
      // dhcp vendor class
      values.vendorid = dhcpVendorClass.value

      // dhcp hostname to send

      let dhcpHostname = ''
      let deleteDhcpHostname = false

      switch (dhcpHostnameToSend.value) {
        case 'deviceHostname':
          deleteDhcpHostname = true
          break
        case 'doNotSendHostname':
          dhcpHostname = '*'
          break
        case 'customHostname':
          dhcpHostname = dhcpCustomHostname.value
          break
      }

      if (dhcpHostname) {
        values.hostname = dhcpHostname
      }

      if (!isConfiguringFromScratch.value && props.interfaceToEdit.hostname && deleteDhcpHostname) {
        ubusCall('uci', 'delete', {
          config: 'network',
          section: interfaceName.value,
          options: ['hostname']
        })
      }
    }
  } else if (protocol.value === 'pppoe') {
    values.username = pppoeUsername.value
    values.password = pppoePassword.value
  }

  // disable "force link" on red interfaces
  if (zone.value === 'wan') {
    values.force_link = '0'
  }

  ubusCall('uci', 'set', {
    config: 'network',
    section: interfaceName.value,
    values: values
  })
}

async function createNetworkInterface() {
  ubusCall('uci', 'add', {
    config: 'network',
    type: 'interface',
    name: interfaceName.value,
    values: {
      proto: protocol.value,
      device: props.device.name
    }
  })
}

async function configureDevice() {
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  loading.value.configure = true

  try {
    if (isConfiguringFromScratch.value) {
      await createNetworkInterface()
    }
    await setNetworkConfiguration()
    await setFirewallZone()
    await createAndSetNetworkDevice()
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_configure_device')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.configure = false
    await uciChangesStore.getChanges()
  }
}

function validate() {
  clearErrors()
  let isValidationOk = true

  // interfaceName

  {
    // check required
    let { valid, errMessage } = validateRequired(interfaceName.value)
    if (!valid) {
      error.value.interfaceName = t(errMessage as string)
      if (isValidationOk) {
        isValidationOk = false
        focusElement(interfaceNameRef)
      }
    } else {
      // check sintax
      {
        let { valid, errMessage, i18Params } = validateUciName(interfaceName.value, 15)
        if (!valid) {
          error.value.interfaceName = t(errMessage as string, i18Params as any)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(interfaceNameRef)
          }
        }
      }

      if (isConfiguringFromScratch.value) {
        // check if already used
        const interfaceFound = props.networkConfig.interface.find(
          (iface: any) => iface['.name'] === interfaceName.value
        )

        if (interfaceFound) {
          error.value.interfaceName = t(
            'standalone.interfaces_and_devices.interface_name_already_used'
          )
          if (isValidationOk) {
            isValidationOk = false
            focusElement(interfaceNameRef)
          }
        }
      }
    }
  }

  if (protocol.value === 'static') {
    // at least an ipv4 or a ipv6 address is needed
    if (isEmpty(ipv4Address.value) && (!isIpv6Enabled.value || isEmpty(ipv6Address.value))) {
      error.value.ipv4Address = t(
        'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
      )

      if (isIpv6Enabled.value) {
        error.value.ipv6Address = t(
          'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
        )
      }
      isValidationOk = false
    }

    // ipv4 address

    if (ipv4Address.value) {
      // check sintax
      let { valid, errMessage } = validateIp4Address(ipv4Address.value)
      if (!valid) {
        error.value.ipv4Address = t(errMessage as string)
        if (isValidationOk) {
          isValidationOk = false
          focusElement(ipv4AddressRef)
        }
      }
    }

    // ipv4 subnet mask

    if (ipv4Address.value) {
      // check required
      let { valid, errMessage } = validateRequired(ipv4SubnetMask.value)
      if (!valid) {
        error.value.ipv4SubnetMask = t(errMessage as string)
        if (isValidationOk) {
          isValidationOk = false
          focusElement(ipv4SubnetMaskRef)
        }
      } else {
        // check sintax
        {
          let { valid, errMessage } = validateIpv4SubnetMask(ipv4SubnetMask.value)
          if (!valid) {
            error.value.ipv4SubnetMask = t(errMessage as string)
            if (isValidationOk) {
              isValidationOk = false
              focusElement(ipv4SubnetMaskRef)
            }
          }
        }
      }
    }

    // ipv4 gateway

    if (ipv4Address.value) {
      // check required
      let { valid, errMessage } = validateRequired(ipv4Gateway.value)
      if (!valid) {
        error.value.ipv4Gateway = t(errMessage as string)
        if (isValidationOk) {
          isValidationOk = false
          focusElement(ipv4GatewayRef)
        }
      } else {
        // check sintax
        {
          let { valid, errMessage } = validateIp4Address(ipv4Gateway.value)
          if (!valid) {
            error.value.ipv4Gateway = t(errMessage as string)
            if (isValidationOk) {
              isValidationOk = false
              focusElement(ipv4GatewayRef)
            }
          }
        }
      }
    }

    if (isIpv6Enabled.value) {
      // ipv6 address

      if (ipv6Address.value) {
        // check sintax
        let { valid, errMessage } = validateIp6Address(ipv6Gateway.value)
        if (!valid) {
          error.value.ipv6Address = t(errMessage as string)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(ipv6AddressRef)
          }
        }
      }

      // ipv6 gateway

      if (ipv6Address.value) {
        // check required
        let { valid, errMessage } = validateRequired(ipv6Gateway.value)
        if (!valid) {
          error.value.ipv6Gateway = t(errMessage as string)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(ipv6GatewayRef)
          }
        } else {
          // check sintax
          {
            let { valid, errMessage } = validateIp6Address(ipv6Gateway.value)
            if (!valid) {
              error.value.ipv6Gateway = t(errMessage as string)
              if (isValidationOk) {
                isValidationOk = false
                focusElement(ipv6GatewayRef)
              }
            }
          }
        }
      }

      // ipv6 mtu

      if (ipv6Mtu.value) {
        let { valid, errMessage } = validateIpv6Mtu(ipv6Mtu.value)
        if (!valid) {
          isExpandedAdvancedSettings.value = true
          error.value.ipv6Mtu = t(errMessage as string)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(ipv6MtuRef)
          }
        }
      }
    }
  } else if (['dhcp', 'dhcpv6'].includes(protocol.value)) {
    // dhcp client id

    if (dhcpClientId.value) {
      let { valid, errMessage } = validateHexadecimalString(dhcpClientId.value)
      if (!valid) {
        isExpandedAdvancedSettings.value = true
        error.value.dhcpClientId = t(errMessage as string)
        if (isValidationOk) {
          isValidationOk = false
          focusElement(dhcpClientIdRef)
        }
      }
    }

    if (protocol.value === 'dhcp' && dhcpHostnameToSend.value === 'customHostname') {
      // dhcp custom hostname

      {
        // check required
        let { valid, errMessage } = validateRequired(dhcpCustomHostname.value)
        if (!valid) {
          error.value.dhcpCustomHostname = t(errMessage as string)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(dhcpCustomHostnameRef)
          }
        } else {
          // check sintax
          {
            let { valid, errMessage, i18Params } = validateHostname(dhcpCustomHostname.value)
            if (!valid) {
              error.value.dhcpCustomHostname = t(errMessage as string, i18Params as any)
              if (isValidationOk) {
                isValidationOk = false
                focusElement(dhcpCustomHostnameRef)
              }
            }
          }
        }
      }
    }
  }

  // ipv4 mtu

  if (ipv4Mtu.value) {
    let { valid, errMessage } = validateIpv4Mtu(ipv4Mtu.value)
    if (!valid) {
      isExpandedAdvancedSettings.value = true
      error.value.ipv4Mtu = t(errMessage as string)
      if (isValidationOk) {
        isValidationOk = false
        focusElement(ipv4MtuRef)
      }
    }
  }

  return isValidationOk
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="
      t('standalone.interfaces_and_devices.configure_interface_for_name', { name: device.name })
    "
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <!-- name -->
        <NeTextInput
          :label="t('standalone.interfaces_and_devices.interface_name')"
          v-model.trim="interfaceName"
          :invalidMessage="t(error.interfaceName)"
          :disabled="!isConfiguringFromScratch || loading.configure"
          ref="interfaceNameRef"
        />
        <!-- zone -->
        <NeRadioSelection
          v-model="zone"
          card
          :label="t('standalone.interfaces_and_devices.zone')"
          :options="zoneOptions"
          gridStyle="gap-3 grid-cols-2 md:grid-cols-3"
        />
        <!-- protocol -->
        <NeRadioSelection
          v-model="protocol"
          :label="t('standalone.interfaces_and_devices.protocol')"
          :options="protocolOptions"
        />
        <!-- fields for static protocol -->
        <div v-show="protocol === 'static'" class="space-y-6">
          <!-- ipv4 address -->
          <NeTextInput
            :label="t('standalone.interfaces_and_devices.ipv4_address')"
            v-model.trim="ipv4Address"
            :invalidMessage="t(error.ipv4Address)"
            :disabled="loading.configure"
            ref="ipv4AddressRef"
          />
          <!-- ipv4 subnet mask -->
          <NeTextInput
            :label="t('standalone.interfaces_and_devices.ipv4_subnet_mask')"
            v-model.trim="ipv4SubnetMask"
            :invalidMessage="t(error.ipv4SubnetMask)"
            :disabled="loading.configure"
            ref="ipv4SubnetMaskRef"
          />
          <!-- gateway -->
          <NeTextInput
            :label="t('standalone.interfaces_and_devices.ipv4_gateway')"
            v-model.trim="ipv4Gateway"
            :invalidMessage="t(error.ipv4Gateway)"
            :disabled="loading.configure"
            ref="ipv4GatewayRef"
          />
          <!-- enable ipv6 -->
          <div>
            <NeFormItemLabel>{{ t('standalone.interfaces_and_devices.ipv6') }}</NeFormItemLabel>
            <NeCheckbox
              v-model="isIpv6Enabled"
              :label="t('standalone.interfaces_and_devices.enable_ipv6')"
              :disabled="loading.configure"
            />
          </div>
          <!-- fields for ipv6 -->
          <div v-show="isIpv6Enabled" class="space-y-6">
            <!-- ipv6 address -->
            <NeTextInput
              :label="t('standalone.interfaces_and_devices.ipv6_address')"
              v-model.trim="ipv6Address"
              :invalidMessage="t(error.ipv6Address)"
              :disabled="loading.configure"
              ref="ipv6AddressRef"
            />
            <!-- ipv6 gateway -->
            <NeTextInput
              :label="t('standalone.interfaces_and_devices.ipv6_gateway')"
              v-model.trim="ipv6Gateway"
              :invalidMessage="t(error.ipv6Gateway)"
              :disabled="loading.configure"
              ref="ipv6GatewayRef"
            />
          </div>
        </div>
        <!-- fields for pppoe protocol -->
        <div v-show="protocol === 'pppoe'" class="space-y-6">
          <!-- pppoe username -->
          <NeTextInput
            :label="t('standalone.interfaces_and_devices.pppoe_username')"
            v-model.trim="pppoeUsername"
            :invalidMessage="t(error.pppoeUsername)"
            :disabled="loading.configure"
            ref="pppoeUsernameRef"
          />
          <!-- pppoe username -->
          <NeTextInput
            :label="t('standalone.interfaces_and_devices.pppoe_password')"
            v-model="pppoePassword"
            isPassword
            :showPasswordLabel="t('ne_text_input.show_password')"
            :hidePasswordLabel="t('ne_text_input.hide_password')"
            :invalidMessage="t(error.pppoePassword)"
            ref="pppoePasswordRef"
          />
        </div>
        <!-- fields for dhcp protocol -->
        <div v-show="protocol === 'dhcp'" class="space-y-6">
          <!-- dhcp hostname to send -->
          <NeRadioSelection
            v-model="dhcpHostnameToSend"
            :label="t('standalone.interfaces_and_devices.dhcp_hostname_to_send_label')"
            :options="dhcpHostnameToSendOptions"
          />
          <!-- dhcp custom hostname -->
          <NeTextInput
            v-if="dhcpHostnameToSend === 'customHostname'"
            v-model="dhcpCustomHostname"
            :placeholder="t('standalone.interfaces_and_devices.custom_hostname')"
            :invalidMessage="t(error.dhcpCustomHostname)"
            ref="dhcpCustomHostnameRef"
            class="ml-6 !mt-4"
          />
        </div>
        <!-- advanced settings -->
        <template v-if="protocol != 'pppoe'">
          <NeButton
            kind="tertiary"
            size="sm"
            @click="isExpandedAdvancedSettings = !isExpandedAdvancedSettings"
            class="-ml-2"
          >
            <template #suffix>
              <font-awesome-icon
                :icon="['fas', isExpandedAdvancedSettings ? 'chevron-up' : 'chevron-down']"
                class="h-3 w-3"
                aria-hidden="true"
              />
            </template>
            {{ t('common.advanced_settings') }}
          </NeButton>
          <Transition name="slide-down">
            <div v-show="isExpandedAdvancedSettings" class="space-y-6">
              <!-- ipv4 MTU -->
              <NeTextInput
                :label="t('standalone.interfaces_and_devices.ipv4_mtu_bytes')"
                v-model.trim="ipv4Mtu"
                placeholder="1500"
                optional
                :invalidMessage="t(error.ipv4Mtu)"
                :disabled="loading.configure"
                ref="ipv4MtuRef"
              />
              <!-- ipv6 MTU -->
              <NeTextInput
                v-show="isIpv6Enabled"
                :label="t('standalone.interfaces_and_devices.ipv6_mtu_bytes')"
                v-model.trim="ipv6Mtu"
                placeholder="1500"
                optional
                :invalidMessage="t(error.ipv6Mtu)"
                :disabled="loading.configure"
                ref="ipv6MtuRef"
              />
              <!-- dhcp client id -->
              <NeTextInput
                v-show="['dhcp', 'dhcpv6'].includes(protocol)"
                :label="t('standalone.interfaces_and_devices.client_id_label')"
                v-model.trim="dhcpClientId"
                optional
                :invalidMessage="t(error.dhcpClientId)"
                :disabled="loading.configure"
                ref="dhcpClientIdRef"
              />
              <!-- dhcp vendor class -->
              <NeTextInput
                v-show="protocol === 'dhcp'"
                :label="t('standalone.interfaces_and_devices.vendor_class_label')"
                v-model.trim="dhcpVendorClass"
                optional
                :invalidMessage="t(error.dhcpVendorClass)"
                :disabled="loading.configure"
                ref="dhcpVendorClassRef"
              />
            </div>
          </Transition>
        </template>
        <NeInlineNotification
          v-if="error.notificationTitle"
          kind="error"
          :title="error.notificationTitle"
          :description="error.notificationDescription"
        />
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          @click.prevent="closeDrawer"
          :disabled="loading.configure"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="configureDevice"
          :disabled="loading.configure"
          :loading="loading.configure"
        >
          {{
            isConfiguringFromScratch
              ? t('standalone.interfaces_and_devices.configure_interface')
              : t('standalone.interfaces_and_devices.reconfigure_interface')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
