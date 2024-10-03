<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getInterface,
  getName,
  getZoneColor,
  getZoneIcon,
  isBond,
  isBridge,
  isUnconfiguredBond
} from '@/lib/standalone/network'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  validateIp4Address,
  validateIp6Address,
  validateIpv4Mtu,
  validateIpv6Mtu,
  validateRequired,
  validateUciName,
  validateHexadecimalString,
  validateHostname,
  validateIp4Cidr
} from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeCombobox,
  NeCard,
  type NeComboboxOption,
  NeInlineNotification,
  NeCheckbox,
  NeButton,
  NeSideDrawer,
  NeSkeleton,
  NeTooltip,
  NeFormItemLabel,
  NeRadioSelection,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { cloneDeep, isEmpty, toUpper } from 'lodash-es'
import { ref, watch, computed, type PropType, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

export type DeviceType = 'physical' | 'logical'

const props = defineProps({
  device: {
    type: Object,
    required: true
  },
  deviceType: {
    type: String as PropType<DeviceType>,
    required: true
  },
  allDevices: {
    type: Array,
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

let internalAllDevices = ref<any[]>([])
let interfaceName = ref('')
let interfaceNameRef = ref()
let zone = ref('lan')
let protocol = ref('static')
let ipv4Address = ref('')
let ipv4AddressRef = ref()
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
let logicalIfaceType = ref('bridge')
let logicalIfaceTypeRef = ref()
let selectedDevicesForBridgeOrBond: Ref<NeComboboxOption[]> = ref([])
let selectedDevicesForBridgeOrBondRef = ref<HTMLDivElement | null>()
let bondingPolicy = ref('balance-rr')
let bondingPolicyRef = ref<HTMLDivElement | null>()
let bondPrimaryDevice = ref('')
let bondPrimaryDeviceRef = ref<HTMLDivElement | null>()
let allowedZones = ref<Array<any>>([])

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

const logicalIfaceTypeOptions = [
  { id: 'bridge', label: t('standalone.interfaces_and_devices.bridge') },
  { id: 'bond', label: t('standalone.interfaces_and_devices.bond') }
]

const bondingPolicyOptions = [
  {
    id: 'balance-rr',
    label: t('standalone.interfaces_and_devices.bond_balance_rr'),
    description: 'balance-rr (0)'
  },
  {
    id: 'active-backup',
    label: t('standalone.interfaces_and_devices.bond_active_backup'),
    description: 'active-backup (1)'
  },
  {
    id: 'balance-xor',
    label: t('standalone.interfaces_and_devices.bond_balance_xor'),
    description: 'balance-xor (2)'
  },
  {
    id: 'broadcast',
    label: t('standalone.interfaces_and_devices.bond_broadcast'),
    description: 'broadcast (3)'
  },
  {
    id: '802.3ad',
    label: t('standalone.interfaces_and_devices.bond_8023ad'),
    description: '802.3ad (4)'
  },
  {
    id: 'balance-tlb',
    label: t('standalone.interfaces_and_devices.bond_balance_tlb'),
    description: 'balance-tlb (5)'
  },
  {
    id: 'balance-alb',
    label: t('standalone.interfaces_and_devices.bond_balance_alb'),
    description: 'balance-alb (6)'
  }
]

let loading = ref({
  configure: false,
  listZonesForDeviceConfig: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: '',
  interfaceName: '',
  ipv4Address: '',
  ipv4Gateway: '',
  ipv6Address: '',
  ipv6Gateway: '',
  ipv4Mtu: '',
  ipv6Mtu: '',
  dhcpCustomHostname: '',
  dhcpClientId: '',
  dhcpVendorClass: '',
  pppoeUsername: '',
  pppoePassword: '',
  selectedDevicesForBridgeOrBond: '',
  bondingPolicy: '',
  bondPrimaryDevice: ''
})

const zoneOptions = computed(() => {
  return allowedZones.value.map((zone: any) => {
    return {
      id: zone.name,
      label: toUpper(zone.name),
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

// returns true only when creating a new bond (not when configuring it)
const isCreatingBond = computed(() => {
  return props.deviceType === 'logical' && logicalIfaceType.value === 'bond'
})

const bridgeOrBondDevicesOptions: Ref<NeComboboxOption[]> = computed(() => {
  // remove loopback, ifb-dns and devices used by other bonds
  const filteredDevices = internalAllDevices.value.filter(
    (dev: any) =>
      // hide loopback and ifb-dns devices
      !['lo', 'ifb-dns'].includes(getName(dev)) &&
      // hide devices used by other bridges or bonds
      !devicesUsedByOhterBridgesOrBonds.value.includes(getName(dev)) &&
      // hide bridges/bond devices
      !isBridge(dev) &&
      !isBond(dev) &&
      // hide configured devices
      !getInterface(dev)
  )

  return filteredDevices.map((dev: any) => {
    // show linked interfaces near device name
    const ifacesFound = props.networkConfig.interface
      .filter((iface: any) => iface.device === getName(dev))
      .map((iface: any) => iface['.name'])

    let description = ''

    if (isBond(dev)) {
      description = `(${t('standalone.interfaces_and_devices.bond')})`
    } else if (ifacesFound) {
      description = ifacesFound.join(', ')
    }

    // bond interfaces have '.name' attribute
    return { id: getName(dev), label: getName(dev), description }
  })
})

const devicesUsedByOhterBridgesOrBonds = computed(() => {
  const usedDevices: any[] = []
  internalAllDevices.value.forEach((dev: any) => {
    // always show devices used by a bridge/bond while editing it

    if (getName(dev) != getName(props.device)) {
      if (isBond(dev)) {
        usedDevices.push(...dev.slaves)
      } else if (isBridge(dev)) {
        usedDevices.push(...dev.ports)
      }
    }
  })
  return usedDevices
})

const primaryButtonLabel = computed(() => {
  if (isConfiguringFromScratch.value) {
    if (logicalIfaceType.value === 'bond') {
      return t('standalone.interfaces_and_devices.create_bond')
    } else if (props.device.proto === 'bonding') {
      return t('standalone.interfaces_and_devices.configure_bond')
    } else {
      return t('standalone.interfaces_and_devices.configure_interface')
    }
  } else {
    return t('standalone.interfaces_and_devices.reconfigure_interface')
  }
})

const drawerTitle = computed(() => {
  if (props.deviceType === 'physical') {
    if (props.device.proto === 'bonding') {
      const bondName = props.device.name.split('bond-')[1]
      return t('standalone.interfaces_and_devices.configure_bond_name', {
        name: bondName
      })
    } else {
      return t('standalone.interfaces_and_devices.configure_interface_for_name', {
        name: props.device.name
      })
    }
  } else {
    return t('standalone.interfaces_and_devices.create_logical_interface')
  }
})

watch(
  logicalIfaceType,
  () => {
    if (logicalIfaceType.value == 'bond') {
      const minCeiled = Math.ceil(1)
      const maxFloored = Math.floor(255)
      const firstRandom = Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
      const secondRandom = Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
      ipv4Address.value = `127.${firstRandom}.${secondRandom}.1/32`
    } else {
      ipv4Address.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      listZonesForDeviceConfig()

      // periodic devices reload can cause some glitches to NeCombobox
      internalAllDevices.value = cloneDeep(props.allDevices)

      if (isConfiguringFromScratch.value) {
        // configuring unassigned device
        interfaceName.value = ''
        zone.value = 'lan'
        protocol.value = 'static'
        ipv4Address.value = ''
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
        logicalIfaceType.value = 'bridge'
        selectedDevicesForBridgeOrBond.value = []
        bondingPolicy.value = 'balance-rr'
        bondPrimaryDevice.value = ''

        if (props.deviceType === 'physical') {
          focusElement(interfaceNameRef)
        } else {
          focusElement(logicalIfaceTypeRef)
        }
      } else {
        // editing configuration

        if (isUnconfiguredBond(props.interfaceToEdit)) {
          interfaceName.value = ''
          focusElement(interfaceNameRef)
        } else {
          interfaceName.value = props.interfaceToEdit['.name']
        }

        // (zone is set inside listZonesForDeviceConfig function)

        if (isUnconfiguredBond(props.interfaceToEdit)) {
          protocol.value = 'static'
          ipv4Address.value = ''
        } else {
          protocol.value = props.interfaceToEdit.proto
          ipv4Address.value = props.interfaceToEdit.ipaddr || ''
        }
        ipv4Gateway.value = props.interfaceToEdit.gateway || ''

        if (
          props.device?.ipv6 === '1' ||
          (props.interfaceToEdit.proto === 'pppoe' && props.device?.ipv6 === 'auto')
        ) {
          isIpv6Enabled.value = true
        } else {
          isIpv6Enabled.value = false
        }
        ipv6Address.value = props.interfaceToEdit.ip6addr ? props.interfaceToEdit.ip6addr : ''
        ipv6Gateway.value = props.interfaceToEdit.ip6gw || ''
        isExpandedAdvancedSettings.value = false
        ipv4Mtu.value = props.device?.mtu ? props.device?.mtu.toString() : ''
        ipv6Mtu.value = props.device?.mtu6 || ''
        dhcpClientId.value = props.interfaceToEdit.clientid || ''
        dhcpVendorClass.value = props.interfaceToEdit.vendorid || ''
        pppoeUsername.value = props.interfaceToEdit.username || ''
        pppoePassword.value = props.interfaceToEdit.password || ''

        if (props.deviceType === 'logical') {
          if (isBridge(props.device)) {
            logicalIfaceType.value = 'bridge'

            selectedDevicesForBridgeOrBond.value = bridgeOrBondDevicesOptions.value.filter(
              (dev: any) => props.device.ports.includes(dev.id)
            )
          } else {
            // bond
            logicalIfaceType.value = 'bond'

            // in case of bonding, 'props.device' is actually the bond interface
            const bondIface = props.device

            selectedDevicesForBridgeOrBond.value = bridgeOrBondDevicesOptions.value.filter(
              (dev: any) => bondIface.slaves.includes(dev.id)
            )
            bondingPolicy.value = bondIface.bonding_policy
            bondPrimaryDevice.value = bondIface.primary
          }
        }

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

watch(logicalIfaceType, () => {
  // if bond is selected: set protocol to static, disable ipv6, disable red zone
  if (logicalIfaceType.value === 'bond') {
    protocol.value = 'static'
    isIpv6Enabled.value = false

    if (zone.value === 'wan') {
      zone.value = 'lan'
    }
  }
})

function closeDrawer() {
  emit('close')
}

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

function prepareConfigureDeviceData() {
  // common data
  const data: any = {
    device_type: props.deviceType,
    interface_name: interfaceName.value,
    protocol: protocol.value,
    zone: zone.value,
    ip6_enabled: isIpv6Enabled.value
  }

  if (props.device.name) {
    data.device_name = props.device.name
  }

  if (props.interfaceToEdit) {
    data.interface_to_edit = props.interfaceToEdit['.name']
  }

  if (ipv4Address.value) {
    data.ip4_address = ipv4Address.value
  }

  if (ipv4Gateway.value) {
    data.ip4_gateway = ipv4Gateway.value
  }

  if (ipv4Mtu.value) {
    data.ip4_mtu = ipv4Mtu.value
  }

  if (ipv6Address.value) {
    data.ip6_address = ipv6Address.value
  }

  if (ipv6Gateway.value) {
    data.ip6_gateway = ipv6Gateway.value
  }

  if (ipv6Mtu.value) {
    data.ip6_mtu = ipv6Mtu.value
  }

  if (props.deviceType === 'logical') {
    data.logical_type = logicalIfaceType.value
    data.attached_devices = selectedDevicesForBridgeOrBond.value.map((option: any) => option.id)
  }

  if (props.deviceType === 'logical' && logicalIfaceType.value === 'bond') {
    data.bonding_policy = bondingPolicy.value
    data.bond_primary_device = bondPrimaryDevice.value
    delete data.zone
  }

  if (protocol.value === 'pppoe') {
    data.pppoe_username = pppoeUsername.value
    data.pppoe_password = pppoePassword.value
  }

  if (['dhcp', 'dhcpv6'].includes(protocol.value)) {
    data.dhcp_client_id = dhcpClientId.value
    data.dhcp_vendor_class = dhcpVendorClass.value
    data.dhcp_hostname_to_send = dhcpHostnameToSend.value
    data.dhcp_custom_hostname = dhcpCustomHostname.value
  }

  return data
}

async function configureDevice() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  loading.value.configure = true
  const configureDeviceData = prepareConfigureDeviceData()

  try {
    await ubusCall('ns.devices', 'configure-device', configureDeviceData)
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('standalone.interfaces_and_devices.cannot_configure_device')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value.configure = false
    await uciChangesStore.getChanges()
  }
}

function validate() {
  clearErrors()
  let isValidationOk = true

  if (props.deviceType === 'logical') {
    // select one or more devices for bridge or bond

    if (isEmpty(selectedDevicesForBridgeOrBond.value)) {
      error.value.selectedDevicesForBridgeOrBond = t(
        'standalone.interfaces_and_devices.select_one_or_more_devices'
      )
      if (isValidationOk) {
        isValidationOk = false
        focusElement(selectedDevicesForBridgeOrBondRef)
      }
    }

    if (logicalIfaceType.value === 'bond') {
      // bond primary device

      if (['active-backup', 'balance-tlb', 'balance-alb'].includes(bondingPolicy.value)) {
        let { valid, errMessage } = validateRequired(bondPrimaryDevice.value)
        if (!valid) {
          error.value.bondPrimaryDevice = t(errMessage as string)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(bondPrimaryDeviceRef)
          }
        } else {
          // ensure primary device is included in selected devices

          const primaryDeviceFound = selectedDevicesForBridgeOrBond.value.find(
            (option: any) => option.id === bondPrimaryDevice.value
          )

          if (!primaryDeviceFound) {
            error.value.bondPrimaryDevice = t(
              'standalone.interfaces_and_devices.primary_device_not_included'
            )
            if (isValidationOk) {
              isValidationOk = false
              focusElement(bondPrimaryDeviceRef)
            }
          }
        }
      }
    }
  }

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
      // check syntax
      if (isConfiguringFromScratch.value) {
        let maxLen = 13
        if (logicalIfaceType.value == 'bond') {
          maxLen = 10
        }
        if (protocol.value == 'pppoe') {
          maxLen = 5
        }
        let { valid, errMessage, i18Params } = validateUciName(interfaceName.value, maxLen)
        if (!valid) {
          error.value.interfaceName = t(errMessage as string, i18Params as any)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(interfaceNameRef)
          }
        }
      } else {
        // editing an already configured device
        if (protocol.value == 'pppoe' && interfaceName.value.length > 5) {
          error.value.interfaceName = t(
            'standalone.interfaces_and_devices.pppoe_name_too_long_need_reconfiguration',
            {
              num: 5
            }
          )
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
    // ipv4 and/or ipv6 address are required
    if (!isIpv6Enabled.value) {
      let { valid, errMessage } = validateRequired(ipv4Address.value)
      if (!valid) {
        error.value.ipv4Address = t(errMessage as string)
        if (isValidationOk) {
          isValidationOk = false
          focusElement(ipv4AddressRef)
        }
      }
    }

    // ipv4 address

    if (ipv4Address.value) {
      // check syntax
      let { valid, errMessage } = validateIp4Cidr(ipv4Address.value)
      if (!valid) {
        error.value.ipv4Address = t(errMessage as string)
        if (isValidationOk) {
          isValidationOk = false
          focusElement(ipv4AddressRef)
        }
      }
    }

    // ipv4 gateway

    if (zone.value === 'wan' && ipv4Address.value) {
      // check required
      let { valid, errMessage } = validateRequired(ipv4Gateway.value)
      if (!valid) {
        error.value.ipv4Gateway = t(errMessage as string)
        if (isValidationOk) {
          isValidationOk = false
          focusElement(ipv4GatewayRef)
        }
      } else {
        // check syntax
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
        // check syntax
        let { valid, errMessage } = validateIp6Address(ipv6Address.value)
        if (!valid) {
          error.value.ipv6Address = t(errMessage as string)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(ipv6AddressRef)
          }
        }
      }

      // ipv6 gateway

      if (zone.value === 'wan') {
        // check required
        let { valid, errMessage } = validateRequired(ipv6Gateway.value)
        if (!valid) {
          error.value.ipv6Gateway = t(errMessage as string)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(ipv6GatewayRef)
          }
        } else {
          // check syntax
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
          // check syntax
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

async function listZonesForDeviceConfig() {
  loading.value.listZonesForDeviceConfig = true
  try {
    const res = await ubusCall('ns.devices', 'list-zones-for-device-config')
    allowedZones.value = res.data.zones

    const zoneFound = allowedZones.value.find((z: any) => z.network?.includes(interfaceName.value))
    if (zoneFound) {
      zone.value = zoneFound.name
    }
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_retrieve_zones_for_device_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
  loading.value.listZonesForDeviceConfig = false
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="drawerTitle"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <template v-if="deviceType === 'logical'">
          <!-- logical interface type (bridge/bond) -->
          <NeRadioSelection
            v-model="logicalIfaceType"
            :label="t('standalone.interfaces_and_devices.logical_type')"
            :options="logicalIfaceTypeOptions"
            :disabled="!isConfiguringFromScratch || loading.configure"
            ref="logicalIfaceTypeRef"
          />
          <!-- bridge / bond devices -->
          <NeCombobox
            multiple
            v-model="selectedDevicesForBridgeOrBond"
            :options="bridgeOrBondDevicesOptions"
            :label="t('standalone.interfaces_and_devices.devices')"
            :placeholder="
              logicalIfaceType === 'bond'
                ? t('standalone.interfaces_and_devices.select_devices_for_bond')
                : t('standalone.interfaces_and_devices.select_devices_for_bridge')
            "
            :invalidMessage="error.selectedDevicesForBridgeOrBond"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('standalone.interfaces_and_devices.no_devices_available')"
            :disabled="loading.configure"
            ref="selectedDevicesForBridgeOrBondRef"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
          />
          <!-- bonding policy -->
          <NeCombobox
            v-if="logicalIfaceType === 'bond'"
            v-model="bondingPolicy"
            :options="bondingPolicyOptions"
            :label="t('standalone.interfaces_and_devices.bonding_policy')"
            :invalidMessage="error.bondingPolicy"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :disabled="loading.configure"
            ref="bondingPolicyRef"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
          />
          <!-- bond primary device -->
          <NeCombobox
            v-if="
              logicalIfaceType === 'bond' &&
              ['active-backup', 'balance-tlb', 'balance-alb'].includes(bondingPolicy)
            "
            v-model="bondPrimaryDevice"
            :options="selectedDevicesForBridgeOrBond"
            :label="t('standalone.interfaces_and_devices.bond_primary_device')"
            :invalidMessage="error.bondPrimaryDevice"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :disabled="loading.configure"
            ref="bondPrimaryDeviceRef"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
          />
        </template>
        <!-- name -->
        <NeTextInput
          :label="
            isCreatingBond
              ? t('standalone.interfaces_and_devices.bond_name')
              : t('standalone.interfaces_and_devices.interface_name')
          "
          v-model.trim="interfaceName"
          :invalidMessage="t(error.interfaceName)"
          :disabled="!isConfiguringFromScratch || loading.configure"
          ref="interfaceNameRef"
        />
        <!-- zone skeleton -->
        <div v-if="loading.listZonesForDeviceConfig">
          <NeFormItemLabel>
            {{ t('standalone.interfaces_and_devices.zone') }}
          </NeFormItemLabel>
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <NeCard v-for="index in 3" :key="index" :skeletonLines="1">
              <NeSkeleton size="sm" :lines="2" />
            </NeCard>
          </div>
        </div>
        <!-- zone, always show except when creating bond -->
        <NeRadioSelection
          v-else-if="!isCreatingBond"
          v-model="zone"
          card
          :label="t('standalone.interfaces_and_devices.zone')"
          :options="zoneOptions"
          gridStyle="gap-3 grid-cols-2 lg:grid-cols-3"
        />
        <!-- protocol (don't show for bond) -->
        <NeRadioSelection
          v-if="!(deviceType === 'logical' && logicalIfaceType === 'bond')"
          v-model="protocol"
          :label="t('standalone.interfaces_and_devices.protocol')"
          :options="protocolOptions"
        />
        <!-- fields for static protocol -->
        <div v-show="['static', 'bonding'].includes(protocol)" class="space-y-6">
          <!-- ipv4 address -->
          <NeTextInput
            :label="
              logicalIfaceType === 'bond'
                ? t('standalone.interfaces_and_devices.management_ipv4_address_cidr')
                : t('standalone.interfaces_and_devices.ipv4_address_cidr')
            "
            v-model.trim="ipv4Address"
            :invalidMessage="t(error.ipv4Address)"
            :disabled="loading.configure || logicalIfaceType == 'bond'"
            ref="ipv4AddressRef"
          >
            <template v-if="logicalIfaceType === 'bond'" #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.interfaces_and_devices.management_ipv4_address_cidr_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <!-- gateway -->
          <NeTextInput
            v-if="zone === 'wan'"
            :label="t('standalone.interfaces_and_devices.ipv4_gateway')"
            v-model.trim="ipv4Gateway"
            :invalidMessage="t(error.ipv4Gateway)"
            :disabled="loading.configure"
            ref="ipv4GatewayRef"
          />
          <!-- enable ipv6 (don't show for bond) -->
          <div v-if="!(deviceType === 'logical' && logicalIfaceType === 'bond')">
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
            >
              <template #tooltip>
                <NeTooltip>
                  <template #content>
                    {{ t('standalone.interfaces_and_devices.ipv6_address_tooltip') }}
                  </template>
                </NeTooltip>
              </template>
            </NeTextInput>
            <!-- ipv6 gateway -->
            <NeTextInput
              v-if="zone === 'wan'"
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
          <!-- enable ipv6 -->
          <div>
            <NeFormItemLabel>{{ t('standalone.interfaces_and_devices.ipv6') }}</NeFormItemLabel>
            <NeCheckbox
              v-model="isIpv6Enabled"
              :label="t('standalone.interfaces_and_devices.enable_ipv6')"
              :disabled="loading.configure"
            />
          </div>
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
            class="!mt-4 ml-6"
          />
        </div>
        <!-- advanced settings (don't show for pppoe and bond) -->
        <template
          v-if="protocol !== 'pppoe' && !(deviceType === 'logical' && logicalIfaceType === 'bond')"
        >
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
                :helperText="t('standalone.interfaces_and_devices.enter_a_hexadecimal_string')"
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
        >
          <template #details v-if="error.notificationDetails">
            {{ error.notificationDetails }}
          </template>
        </NeInlineNotification>
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
          {{ primaryButtonLabel }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
