<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeSideDrawer,
  NeTextInput,
  NeButton,
  NeInlineNotification,
  NeToggle,
  NeRadioSelection,
  getAxiosErrorMessage,
  focusElement
} from '@nethserver/vue-tailwind-lib'
import { ref, computed, type PropType, type Ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useFirewallStore,
  type RuleService,
  type RuleHost,
  type FirewallRuleAction,
  type FirewallRule
} from '@/stores/standalone/firewall'
import { NeCombobox, type NeComboboxOption, NeTooltip } from '@nethesis/vue-components'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import {
  MessageBag,
  validateIpAddressRange,
  validateIpAddress,
  validateIpCidr,
  validatePortListOrRange,
  validateRequired,
  validateRequiredOption
} from '@/lib/validation'

const props = defineProps({
  ruleType: {
    type: String as PropType<'forward' | 'input' | 'output'>,
    required: true
  },
  currentRule: {
    type: Object as PropType<FirewallRule>
  },
  isDuplicatingRule: {
    type: Boolean,
    default: false
  },
  isShown: { type: Boolean, default: false },
  knownTags: {
    type: Array as PropType<NeComboboxOption[]>,
    required: true
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const firewallConfig = useFirewallStore()
const isRuleEnabled = ref(true)
const name = ref('')
const nameRef = ref()
const sourceAddresses = ref<NeComboboxOption[]>([])
const sourceAddressesRef = ref()
const destinationAddresses = ref<NeComboboxOption[]>([])
const destinationAddressesRef = ref()
const sourceZone = ref('*')
const sourceZoneRef = ref()
const destinationZone = ref('*')
const destinationZoneRef = ref()
const addressOptions = ref<NeComboboxOption[]>([])
const service = ref('*')
const serviceRef = ref()
const serviceSuggestions = ref<NeComboboxOption[]>([])
const action: Ref<FirewallRuleAction> = ref('DROP')
const protocols = ref<NeComboboxOption[]>([])
const protocolsRef = ref()
const protocolOptions = ref<NeComboboxOption[]>([])
const ports = ref('')
const portsRef = ref()
const position = ref('bottom')
const isExpandedAdvancedSettings = ref(false)
const tags: Ref<NeComboboxOption[]> = ref([])
const isLoggingEnabled = ref(false)
const errorBag = ref(new MessageBag())

const actionOptions = ref([
  {
    id: 'DROP',
    label: t('standalone.firewall_rules.drop')
  },
  {
    id: 'REJECT',
    label: t('standalone.firewall_rules.reject')
  },
  {
    id: 'ACCEPT',
    label: t('standalone.firewall_rules.accept')
  }
])

const positionOptions = ref([
  {
    id: 'bottom',
    label: t('standalone.firewall_rules.add_to_the_bottom')
  },
  {
    id: 'top',
    label: t('standalone.firewall_rules.add_to_the_top')
  }
])

let loading = ref({
  listServiceSuggestions: false,
  listHostSuggestions: false,
  listProtocols: false,
  saveRule: false
})

let error = ref({
  listServiceSuggestions: '',
  listServiceSuggestionsDetails: '',
  listHostSuggestions: '',
  listHostSuggestionsDetails: '',
  listProtocols: '',
  listProtocolsDetails: '',
  saveRule: '',
  saveRuleDetails: ''
})

const isCreatingRule = computed(() => {
  return !props.currentRule
})

const isEditingRule = computed(() => {
  return !!props.currentRule && !props.isDuplicatingRule
})

const drawerTitle = computed(() => {
  if (isEditingRule.value) {
    return t('standalone.firewall_rules.edit_rule')
  } else if (props.isDuplicatingRule) {
    return t('standalone.firewall_rules.duplicate_rule')
  } else {
    switch (props.ruleType) {
      case 'forward':
        return t('standalone.firewall_rules.add_forward_rule')
      case 'input':
        return t('standalone.firewall_rules.add_input_rule')
      case 'output':
        return t('standalone.firewall_rules.add_output_rule')
      default:
        return ''
    }
  }
})

const serviceOptions = computed(() => {
  const staticOptions: NeComboboxOption[] = [
    {
      id: '*',
      label: t('common.any')
    },
    {
      id: 'custom',
      label: t('standalone.firewall_rules.custom_service')
    }
  ]
  return [...staticOptions, ...serviceSuggestions.value]
})

const zoneOptions = computed(() => {
  const anyAddress = {
    id: '*',
    label: t('common.any')
  }

  const zones: NeComboboxOption[] = firewallConfig.zones.map((zone) => {
    return {
      id: zone.name,
      label: zone.name.toUpperCase(),
      description: zone.interfaces?.join(', ')
    }
  })
  return [anyAddress, ...zones]
})

const isTcpOrUdpProtocolSelected = computed(() => {
  return protocols.value.some((protocol) => {
    return protocol.id === 'tcp' || protocol.id === 'udp'
  })
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      errorBag.value.clear()

      nextTick(() => {
        focusElement(nameRef)
      })
      listServiceSuggestions()
      listHostSuggestions()

      if (isCreatingRule.value) {
        // creating rule, reset form to defaults
        isRuleEnabled.value = true
        name.value = ''
        sourceAddresses.value = []
        destinationAddresses.value = []
        sourceZone.value = '*'
        destinationZone.value = '*'
        service.value = '*'
        action.value = 'DROP'
        protocols.value = []
        ports.value = ''
        position.value = 'bottom'
        tags.value = []
        isLoggingEnabled.value = false
        isExpandedAdvancedSettings.value = false
      } else if (props.currentRule) {
        // editing or duplicating rule
        isRuleEnabled.value = props.currentRule.enabled || false
        // source/destination addresses will be set inside listHostSuggestions
        sourceZone.value = props.currentRule.src || '*'
        destinationZone.value = props.currentRule.dest || '*'
        service.value = '*'
        protocols.value = []
        // service, protocols and ports will be set inside listServiceSuggestions
        action.value = props.currentRule.target || 'DROP'
        position.value = 'bottom'
        tags.value =
          props.currentRule.ns_tag?.map((tag) => {
            return {
              id: tag,
              label: tag
            }
          }) || []
        isLoggingEnabled.value = props.currentRule.log || false
        isExpandedAdvancedSettings.value = tags.value.length > 0 || isLoggingEnabled.value

        // rule name
        if (isEditingRule.value) {
          name.value = props.currentRule.name || ''
        } else {
          // duplicating rule
          name.value = t('standalone.firewall_rules.duplicated_rule_name', {
            name: props.currentRule.name
          })
        }
      }
    }
  }
)

watch(
  () => service.value,
  () => {
    if (service.value === 'custom') {
      listProtocols()
    }
  }
)

function mapSourceAddressesToUi(rule: FirewallRule) {
  if (!rule.src_ip) {
    return []
  }
  const srcAddresses = []

  for (const srcIp of rule.src_ip) {
    const srcAddr = srcIp as RuleHost
    const addrFound = addressOptions.value.find((addr: NeComboboxOption) => {
      return addr.id === srcAddr.value
    })

    if (addrFound) {
      srcAddresses.push(addrFound)
    } else {
      const userInputAddr: NeComboboxOption = {
        id: srcAddr.value,
        label: srcAddr.value
      }

      // add user input to addressOptions and selection
      addressOptions.value.push(userInputAddr)
      srcAddresses.push(userInputAddr)
    }
  }
  return srcAddresses
}

function mapDestinationAddressesToUi(rule: FirewallRule) {
  if (!rule.dest_ip) {
    return []
  }
  const destAddresses = []

  for (const destIp of rule.dest_ip) {
    const destAddr = destIp as RuleHost
    const addrFound = addressOptions.value.find((addr: NeComboboxOption) => {
      return addr.id === destAddr.value
    })

    if (addrFound) {
      destAddresses.push(addrFound)
    } else {
      const userInputAddr: NeComboboxOption = {
        id: destAddr.value,
        label: destAddr.value
      }

      // add user input to addressOptions and selection
      addressOptions.value.push(userInputAddr)
      destAddresses.push(userInputAddr)
    }
  }
  return destAddresses
}

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

async function listHostSuggestions() {
  loading.value.listHostSuggestions = true

  try {
    const res = await ubusCall('ns.firewall', 'list-host-suggestions')
    addressOptions.value = res.data.hosts.map((host: RuleHost) => {
      const description = `${host.label} (${host.type})`

      return {
        id: host.value,
        label: host.value,
        description
      }
    })

    if (props.currentRule) {
      // editing or duplicating rule
      sourceAddresses.value = mapSourceAddressesToUi(props.currentRule)
      destinationAddresses.value = mapDestinationAddressesToUi(props.currentRule)
    }
  } catch (err: any) {
    console.error(err)
    error.value.listHostSuggestions = t(getAxiosErrorMessage(err))
    error.value.listHostSuggestionsDetails = err.toString()
  } finally {
    loading.value.listHostSuggestions = false
  }
}

async function listServiceSuggestions() {
  loading.value.listServiceSuggestions = true

  try {
    const res = await ubusCall('ns.firewall', 'list-service-suggestions')
    serviceSuggestions.value = res.data.services.map((service: RuleService) => {
      const description = t(
        'standalone.firewall_rules.service_ports',
        {
          protocols: service.proto.join('/').toUpperCase(),
          ports: service.port
        },
        1
      )

      return {
        id: service.id,
        label: service.id,
        description,
        protocols: service.proto,
        port: service.port
      }
    })

    if (props.currentRule) {
      // editing or duplicating rule

      if (props.currentRule.ns_service === 'custom') {
        // custom service
        service.value = 'custom'
        // protocols are set inside listProtocols
        ports.value = props.currentRule.dest_port.join(', ') || ''
      } else {
        // standard service
        service.value = props.currentRule.ns_service || '*'
        ports.value = ''
        protocols.value = []
      }
    }
  } catch (err: any) {
    console.error(err)
    error.value.listServiceSuggestions = t(getAxiosErrorMessage(err))
    error.value.listServiceSuggestionsDetails = err.toString()
  } finally {
    loading.value.listServiceSuggestions = false
  }
}

async function listProtocols() {
  loading.value.listProtocols = true

  try {
    const res = await ubusCall('ns.redirects', 'list-protocols')
    const filteredProtocols = res.data.protocols.filter((protocol: string) => {
      return protocol !== 'all'
    })

    protocolOptions.value = filteredProtocols.map((protocol: string) => {
      return {
        id: protocol,
        label: protocol.toUpperCase()
      }
    })

    if (props.currentRule) {
      // editing or duplicating rule

      if (props.currentRule.proto.length && props.currentRule.ns_service === 'custom') {
        protocols.value = props.currentRule.proto.map((proto) => {
          return {
            id: proto,
            label: proto.toUpperCase()
          }
        })
      } else {
        protocols.value = []
      }
    }
  } catch (err: any) {
    console.error(err)
    error.value.listProtocols = t(getAxiosErrorMessage(err))
    error.value.listProtocolsDetails = err.toString()
  } finally {
    loading.value.listProtocols = false
  }
}

function validate() {
  clearErrors()
  errorBag.value.clear()
  let isValidationOk = true

  // rule name

  const ruleNameValidation = validateRequired(name.value)
  if (!ruleNameValidation.valid) {
    errorBag.value.set('name', [t(String(ruleNameValidation.errMessage))])
    if (isValidationOk) {
      isValidationOk = false
      focusElement(nameRef)
    }
  }

  // source addresses

  if (props.ruleType !== 'output') {
    for (const sourceAddress of sourceAddresses.value) {
      // check if it's an ip address
      const ipAddressValidation = validateIpAddress(sourceAddress.id)

      if (!ipAddressValidation.valid) {
        //  check if it's a cidr
        const ipCidrValidation = validateIpCidr(sourceAddress.id)

        if (!ipCidrValidation.valid) {
          // check if it's an ipv4 or ipv6 address range
          const ipRangeValidation = validateIpAddressRange(sourceAddress.id)

          if (!ipRangeValidation.valid) {
            errorBag.value.set('src_ip', [
              t('standalone.firewall_rules.invalid_source_address_value', {
                value: sourceAddress.id
              })
            ])
            if (isValidationOk) {
              isValidationOk = false
              focusElement(sourceAddressesRef)
            }
          }
        }
      }
    }

    // source zone

    const sourceZoneValidation = validateRequired(sourceZone.value)
    if (!sourceZoneValidation.valid) {
      errorBag.value.set('src', [t(String(sourceZoneValidation.errMessage))])
      if (isValidationOk) {
        isValidationOk = false
        focusElement(sourceZoneRef)
      }
    }
  }

  // destination addresses

  if (props.ruleType !== 'input') {
    for (const destinationAddress of destinationAddresses.value) {
      // check if it's an ip address
      const ipAddressValidation = validateIpAddress(destinationAddress.id)

      if (!ipAddressValidation.valid) {
        //  check if it's a cidr
        const ipCidrValidation = validateIpCidr(destinationAddress.id)

        if (!ipCidrValidation.valid) {
          errorBag.value.set('dest_ip', [
            t('standalone.firewall_rules.invalid_destination_address_value', {
              value: destinationAddress.id
            })
          ])
          if (isValidationOk) {
            isValidationOk = false
            focusElement(destinationAddressesRef)
          }
          break
        }
      }
    }

    // destination zone

    const destinationZoneValidation = validateRequired(destinationZone.value)
    if (!destinationZoneValidation.valid) {
      errorBag.value.set('dest', [t(String(destinationZoneValidation.errMessage))])
      if (isValidationOk) {
        isValidationOk = false
        focusElement(destinationZoneRef)
      }
    }
  }

  // ensure source zone != destination zone

  if (props.ruleType === 'forward') {
    if (sourceZone.value === destinationZone.value) {
      errorBag.value.set('src', [
        t('standalone.firewall_rules.source_and_destination_zones_must_be_different')
      ])
      errorBag.value.set('dest', [
        t('standalone.firewall_rules.source_and_destination_zones_must_be_different')
      ])
      if (isValidationOk) {
        isValidationOk = false
        focusElement(sourceZoneRef)
      }
    }
  }

  // service

  const serviceValidation = validateRequired(service.value)
  if (!serviceValidation.valid) {
    errorBag.value.set('ns_service', [t(String(serviceValidation.errMessage))])
    if (isValidationOk) {
      isValidationOk = false
      focusElement(serviceRef)
    }
  }

  if (service.value === 'custom') {
    // protocols

    let protocolsValidation = validateRequiredOption(protocols.value)
    if (!protocolsValidation.valid) {
      errorBag.value.set('proto', [t(String(protocolsValidation.errMessage))])
      if (isValidationOk) {
        isValidationOk = false
        focusElement(protocolsRef)
      }
    }

    // ports

    if (isTcpOrUdpProtocolSelected.value) {
      let portsValidation = validateRequired(ports.value)
      if (!portsValidation.valid) {
        errorBag.value.set('dest_port', [t(String(portsValidation.errMessage))])
        if (isValidationOk) {
          isValidationOk = false
          focusElement(portsRef)
        }
      } else {
        // check ports sintax
        portsValidation = validatePortListOrRange(ports.value)
        if (!portsValidation.valid) {
          errorBag.value.set('dest_port', [t(String(portsValidation.errMessage))])
          if (isValidationOk) {
            isValidationOk = false
            focusElement(portsRef)
          }
        }
      }
    }
  }
  return isValidationOk
}

async function saveRule() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }
  error.value.saveRule = ''
  error.value.saveRuleDetails = ''
  loading.value.saveRule = true

  const ruleData: FirewallRule = {
    name: name.value,
    enabled: isRuleEnabled.value,
    src_ip: [],
    src: '',
    dest_ip: [],
    dest: '',
    ns_service: service.value,
    proto: [],
    dest_port: [],
    target: action.value,
    add_to_top: position.value === 'top',
    ns_tag: tags.value.map((tag) => {
      return tag.id
    }),
    log: isLoggingEnabled.value,
    system_rule: props.currentRule?.system_rule || false
  }

  if (isEditingRule.value && props.currentRule) {
    ruleData.id = props.currentRule.id
  }

  if (props.ruleType !== 'output') {
    // source addresses
    ruleData.src_ip = sourceAddresses.value.map((address) => {
      return address.id
    })

    // source zone
    ruleData.src = sourceZone.value
  }

  if (props.ruleType !== 'input') {
    // destination addresses
    ruleData.dest_ip = destinationAddresses.value.map((address) => {
      return address.id
    })

    // destination zone
    ruleData.dest = destinationZone.value
  }

  // custom service
  if (service.value === 'custom') {
    ruleData.proto = protocols.value.map((protocol) => {
      return protocol.id
    })

    if (isTcpOrUdpProtocolSelected.value) {
      // remove whitespace from ports
      ruleData.dest_port = ports.value.replace(/\s/g, '').split(',')
    }
  }
  const apiMethod = isEditingRule.value ? 'edit-rule' : 'add-rule'

  try {
    await ubusCall('ns.firewall', apiMethod, ruleData)
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.saveRule = t(getAxiosErrorMessage(err))
      error.value.saveRuleDetails = err.toString()
    }
  } finally {
    loading.value.saveRule = false
  }
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="drawerTitle"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <!-- editing system rule warning -->
        <NeInlineNotification
          v-if="isEditingRule && props.currentRule?.system_rule"
          kind="warning"
          :title="t('standalone.firewall_rules.editing_system_rule_warning_title')"
          :description="t('standalone.firewall_rules.editing_system_rule_warning_description')"
        />
        <!-- enabled -->
        <NeToggle
          v-model="isRuleEnabled"
          :label="isRuleEnabled ? t('common.enabled') : t('common.disabled')"
          :topLabel="t('common.status')"
          :disabled="loading.saveRule"
        />
        <!-- rule name -->
        <NeTextInput
          :label="t('standalone.firewall_rules.rule_name')"
          v-model.trim="name"
          :invalidMessage="errorBag.getFirstFor('name')"
          :disabled="loading.saveRule"
          ref="nameRef"
        />
        <!-- listHostSuggestions error notification -->
        <NeInlineNotification
          v-if="error.listHostSuggestions"
          kind="error"
          :title="t('error.cannot_retrieve_host_suggestions')"
          :description="error.listHostSuggestions"
        >
          <template #details v-if="error.listHostSuggestionsDetails">
            {{ error.listHostSuggestionsDetails }}
          </template></NeInlineNotification
        >
        <template v-if="ruleType === 'output'">
          <NeTextInput
            :label="t('standalone.firewall_rules.source')"
            :value="t('standalone.firewall_rules.firewall')"
            disabled
          />
        </template>
        <template v-else>
          <!-- source addresses -->
          <NeCombobox
            v-model="sourceAddresses"
            :disabled="loading.saveRule || loading.listServiceSuggestions"
            :label="t('standalone.firewall_rules.source_addresses')"
            :options="addressOptions"
            :placeholder="
              loading.listServiceSuggestions
                ? t('common.loading')
                : t('ne_combobox.choose_or_enter_multiple')
            "
            :helperText="t('standalone.firewall_rules.source_addresses_helper')"
            :invalidMessage="errorBag.getFirstFor('src_ip')"
            multiple
            acceptUserInput
            optional
            :optionalLabel="t('common.optional')"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            ref="sourceAddressesRef"
          >
            <template #tooltip>
              <NeTooltip placement="top-start">
                <template #content>{{
                  t('standalone.firewall_rules.source_addresses_tooltip')
                }}</template>
              </NeTooltip>
            </template>
          </NeCombobox>
          <!-- source zone -->
          <NeCombobox
            v-model="sourceZone"
            :disabled="loading.saveRule"
            :label="t('standalone.firewall_rules.source_zone')"
            :options="zoneOptions"
            :invalidMessage="errorBag.getFirstFor('src')"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
            ref="sourceZoneRef"
          >
            <template #tooltip>
              <NeTooltip placement="top-start">
                <template #content>{{
                  t('standalone.firewall_rules.source_zone_tooltip')
                }}</template>
              </NeTooltip>
            </template>
          </NeCombobox>
        </template>

        <template v-if="ruleType === 'input'">
          <NeTextInput
            :label="t('standalone.firewall_rules.destination')"
            :value="t('standalone.firewall_rules.firewall')"
            disabled
          />
        </template>
        <template v-else>
          <!-- destination addresses -->
          <NeCombobox
            v-model="destinationAddresses"
            :disabled="loading.saveRule || loading.listServiceSuggestions"
            :label="t('standalone.firewall_rules.destination_addresses')"
            :options="addressOptions"
            :placeholder="
              loading.listServiceSuggestions
                ? t('common.loading')
                : t('ne_combobox.choose_or_enter_multiple')
            "
            :helperText="t('standalone.firewall_rules.destination_addresses_helper')"
            :invalidMessage="errorBag.getFirstFor('dest_ip')"
            multiple
            acceptUserInput
            optional
            :optionalLabel="t('common.optional')"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            ref="destinationAddressesRef"
          >
            <template #tooltip>
              <NeTooltip placement="top-start">
                <template #content>{{
                  t('standalone.firewall_rules.destination_addresses_tooltip')
                }}</template>
              </NeTooltip>
            </template>
          </NeCombobox>
          <!-- destination zone -->
          <NeCombobox
            v-model="destinationZone"
            :disabled="loading.saveRule"
            :label="t('standalone.firewall_rules.destination_zone')"
            :options="zoneOptions"
            :invalidMessage="errorBag.getFirstFor('dest')"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
            ref="destinationZoneRef"
          >
            <template #tooltip>
              <NeTooltip placement="top-start">
                <template #content>{{
                  t('standalone.firewall_rules.destination_zone_tooltip')
                }}</template>
              </NeTooltip>
            </template>
          </NeCombobox>
        </template>

        <!-- listServiceSuggestions error notification -->
        <NeInlineNotification
          v-if="error.listServiceSuggestions"
          kind="error"
          :title="t('error.cannot_retrieve_service_suggestions')"
          :description="error.listServiceSuggestions"
        >
          <template #details v-if="error.listServiceSuggestionsDetails">
            {{ error.listServiceSuggestionsDetails }}
          </template></NeInlineNotification
        >
        <!-- service -->
        <NeCombobox
          v-model="service"
          :disabled="loading.saveRule || loading.listServiceSuggestions"
          :label="t('standalone.firewall_rules.destination_service')"
          :options="serviceOptions"
          :invalidMessage="errorBag.getFirstFor('ns_service')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
          ref="serviceRef"
        />
        <template v-if="service === 'custom'">
          <!-- listProtocols error notification -->
          <NeInlineNotification
            v-if="error.listProtocols"
            kind="error"
            :title="t('error.cannot_retrieve_protocols')"
            :description="error.listProtocols"
          >
            <template #details v-if="error.listProtocolsDetails">
              {{ error.listProtocolsDetails }}
            </template></NeInlineNotification
          >
          <!-- protocols -->
          <NeCombobox
            v-model="protocols"
            :disabled="loading.saveRule || loading.listProtocols"
            :label="t('standalone.firewall_rules.protocols')"
            :placeholder="loading.listProtocols ? t('common.loading') : t('ne_combobox.choose')"
            :options="protocolOptions"
            :invalidMessage="errorBag.getFirstFor('proto')"
            multiple
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
            ref="protocolsRef"
          />
          <!-- ports -->
          <NeTextInput
            v-if="isTcpOrUdpProtocolSelected"
            :label="t('standalone.firewall_rules.ports')"
            :placeholder="t('standalone.firewall_rules.ports_placeholder')"
            v-model.trim="ports"
            :disabled="loading.saveRule"
            :invalidMessage="errorBag.getFirstFor('dest_port')"
            ref="portsRef"
          >
            <template #tooltip>
              <NeTooltip placement="top-start">
                <template #content>{{ t('standalone.firewall_rules.ports_tooltip') }}</template>
              </NeTooltip>
            </template>
          </NeTextInput>
        </template>
        <!-- action -->
        <NeRadioSelection
          v-model="action"
          :disabled="loading.saveRule"
          :label="t('standalone.firewall_rules.action')"
          :options="actionOptions"
        />
        <!-- rule position -->
        <NeRadioSelection
          v-if="isCreatingRule || isDuplicatingRule"
          v-model="position"
          :disabled="loading.saveRule"
          :label="t('standalone.firewall_rules.rule_position')"
          :options="positionOptions"
        />
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
            <!-- tags -->
            <NeCombobox
              v-model="tags"
              :disabled="loading.saveRule"
              :label="t('standalone.firewall_rules.tags')"
              :options="knownTags"
              :placeholder="t('ne_combobox.choose_or_enter_multiple')"
              multiple
              acceptUserInput
              optional
              :optionalLabel="t('common.optional')"
              :noResultsLabel="t('ne_combobox.no_results')"
              :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
              :noOptionsLabel="t('ne_combobox.no_options_label')"
              :selected-label="t('ne_combobox.selected')"
              :user-input-label="t('ne_combobox.user_input_label')"
            >
              <template #tooltip>
                <NeTooltip placement="top-start">
                  <template #content>{{ t('standalone.firewall_rules.tags_tooltip') }}</template>
                </NeTooltip>
              </template>
            </NeCombobox>
            <!-- logging -->
            <NeToggle
              v-model="isLoggingEnabled"
              :label="isLoggingEnabled ? t('common.enabled') : t('common.disabled')"
              :topLabel="t('standalone.firewall_rules.logging')"
              :disabled="loading.saveRule"
            >
              <template #tooltip>
                <NeTooltip placement="top-start">
                  <template #content>{{ t('standalone.firewall_rules.logging_tooltip') }}</template>
                </NeTooltip>
              </template>
            </NeToggle>
          </div>
        </Transition>
        <!-- saveRule error notification -->
        <NeInlineNotification
          v-if="error.saveRule"
          kind="error"
          :title="t('error.cannot_save_firewall_rule')"
          :description="error.saveRule"
        >
          <template #details v-if="error.saveRuleDetails">
            {{ error.saveRuleDetails }}
          </template></NeInlineNotification
        >
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          @click.prevent="closeDrawer"
          :disabled="loading.saveRule"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="saveRule"
          :disabled="loading.saveRule"
          :loading="loading.saveRule"
        >
          {{
            isCreatingRule
              ? t('standalone.firewall_rules.add_rule')
              : t('standalone.firewall_rules.save_rule')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
