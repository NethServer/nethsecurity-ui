<!--
  Copyright (C) 2024 Nethesis S.r.l.
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
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { uniq } from 'lodash-es'
import { ref, watch, type Ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import NeMultiTextInput from '../NeMultiTextInput.vue'

const props = defineProps({
  iface: {
    type: Object,
    required: true
  },
  networkConfigDevice: {
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
let ipv4AddressRef = ref()
let ipv4Addresses: Ref<string[]> = ref([''])
let ipv6Addresses: Ref<string[]> = ref([''])

const ipv4AddressesNotEmpty = computed(() => ipv4Addresses.value.some((x) => x != ''))
const ipv6AddressesNotEmpty = computed(() => ipv6Addresses.value.some((x) => x != ''))

let loading = ref({
  create: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: '',
  interfaceName: '',
  ipv4Addresses: [] as string[],
  ipv6Addresses: [] as string[],
  ipv4AddressList: '',
  ipv6AddressList: ''
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

      if (isCreating.value) {
        // creating alias
        interfaceName.value = 'al_' + props.iface['.name']
        ipv4Addresses.value = ['']
        ipv6Addresses.value = ['']
        focusElement(nameRef)
      } else {
        // editing alias
        interfaceName.value = props.aliasToEdit['.name']
        ipv4Addresses.value = props.aliasToEdit.ipaddr || ['']
        ipv6Addresses.value = props.aliasToEdit.ip6addr || ['']
        focusElement(ipv4AddressRef)
      }
    }
  }
)

function closeDrawer() {
  emit('close')
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
      // check syntax
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
    if (!ipv4AddressesNotEmpty.value && !ipv6AddressesNotEmpty.value) {
      isValidationOk = false

      if (!error.value.ipv4AddressList && !error.value.ipv6AddressList) {
        error.value.ipv4AddressList = t(
          'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
        )
        error.value.ipv6AddressList = t(
          'standalone.interfaces_and_devices.enter_one_ipv4_or_ipv6_address'
        )
      }
    }
  } else {
    // ipv6 disabled: at least an ipv4 is required

    if (!ipv4AddressesNotEmpty.value) {
      error.value.ipv4AddressList = t('standalone.interfaces_and_devices.enter_ipv4_address')

      if (isValidationOk) {
        isValidationOk = false
        focusElement(ipv4AddressRef)
      }
    }
  }

  // ipv4 addresses

  // if ipv6 is enabled and ipv4 fields are empty whereas the ipv6 ones are filled,
  // these validators aren't applied
  if (!ipv6Enabled.value || ipv4AddressesNotEmpty.value || !ipv6AddressesNotEmpty.value) {
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
            // check syntax
            let { valid, errMessage } = validateIp4Cidr(ipv4Address)
            if (!valid) {
              error.value.ipv4Addresses[index] = t(errMessage as string)
              isValidationOk = false
            }
          }
        }
      }
    }
  }

  // ipv6 addresses

  // if ipv6 fields are empty whereas the ipv4 ones are filled, these validators aren't applied
  if (ipv6Enabled.value && (ipv6AddressesNotEmpty.value || !ipv4AddressesNotEmpty.value)) {
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
            // check syntax
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

async function saveAliasInterface() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  loading.value.create = true
  const action = isCreating.value ? 'create-alias-interface' : 'edit-alias-interface'

  try {
    await ubusCall('ns.devices', action, {
      alias_iface_name: interfaceName.value,
      parent_iface_name: props.iface['.name'],
      ip4_addresses: uniq(ipv4Addresses.value).filter((x) => x != ''),
      ip6_addresses: uniq(ipv6Addresses.value).filter((x) => x != '')
    })
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
    :closeAriaLabel="t('common.shell.close_side_drawer')"
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
        <NeMultiTextInput
          :title="t('standalone.interfaces_and_devices.ipv4_address_cidr')"
          :add-item-label="t('standalone.interfaces_and_devices.add_ip_address')"
          v-model="ipv4Addresses"
          :invalid-messages="error.ipv4Addresses"
          :general-invalid-message="error.ipv4AddressList"
          ref="ipv4AddressRef"
          :required="true"
        />
        <!-- ip v6 address list (only if ipv6 is enabled) -->
        <NeMultiTextInput
          v-if="ipv6Enabled"
          :title="t('standalone.interfaces_and_devices.ipv6_address_cidr')"
          :add-item-label="t('standalone.interfaces_and_devices.add_ip_address')"
          v-model="ipv6Addresses"
          :invalid-messages="error.ipv6Addresses"
          :general-invalid-message="error.ipv6AddressList"
          :required="true"
        />
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
