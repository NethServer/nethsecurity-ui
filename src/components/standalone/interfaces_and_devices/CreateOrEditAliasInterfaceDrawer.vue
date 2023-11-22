<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
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
  focusElement,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { isEmpty, uniq } from 'lodash-es'
import { ref, watch, type Ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  iface: {
    type: Object,
    required: true
  },
  networkConfigDevice: {
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
  aliasToEdit: {
    type: Object,
    default: null
  },
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let interfaceName = ref('')
let nameRef = ref()
let ipv4Addresses: Ref<string[]> = ref([])
let ipv6Addresses: Ref<string[]> = ref([])
let newIpv4Address = ref('')
let newIpv4AddressRef = ref()
let newIpv6Address = ref('')
let newIpv6AddressRef = ref()

let loading = ref({
  create: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  interfaceName: '',
  ipv4Addresses: [] as string[],
  ipv6Addresses: [] as string[],
  newIpv4Address: '',
  newIpv6Address: ''
})

const isCreating = computed(() => {
  return !props.aliasToEdit
})

const ipv6Enabled = computed(() => {
  return props.networkConfigDevice?.ipv6 === '1'
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      newIpv4Address.value = ''
      newIpv6Address.value = ''

      if (isCreating.value) {
        // creating alias
        interfaceName.value = 'al_' + props.iface['.name']
        ipv4Addresses.value = []
        ipv6Addresses.value = []
        focusElement(nameRef)
      } else {
        // editing alias
        interfaceName.value = props.aliasToEdit['.name']
        ipv4Addresses.value = props.aliasToEdit.ipaddr || []
        ipv6Addresses.value = props.aliasToEdit.ip6addr || []
        focusElement(newIpv4AddressRef)
      }
    }
  }
)

function closeDrawer() {
  emit('close')
}

function deleteIpv4Address(ipv4Address: string) {
  // reset errors to prevent validation errors mismatch
  error.value.ipv4Addresses = []
  error.value.newIpv4Address = ''
  error.value.newIpv6Address = ''

  ipv4Addresses.value = ipv4Addresses.value.filter((elem) => elem !== ipv4Address)
}

function validateNewIpv4Address(ipv4Address: string) {
  error.value.newIpv4Address = ''
  let isValidationOk = true

  // check required
  let { valid, errMessage } = validateRequired(ipv4Address)

  if (!valid) {
    error.value.newIpv4Address = t(errMessage as string)
    isValidationOk = false
  } else {
    {
      // check sintax
      let { valid, errMessage } = validateIp4Cidr(ipv4Address)
      if (!valid) {
        error.value.newIpv4Address = t(errMessage as string)
        isValidationOk = false
      }
    }
  }
  return isValidationOk
}

function validateNewIpv6Address(ipv6Address: string) {
  error.value.newIpv6Address = ''
  let isValidationOk = true

  // check required
  let { valid, errMessage } = validateRequired(ipv6Address)

  if (!valid) {
    error.value.newIpv6Address = t(errMessage as string)
    isValidationOk = false
  } else {
    {
      // check sintax
      let { valid, errMessage } = validateIp6Cidr(ipv6Address)
      if (!valid) {
        error.value.newIpv6Address = t(errMessage as string)
        isValidationOk = false
      }
    }
  }
  return isValidationOk
}

function validateAndAddIpv4Address() {
  const isValidationOk = validateNewIpv4Address(newIpv4Address.value)

  if (!isValidationOk) {
    return false
  }

  if (newIpv4Address.value) {
    ipv4Addresses.value.push(newIpv4Address.value)
    newIpv4Address.value = ''
    focusElement(newIpv4AddressRef)
  }
  return true
}

function validateAndAddIpv6Address() {
  const isValidationOk = validateNewIpv6Address(newIpv6Address.value)

  if (!isValidationOk) {
    return false
  }

  if (newIpv6Address.value) {
    ipv6Addresses.value.push(newIpv6Address.value)
    newIpv6Address.value = ''
    focusElement(newIpv6AddressRef)
  }
  return true
}

function deleteIpv6Address(ipv6Address: string) {
  // reset errors to prevent validation errors mismatch
  error.value.ipv6Addresses = []
  error.value.newIpv4Address = ''
  error.value.newIpv6Address = ''

  ipv6Addresses.value = ipv6Addresses.value.filter((elem) => elem !== ipv6Address)
}

// move to local library util?
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

function validate() {
  clearErrors()

  let isValidationOk = true

  // add new IP address to list if user has not clicked plus button
  if (newIpv4Address.value) {
    let valid = validateAndAddIpv4Address()
    if (!valid) {
      isValidationOk = false
    }
  }

  // add new IP address to list if user has not clicked plus button
  if (newIpv6Address.value) {
    let valid = validateAndAddIpv6Address()
    if (!valid) {
      isValidationOk = false
    }
  }

  // remove duplicates
  ipv4Addresses.value = uniq(ipv4Addresses.value)
  ipv6Addresses.value = uniq(ipv6Addresses.value)

  // name

  {
    // check required
    let { valid, errMessage } = validateRequired(interfaceName.value)
    if (!valid) {
      error.value.interfaceName = t(errMessage as string)
      if (isValidationOk) {
        isValidationOk = false
        focusElement(nameRef)
      }
    } else {
      // check sintax
      {
        let { valid, errMessage, i18Params } = validateUciName(interfaceName.value, 15)
        if (!valid) {
          error.value.interfaceName = t(errMessage as string, i18Params as any)
          if (isValidationOk) {
            isValidationOk = false
            focusElement(nameRef)
          }
        }
      }

      if (isCreating.value) {
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
            focusElement(nameRef)
          }
        }
      }
    }
  }

  if (ipv6Enabled.value) {
    // at least an ipv4 or a ipv6 address is needed
    if (isEmpty(ipv4Addresses.value) && isEmpty(ipv6Addresses.value)) {
      isValidationOk = false

      if (!error.value.newIpv4Address && !error.value.newIpv6Address) {
        error.value.newIpv4Address = t(
          'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
        )
        error.value.newIpv6Address = t(
          'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
        )
      }
    }
  } else {
    // ipv6 disabled: at least an ipv4 is required

    if (isEmpty(ipv4Addresses.value)) {
      error.value.newIpv4Address = t('standalone.interfaces_and_devices.enter_ipv4_address')

      if (isValidationOk) {
        isValidationOk = false
        focusElement(newIpv4AddressRef)
      }
    }
  }

  // ipv4 addresses

  for (let index = 0; index < ipv4Addresses.value.length; index++) {
    const ipv4Address = ipv4Addresses.value[index]

    {
      // check required
      let { valid, errMessage } = validateRequired(ipv4Address)

      if (!valid) {
        error.value.ipv4Addresses[index] = t(errMessage as string)
        isValidationOk = false
      } else {
        {
          // check sintax
          let { valid, errMessage } = validateIp4Cidr(ipv4Address)
          if (!valid) {
            error.value.ipv4Addresses[index] = t(errMessage as string)
            isValidationOk = false
          }
        }
      }
    }
  }

  // ipv6 addresses

  if (ipv6Enabled.value) {
    for (let index = 0; index < ipv6Addresses.value.length; index++) {
      const ipv6Address = ipv6Addresses.value[index]

      {
        // check required
        let { valid, errMessage } = validateRequired(ipv6Address)

        if (!valid) {
          error.value.ipv6Addresses[index] = t(errMessage as string)
          isValidationOk = false
        } else {
          {
            // check sintax
            let { valid, errMessage } = validateIp6Cidr(ipv6Address)
            if (!valid) {
              error.value.ipv6Addresses[index] = t(errMessage as string)
              isValidationOk = false
            }
          }
        }
      }
    }
  }

  return isValidationOk
}

