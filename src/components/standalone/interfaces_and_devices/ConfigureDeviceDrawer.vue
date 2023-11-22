<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  generateDeviceName,
  getInterface,
  getName,
  getZoneColor,
  getZoneIcon,
  getZoneLabel,
  isBond,
  isBridge
} from '@/lib/standalone/network'
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
  NeCombobox,
  focusElement,
  getAxiosErrorMessage,
  type NeComboboxOption
} from '@nethserver/vue-tailwind-lib'
import { cloneDeep, isEmpty } from 'lodash-es'
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

let internalAllDevices = ref<any[]>([])
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
let logicalIfaceType = ref('bridge')
let logicalIfaceTypeRef = ref()
let selectedDevicesForBridgeOrBond: Ref<NeComboboxOption[]> = ref([])
let selectedDevicesForBridgeOrBondRef = ref<HTMLDivElement | null>()
let bridgeDeviceName = ref('')
let bondingPolicy = ref('balance-rr')
let bondingPolicyRef = ref<HTMLDivElement | null>()
let bondPrimaryDevice = ref('')
let bondPrimaryDeviceRef = ref<HTMLDivElement | null>()

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
  pppoePassword: '',
  selectedDevicesForBridgeOrBond: '',
  bondingPolicy: '',
  bondPrimaryDevice: ''
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
      icon: getZoneIcon(zone.name),
      disabled:
        zone.name === 'wan' && props.deviceType === 'logical' && logicalIfaceType.value === 'bond' // disable red zone when configuring bond
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
      !getInterface(dev, props.networkConfig)
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

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      // periodic devices reload can cause some glitches to NeCombobox
      internalAllDevices.value = cloneDeep(props.allDevices)

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

        // uncommitted changes such as ipv4Mtu, ipv6Mtu and ipv6Enabled are saved inside network configuration
        const networkConfigDevice = props.networkConfig.device?.find(
          (d: any) => d.name === props.device.name
        )

        interfaceName.value = props.interfaceToEdit['.name']
        const zoneFound = props.firewallConfig.zone.find((z: any) =>
          z.network?.includes(interfaceName.value)
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

async function createPhysicalDevice() {
  const res = await ubusCall('uci', 'add', {
    config: 'network',
    type: 'device',
    values: { name: props.device.name }
  })
  return res.data.section
}

async function createBridgeDevice() {
  const res = await ubusCall('uci', 'add', {
    config: 'network',
    type: 'device',
    values: { name: bridgeDeviceName.value, type: 'bridge' }
  })
  return res.data.section
}

async function createAndSetNetworkDevice() {
  let deviceSection = null

  // create the device only if needed
  const deviceAlreadyExists = props.networkConfig.device?.find(
    (dev: any) => dev.name === props.device.name
  )

  // create the device only if it doesn't already exists
  if (!deviceAlreadyExists) {
    // create device

    if (props.deviceType === 'physical') {
      deviceSection = await createPhysicalDevice()
    } else if (logicalIfaceType.value === 'bridge') {
      deviceSection = await createBridgeDevice()
    }
  } else {
    // device already exists

    const deviceFound = props.networkConfig.device?.find(
      (dev: any) => dev.name === props.device.name
    )

    if (deviceFound) {
      deviceSection = deviceFound['.name']
    }
  }

  // enable/disable ipv6

  if (protocol.value === 'dhcpv6') {
    isIpv6Enabled.value = true
  } else if (protocol.value === 'dhcp') {
    isIpv6Enabled.value = false
  }

  const ipv6Value = isIpv6Enabled.value ? '1' : '0'
  const values: any = { mtu: ipv4Mtu.value, ipv6: ipv6Value }

  if (isIpv6Enabled.value) {
    values.mtu6 = ipv6Mtu.value
  }

  if (props.deviceType === 'logical' && logicalIfaceType.value === 'bridge') {
    // attached devices
    const selectedDevices = selectedDevicesForBridgeOrBond.value.map((option: any) => option.id)
    values.ports = selectedDevices
  }

  await ubusCall('uci', 'set', {
    config: 'network',
    section: deviceSection,
    values: values
  })
}

async function addInterfaceToFirewallZone() {
  const fwZone = props.firewallConfig.zone.find((z: any) => z.name === zone.value)

  if (!fwZone.network) {
    fwZone.network = []
  }

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
    addInterfaceToFirewallZone()
  } else {
    // editing configuration: if firewall zone has changed, remove interface from the old zone

    const oldZone = props.firewallConfig.zone.find((z: any) =>
      z.network?.includes(interfaceName.value)
    )

    if (oldZone.name !== zone.value) {
      removeInterfaceFromOldFirewallZone(oldZone)
      addInterfaceToFirewallZone()
    }
  }
}

