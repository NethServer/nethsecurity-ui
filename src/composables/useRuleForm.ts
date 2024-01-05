//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { useI18n } from 'vue-i18n'
import { type NeComboboxOption } from '@nethesis/vue-components'
import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'
import type { Policy, Rule } from '@/composables/useMwan'
import { MessageBag, validateIp4Cidr, validatePortRange, validateRequired } from '@/lib/validation'

export function useRuleForm(policies: Ref<Policy[]>, rule?: Ref<Rule | undefined>) {
  const { t } = useI18n()

  const protocolOptions: NeComboboxOption[] = [
    {
      id: 'all',
      label: t('standalone.multi_wan.all_protocols')
    },
    {
      id: 'tcp',
      label: 'tcp'
    },
    {
      id: 'udp',
      label: 'udp'
    },
    {
      id: 'icmp',
      label: 'icmp'
    },
    {
      id: 'esp',
      label: 'esp'
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

  const validationErrors = ref(new MessageBag())

  function isValid() {
    validationErrors.value.clear()
    let validationCheck = validateRequired(name.value)
    if (!validationCheck.valid) {
      validationErrors.value.set('name', t(String(validationCheck.errMessage)))
    }
    validationCheck = validateRequired(policy.value)
    if (!validationCheck.valid) {
      validationErrors.value.set('policy', t(String(validationCheck.errMessage)))
    }
    if (sourceAddress.value != '') {
      validationCheck = validateIp4Cidr(sourceAddress.value)
      if (!validationCheck.valid) {
        validationErrors.value.set('source_address', t(String(validationCheck.errMessage)))
      }
    }
    if (destinationAddress.value != '') {
      validationCheck = validateIp4Cidr(destinationAddress.value)
      if (!validationCheck.valid) {
        validationErrors.value.set('destination_address', t(String(validationCheck.errMessage)))
      }
    }
    if (protocol.value == 'tcp' || protocol.value == 'udp') {
      if (sourcePort.value != '') {
        validationCheck = validatePortRange(sourcePort.value)
        if (!validationCheck.valid) {
          validationErrors.value.set('source_port', t(String(validationCheck.errMessage)))
        }
      }
      if (destinationPort.value != '') {
        validationCheck = validatePortRange(destinationPort.value)
        if (!validationCheck.valid) {
          validationErrors.value.set('destination_port', t(String(validationCheck.errMessage)))
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
    isValid
  }
}