async function addNetworkInterface() {
  await ubusCall('uci', 'add', {
    config: 'network',
    name: interfaceName.value,
    type: 'interface',
    values: {
      proto: 'static',
      device: `@${props.iface['.name']}`
    }
  })
}

async function setIpAddressList() {
  const valuesToSet: any = {}
  const optionsToDelete = []

  if (!isEmpty(ipv4Addresses.value)) {
    valuesToSet.ipaddr = ipv4Addresses.value
  } else if (!isCreating.value && props.aliasToEdit.ipaddr) {
    // ip address list has been cleared
    optionsToDelete.push('ipaddr')
  }

  if (!isEmpty(ipv6Addresses.value)) {
    valuesToSet.ip6addr = ipv6Addresses.value
  } else if (!isCreating.value && props.aliasToEdit.ip6addr) {
    // ip address list has been cleared
    optionsToDelete.push('ip6addr')
  }

  // set non-empty ip address lists

  if (!isEmpty(valuesToSet)) {
    await ubusCall('uci', 'set', {
      config: 'network',
      section: interfaceName.value,
      values: valuesToSet
    })
  }

  // delete empty ip address lists

  if (!isEmpty(optionsToDelete)) {
    await ubusCall('uci', 'delete', {
      config: 'network',
      section: interfaceName.value,
      options: optionsToDelete
    })
  }
}