function getBondingValues() {
  let values: any = {}

  // ipv4 address and netmask
  values.ipaddr = ipv4Address.value
  values.netmask = ipv4SubnetMask.value

  // attached devices
  const selectedDevices = selectedDevicesForBridgeOrBond.value.map((option: any) => option.id)
  values.slaves = selectedDevices

  // bonding policy
  values.bonding_policy = bondingPolicy.value

  // need to set unused options to empty string
  const options = [
    'packets_per_slave',
    'primary',
    'primary_reselect',
    'fail_over_mac',
    'num_grat_arp__num_unsol_na',
    'xmit_hash_policy',
    'min_links',
    'ad_actor_sys_prio',
    'ad_select',
    'lacp_rate',
    'lp_interval',
    'tlb_dynamic_lb',
    'resend_igmp'
  ]
  for (const option of options) {
    values[option] = ''
  }

  switch (bondingPolicy.value) {
    case 'balance-rr':
      values = { ...values, packets_per_slave: '1' }
      break
    case 'active-backup':
      values = {
        ...values,
        primary: bondPrimaryDevice.value,
        primary_reselect: 'always',
        fail_over_mac: 'none',
        num_grat_arp__num_unsol_na: '1'
      }
      break
    case 'balance-xor':
      values = { ...values, primary: '', xmit_hash_policy: 'layer2' }
      break
    case 'broadcast':
      values = { ...values, primary: '' }
      break
    case '802.3ad':
      values = {
        ...values,
        min_links: '0',
        ad_actor_sys_prio: '65535',
        ad_select: 'stable',
        lacp_rate: 'slow',
        xmit_hash_policy: 'layer2',
        primary: ''
      }
      break
    case 'balance-tlb':
      values = {
        ...values,
        primary: bondPrimaryDevice.value,
        primary_reselect: 'always',
        lp_interval: '1',
        tlb_dynamic_lb: '1',
        xmit_hash_policy: 'layer2'
      }
      break
    case 'balance-alb':
      values = {
        ...values,
        primary: bondPrimaryDevice.value,
        primary_reselect: 'always',
        lp_interval: '1',
        xmit_hash_policy: 'layer2',
        resend_igmp: '1'
      }
      break
  }
  return values
}

async function setNetworkConfiguration() {
  let values: any = {}

  if (props.deviceType === 'logical' && logicalIfaceType.value === 'bond') {
    values = getBondingValues()
  } else {
    // non-bond interfaces

    values.proto = protocol.value

    if (protocol.value === 'static') {
      // ipv4 address and netmask
      values.ipaddr = ipv4Address.value
      values.netmask = ipv4SubnetMask.value

      // ipv6 address
      if (ipv6Address.value && isIpv6Enabled.value) {
        values.ip6addr = [ipv6Address.value]
      } else {
        values.ip6addr = ''
      }

      if (zone.value === 'wan') {
        // gateway
        values.gateway = ipv4Gateway.value

        // ipv6 gateway
        if (isIpv6Enabled.value) {
          values.ip6gw = ipv6Gateway.value
        } else {
          values.ip6gw = ''
        }
      } else {
        values.gateway = ''
        values.ip6gw = ''
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

        // delete dhcp hostname if needed
        if (
          !isConfiguringFromScratch.value &&
          props.interfaceToEdit.hostname &&
          deleteDhcpHostname
        ) {
          await ubusCall('uci', 'delete', {
            config: 'network',
            section: interfaceName.value,
            options: ['hostname']
          })
        }
      }

      // reset any previous static ip address and gateway
      values.ipaddr = ''
      values.netmask = ''
      values.ip6addr = ''
      values.gateway = ''
      values.ip6gw = ''
    } else if (protocol.value === 'pppoe') {
      values.username = pppoeUsername.value
      values.password = pppoePassword.value
    }
  }

  // disable "force link" on red interfaces
  if (zone.value === 'wan') {
    values.force_link = '0'
  }

  await ubusCall('uci', 'set', {
    config: 'network',
    section: interfaceName.value,
    values: values
  })
}

async function createNetworkInterface() {
  const values: any = {}

  if (props.deviceType === 'physical') {
    values.device = props.device.name
    values.proto = protocol.value
  } else {
    if (logicalIfaceType.value === 'bridge') {
      bridgeDeviceName.value = generateDeviceName('br', props.networkConfig)
      values.device = bridgeDeviceName.value
      values.proto = protocol.value
    } else if (logicalIfaceType.value === 'bond') {
      values.proto = 'bonding'
    }
  }

  await ubusCall('uci', 'add', {
    config: 'network',
    type: 'interface',
    name: interfaceName.value,
    values
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

    if (!(props.deviceType === 'logical' && logicalIfaceType.value === 'bond')) {
      await createAndSetNetworkDevice()
    }
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('standalone.interfaces_and_devices.cannot_configure_device')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
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
    } else if (isEmpty(ipv6Address.value)) {
      // ipv6 enabled but no ipv6 address
      error.value.ipv6Address = t(
        'standalone.interfaces_and_devices.ipv6_address_required_if_ipv6_enabled'
      )
      if (isValidationOk) {
        isValidationOk = false
        focusElement(ipv6AddressRef)
      }
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
      deviceType === 'physical'
        ? t('standalone.interfaces_and_devices.configure_interface_for_name', { name: device.name })
        : t('standalone.interfaces_and_devices.create_logical_interface')
    "
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
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
            :placeholder="t('standalone.interfaces_and_devices.select_devices_for_bond')"
            :invalidMessage="error.selectedDevicesForBridgeOrBond"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('standalone.interfaces_and_devices.no_devices_available')"
            :disabled="loading.configure"
            ref="selectedDevicesForBridgeOrBondRef"
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
          />
        </template>
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
        <!-- protocol (don't show for bond) -->
        <NeRadioSelection
          v-if="!(deviceType === 'logical' && logicalIfaceType === 'bond')"
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
            />
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
