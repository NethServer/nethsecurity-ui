<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getZoneColor, getZoneIcon, getZoneLabel } from '@/lib/standalone/network'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  validateIp4Cidr,
  validateIp6Cidr,
  validateRequired,
  validateUciName
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
import { isEmpty, uniq } from 'lodash'
import { ref, watch, type Ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

//// review

const props = defineProps({
  device: {
    type: Object,
    required: true
  },
  firewallConfig: {
    type: Object,
    required: true
  },
  // interfaces: { ////
  //   type: Array,
  //   required: true
  // },
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let name = ref('')
let labelRef = ref()
let zone = ref('lan')
let protocol = ref('static')
let ipv4Address = ref('')
let ipv4AddressRef = ref()
let ipv4SubnetMark = ref('255.255.255.0')
let ipv4SubnetMarkRef = ref()
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
let clientId = ref('')
let clientIdRef = ref()
let vendorClass = ref('')
let vendorClassRef = ref()

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

let loading = ref({
  configure: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  label: '',
  ipv4Address: '',
  ipv4SubnetMark: '',
  ipv4Gateway: '',
  ipv6Address: '',
  ipv6Gateway: '',
  ipv4Mtu: '',
  ipv6Mtu: '',
  clientId: '',
  vendorClass: ''
})

const zoneOptions = computed(() => {
  console.log('props.firewallConfig', props.firewallConfig) ////

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

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      name.value = ''
      zone.value = 'lan'
      protocol.value = 'static'
      focusElement(labelRef)
    }
  }
)

watch(zone, () => {
  // only red interface support PPoE
  if (zone.value !== 'wan' && protocol.value === 'pppoe') {
    protocol.value = 'static'

    console.log('set protocol', protocol.value) ////
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

function configureDevice() {
  console.log('configureDevice') ////
}

function validate() {
  clearErrors()

  let isValidationOk = true

  // label

  // { ////
  //   // check required
  //   let { valid, errMessage } = validateRequired(label.value) ////
  //   if (!valid) {
  //     error.value.label = t(errMessage as string)
  //     isValidationOk = false
  //     focusElement(labelRef)
  //   } else {
  //     // check sintax
  //     {
  //       let { valid, errMessage } = validateUciName(label.value)
  //       if (!valid) {
  //         error.value.name = t(errMessage as string)
  //         isValidationOk = false
  //         focusElement(labelRef)
  //       }
  //     }

  //     if (isCreating.value) {
  //       // check if already used
  //       const interfaceFound = props.interfaces.find(
  //         (iface: any) => iface.interface === label.value
  //       )

  //       if (interfaceFound) {
  //         error.value.name = t('standalone.interfaces_and_devices.interface_name_already_used')
  //         isValidationOk = false
  //         focusElement(labelRef)
  //       }
  //     }
  //   }
  // }

  // // at least an ipv4 or a ipv6 address is needed
  // if (isEmpty(ipv4Addresses.value) && isEmpty(ipv6Addresses.value)) {
  //   isValidationOk = false

  //   if (!error.value.newIpv4Address && !error.value.newIpv6Address) {
  //     error.value.newIpv4Address = t(
  //       'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
  //     )
  //     error.value.newIpv6Address = t(
  //       'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
  //     )
  //   }
  // }

  // // ipv4 addresses

  // for (let index = 0; index < ipv4Addresses.value.length; index++) {
  //   const ipv4Address = ipv4Addresses.value[index]

  //   {
  //     // check required
  //     let { valid, errMessage } = validateRequired(ipv4Address)

  //     if (!valid) {
  //       error.value.ipv4Addresses[index] = t(errMessage as string)
  //       isValidationOk = false
  //     } else {
  //       {
  //         // check sintax
  //         let { valid, errMessage } = validateIp4Cidr(ipv4Address)
  //         if (!valid) {
  //           error.value.ipv4Addresses[index] = t(errMessage as string)
  //           isValidationOk = false
  //         }
  //       }
  //     }
  //   }
  // }

  // // ipv6 addresses

  // for (let index = 0; index < ipv6Addresses.value.length; index++) {
  //   const ipv6Address = ipv6Addresses.value[index]

  //   {
  //     // check required
  //     let { valid, errMessage } = validateRequired(ipv6Address)

  //     if (!valid) {
  //       error.value.ipv6Addresses[index] = t(errMessage as string)
  //       isValidationOk = false
  //     } else {
  //       {
  //         // check sintax
  //         let { valid, errMessage } = validateIp6Cidr(ipv6Address)
  //         if (!valid) {
  //           error.value.ipv6Addresses[index] = t(errMessage as string)
  //           isValidationOk = false
  //         }
  //       }
  //     }
  //   }
  // }

  return isValidationOk
}

// async function addNetworkInterface() { ////
//   await ubusCall('uci', 'add', {
//     config: 'network',
//     name: label.value,
//     type: 'interface',
//     values: {
//       proto: 'static',
//       device: `@${props.iface.interface}`
//     }
//   })
// }

// async function setIpAddressList() {
//   const values: any = {}

//   if (!isEmpty(ipv4Addresses.value)) {
//     values.ipaddr = ipv4Addresses.value
//   }

//   if (!isEmpty(ipv6Addresses.value)) {
//     values.ip6addr = ipv6Addresses.value
//   }

//   await ubusCall('uci', 'set', {
//     config: 'network',
//     section: label.value,
//     values: values
//   })
// }

// async function saveAliasInterface() { ////
//   const isValidationOk = validate()
//   if (!isValidationOk) {
//     return
//   }

//   loading.value.configure = true

//   try {
//     await addNetworkInterface()
//     await setIpAddressList()
//     await setFirewallZone()
//     emit('reloadData')
//     closeDrawer()
//   } catch (err: any) {
//     console.error(err)
//     error.value.notificationTitle = t(
//       'standalone.interfaces_and_devices.cannot_save_alias_interface'
//     )
//     error.value.notificationDescription = t(getAxiosErrorMessage(err))
//   } finally {
//     loading.value.configure = false
//     await uciChangesStore.getChanges()
//   }
// }
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="t('standalone.interfaces_and_devices.configure_name', { name: device.name })"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <!-- name -->
        <NeTextInput
          :label="t('standalone.interfaces_and_devices.interface_name')"
          v-model.trim="name"
          :invalidMessage="t(error.label)"
          :disabled="loading.configure"
          ref="labelRef"
        />
        <!-- zone -->
        <NeRadioSelection
          v-model="zone"
          card
          :label="t('standalone.interfaces_and_devices.zone')"
          :options="zoneOptions"
        />
        <!-- protocol -->
        <NeRadioSelection
          v-model="protocol"
          :label="t('standalone.interfaces_and_devices.protocol')"
          :options="protocolOptions"
        />
        <!-- fields for static protocol -->
        <Transition name="fade">
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
              v-model.trim="ipv4SubnetMark"
              :invalidMessage="t(error.ipv4SubnetMark)"
              :disabled="loading.configure"
              ref="ipv4SubnetMarkRef"
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
            <Transition name="fade">
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
            </Transition>
          </div>
        </Transition>
        <!-- advanced settings -->
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
              :label="t('standalone.interfaces_and_devices.ipv6_mtu_bytes')"
              v-model.trim="ipv6Mtu"
              placeholder="1500"
              optional
              :invalidMessage="t(error.ipv6Mtu)"
              :disabled="loading.configure"
              ref="ipv6MtuRef"
            />
            <!-- dhcp fields -->
            <template v-if="['dhcp', 'dhcpv6'].includes(protocol)">
              <!-- client id -->
              <NeTextInput
                :label="t('standalone.interfaces_and_devices.client_id_label')"
                v-model.trim="clientId"
                optional
                :invalidMessage="t(error.clientId)"
                :disabled="loading.configure"
                ref="clientIdRef"
              />
              <!-- vendor class -->
              <NeTextInput
                :label="t('standalone.interfaces_and_devices.vendor_class_label')"
                v-model.trim="vendorClass"
                optional
                :invalidMessage="t(error.vendorClass)"
                :disabled="loading.configure"
                ref="vendorClassRef"
              />
            </template>
          </div>
        </Transition>
        <!-- //// -->
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
          {{ t('standalone.interfaces_and_devices.configure') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