async function setFirewallZone() {
  const zoneFound = props.firewallConfig.zone.find((zone: any) =>
    zone.network.includes(props.iface['.name'])
  )

  // add alias interface to zone interfaces
  zoneFound.network.push(interfaceName.value)

  if (zoneFound) {
    await ubusCall('uci', 'set', {
      config: 'firewall',
      section: zoneFound['.name'],
      values: {
        network: zoneFound.network
      }
    })
  }
}

async function saveAliasInterface() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  loading.value.create = true

  try {
    await addNetworkInterface()
    await setIpAddressList()
    await setFirewallZone()
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t(
      'standalone.interfaces_and_devices.cannot_save_alias_interface'
    )
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.create = false
    await uciChangesStore.getChanges()
  }
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="
      isCreating
        ? t('standalone.interfaces_and_devices.create_alias_for_interface', {
            interface: iface['.name']
          })
        : t('standalone.interfaces_and_devices.edit_alias_interface')
    "
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <NeTextInput
          :label="t('standalone.interfaces_and_devices.name')"
          v-model.trim="interfaceName"
          :invalidMessage="t(error.interfaceName)"
          :disabled="loading.create || !isCreating"
          ref="nameRef"
        />
        <!-- ip v4 address list -->
        <div>
          <NeFormItemLabel>{{
            t('standalone.interfaces_and_devices.ipv4_address_cidr')
          }}</NeFormItemLabel>
          <div class="space-y-4">
            <TransitionGroup name="fade">
              <div
                v-for="(ipv4Address, i) in ipv4Addresses"
                :key="i"
                class="flex items-start gap-2"
              >
                <NeTextInput
                  v-model.trim="ipv4Addresses[i]"
                  :invalid-message="error.ipv4Addresses[i]"
                  class="grow"
                />
                <NeButton
                  kind="tertiary"
                  size="lg"
                  @click.prevent="deleteIpv4Address(ipv4Address)"
                  :disabled="loading.create"
                  class="py-2.5"
                >
                  <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" aria-hidden="true" />
                </NeButton>
              </div>
            </TransitionGroup>
            <!-- add ipv4 address -->
            <div class="flex items-start gap-2">
              <NeTextInput
                v-model.trim="newIpv4Address"
                :invalid-message="error.newIpv4Address"
                :placeholder="t('standalone.interfaces_and_devices.add_ipv4_address')"
                :disabled="loading.create"
                @keyup.enter="validateAndAddIpv4Address()"
                class="grow"
                ref="newIpv4AddressRef"
              />
              <NeButton
                kind="tertiary"
                size="lg"
                @click.prevent="validateAndAddIpv4Address()"
                :disabled="loading.create"
                class="py-2.5"
              >
                <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
              </NeButton>
            </div>
          </div>
        </div>
        <!-- ip v6 address list (only if ipv6 is enabled) -->
        <div v-if="ipv6Enabled">
          <NeFormItemLabel>{{
            t('standalone.interfaces_and_devices.ipv6_address_cidr')
          }}</NeFormItemLabel>
          <div class="space-y-4">
            <TransitionGroup name="fade">
              <div
                v-for="(ipv6Address, i) in ipv6Addresses"
                :key="i"
                class="flex items-start gap-2"
              >
                <NeTextInput
                  v-model.trim="ipv6Addresses[i]"
                  :invalid-message="error.ipv6Addresses[i]"
                  class="grow"
                />
                <NeButton
                  kind="tertiary"
                  size="lg"
                  @click.prevent="deleteIpv6Address(ipv6Address)"
                  :disabled="loading.create"
                  class="py-2.5"
                >
                  <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" aria-hidden="true" />
                </NeButton>
              </div>
            </TransitionGroup>
            <!-- add ipv6 address -->
            <div class="flex items-start gap-2">
              <NeTextInput
                v-model.trim="newIpv6Address"
                :invalid-message="error.newIpv6Address"
                :placeholder="t('standalone.interfaces_and_devices.add_ipv6_address')"
                :disabled="loading.create"
                @keyup.enter="validateAndAddIpv6Address()"
                class="grow"
                ref="newIpv6AddressRef"
              />
              <NeButton
                kind="tertiary"
                size="lg"
                @click.prevent="validateAndAddIpv6Address()"
                :disabled="loading.create"
                class="py-2.5"
              >
                <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
              </NeButton>
            </div>
          </div>
        </div>
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
          :disabled="loading.create"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="saveAliasInterface"
          :disabled="loading.create"
          :loading="loading.create"
        >
          {{
            isCreating
              ? t('standalone.interfaces_and_devices.create_alias')
              : t('standalone.interfaces_and_devices.save_alias')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
