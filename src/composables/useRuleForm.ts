//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useI18n } from 'vue-i18n'
import { type NeComboboxOption } from '@nethesis/vue-components'
import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'
import type { Policy, Rule } from '@/composables/useMwan'
import {
  MessageBag,
  validateIp4OrCidr,
  validatePortRangeForMwan,
  validateRequired,
  validateUciName
} from '@/lib/validation'
import { type ObjectReference, useObjects } from '@/composables/useObjects'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

export function useRuleForm(policies: Ref<Policy[]>, rule?: Ref<Rule | undefined>) {
  const { t } = useI18n()

  const protocolOptions: NeComboboxOption[] = [
    {
      id: 'all',
      label: t('standalone.multi_wan.all_protocols')
    },
    {
      id: 'tcp',
      label: 'TCP'
    },
    {
      id: 'udp',
      label: 'UDP'
    },
    {
      id: 'icmp',
      label: 'ICMP'
    },
    {
      id: 'esp',
      label: 'ESP'
    }
  ]

  const policyDropdownOptions = computed((): NeComboboxOption[] => {
    return policies.value.map((policy) => {
      return {
        id: policy.name,
        label: policy.label ?? policy.name
      }
    })
  })

  const policyDropdownPlaceholder = computed((): string => {
    if (policyDropdownOptions.value.length < 3) {
      return t('standalone.multi_wan.select_policy')
    }
    return policyDropdownOptions.value.map((option) => option.label).join(', ') + ',...'
  })

  watch(
    () => rule?.value,
    () => {
      if (rule?.value != undefined) {
        name.value = rule.value.label ?? ''
        policy.value = rule.value.policy.name
        protocol.value = rule.value.protocol ?? protocolOptions[0].id
        sourceAddress.value = rule.value.source_address ?? ''
        sourcePort.value = rule.value.source_port ?? ''
        destinationAddress.value = rule.value.destination_address ?? ''
        destinationPort.value = rule.value.destination_port ?? ''
        sticky.value = rule.value.sticky
        srcObject.value = rule.value.ns_src
        dstObject.value = rule.value.ns_dst
        if (srcObject.value != undefined) {
          srcType.value = 'object'
        } else if (sourceAddress.value != '') {
          srcType.value = 'address'
        } else {
          srcType.value = 'any'
        }
        if (dstObject.value != undefined) {
          dstType.value = 'object'
        } else if (destinationAddress.value != '') {
          dstType.value = 'address'
        } else {
          dstType.value = 'any'
        }
      }
    }
  )

  const name = ref('')
  const policy = ref('')
  const protocol = ref('')
  const sourceAddress = ref('')
  const sourcePort = ref('')
  const destinationAddress = ref('')
  const destinationPort = ref('')
  const sticky = ref(false)

  type AddressType = 'any' | 'address' | 'object'

  const srcAddressOptions: { id: AddressType; label: string }[] = [
    { id: 'address', label: t('standalone.multi_wan.address_options_address') },
    { id: 'any', label: t('standalone.multi_wan.address_options_any_src') },
    { id: 'object', label: t('standalone.multi_wan.address_options_object') }
  ]

  const dstAddressOptions: { id: AddressType; label: string }[] = [
    { id: 'address', label: t('standalone.multi_wan.address_options_address') },
    { id: 'any', label: t('standalone.multi_wan.address_options_any_dst') },
    { id: 'object', label: t('standalone.multi_wan.address_options_object') }
  ]

  const srcType = ref<AddressType>('address')
  const dstType = ref<AddressType>('address')

  type ObjectResponse = {
    objects: {
      ns_dst: ObjectReference[]
      ns_src: ObjectReference[]
    }
  }

  const srcObject = ref<string>()
  const dstObject = ref<string>()
  const objectsError = ref<Error>()
  const objectsLoading = ref(true)
  const srcObjectOptions = ref<NeComboboxOption[]>([])
  const dstObjectOptions = ref<NeComboboxOption[]>([])

  const { getObjectIcon } = useObjects()

  // fetching objects
  ubusCall('ns.mwan', 'list_object_suggestions')
    .then((response: AxiosResponse<ObjectResponse>) => {
      srcObjectOptions.value = response.data.objects.ns_src.map((item) => {
        return {
          id: item.id,
          label: item.name,
          description: t(`standalone.objects.subtype_${item.subtype}`),
          icon: getObjectIcon(item.subtype)
        }
      })
      dstObjectOptions.value = response.data.objects.ns_dst.map((item) => {
        return {
          id: item.id,
          label: item.name,
          description: t(`standalone.objects.subtype_${item.subtype}`),
          icon: getObjectIcon(item.subtype)
        }
      })
    })
    .catch(() => {
      objectsError.value = Error('standalone.multi_wan.error_fetching_objects')
    })
    .finally(() => {
      objectsLoading.value = false
    })

  const validationErrors = ref(new MessageBag())

  function isValid() {
    validationErrors.value.clear()
    let validationCheck = validateRequired(policy.value)
    if (!validationCheck.valid) {
      validationErrors.value.set('policy', String(validationCheck.errMessage))
    }
    validationCheck = validateRequired(policy.value)
    if (!validationCheck.valid) {
      validationErrors.value.set('policy', String(validationCheck.errMessage))
    }
    if (name.value != 'Default Rule') {
      validationCheck = validateRequired(name.value)
      if (!validationCheck.valid) {
        validationErrors.value.set('name', String(validationCheck.errMessage))
      }
      const { valid, errMessage, i18Params } = validateUciName(name.value, 12)
      if (!valid) {
        validationErrors.value.set('name', t(errMessage as string, i18Params as any))
      }
    }
    if (sourceAddress.value != '') {
      validationCheck = validateIp4OrCidr(sourceAddress.value)
      if (!validationCheck.valid) {
        validationErrors.value.set('source_address', String(validationCheck.errMessage))
      }
    }
    if (destinationAddress.value != '') {
      validationCheck = validateIp4OrCidr(destinationAddress.value)
      if (!validationCheck.valid) {
        validationErrors.value.set('destination_address', String(validationCheck.errMessage))
      }
    }
    if (protocol.value == 'tcp' || protocol.value == 'udp') {
      if (sourcePort.value != '') {
        validationCheck = validatePortRangeForMwan(sourcePort.value)
        if (!validationCheck.valid) {
          validationErrors.value.set('source_port', String(validationCheck.errMessage))
        }
      }
      if (destinationPort.value != '') {
        validationCheck = validatePortRangeForMwan(destinationPort.value)
        if (!validationCheck.valid) {
          validationErrors.value.set('destination_port', String(validationCheck.errMessage))
        }
      }
    }
    return validationErrors.value.size < 1
  }

  return {
    protocolOptions,
    policyDropdownOptions,
    policyDropdownPlaceholder,
    name,
    policy,
    protocol,
    sourceAddress,
    sourcePort,
    destinationAddress,
    destinationPort,
    validationErrors,
    sticky,
    isValid,
    srcType,
    dstType,
    srcAddressOptions,
    dstAddressOptions,
    objectsLoading,
    objectsError,
    srcObject,
    srcObjectOptions,
    dstObject,
    dstObjectOptions
  }
}
