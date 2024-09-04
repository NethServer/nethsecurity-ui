<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeCombobox,
  type NeComboboxOption,
  NeTooltip,
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeRadioSelection,
  focusElement,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ref, computed, type PropType, type Ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useFirewallStore,
  type NatRule,
  type NatRuleAction,
  type RuleHost
} from '@/stores/standalone/firewall'
import {
  MessageBag,
  validateAnyOf,
  validateIp4Address,
  validateIp4Cidr,
  validateIpAddress,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'

const props = defineProps({
  currentRule: {
    type: Object as PropType<NatRule>
  },
  isShown: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const firewallConfig = useFirewallStore()
const ruleName = ref('')
const ruleNameRef = ref()
const sourceAddress = ref('')
const sourceAddressRef = ref()
const destinationAddress = ref('')
const destinationAddressRef = ref()
const outboundZone = ref('*')
const outboundZoneRef = ref()
const action: Ref<NatRuleAction> = ref('SNAT')
const rewriteIpAddress = ref('')
const rewriteIpAddressRef = ref()
const sourceAddressOptions = ref<NeComboboxOption[]>([])
const destinationAddressOptions = ref<NeComboboxOption[]>([])
const errorBag = ref(new MessageBag())
// contains the first invalid field ref
const firstErrorRef = ref()

let loading = ref({
  listHostSuggestions: false,
  listProtocols: false,
  saveRule: false
})

let error = ref({
  listHostSuggestions: '',
  listHostSuggestionsDetails: '',
  saveRule: '',
  saveRuleDetails: ''
})

const actionOptions = ref([
  {
    id: 'SNAT',
    label: 'SNAT',
    description: t('standalone.nat.action_snat_description')
  },
  {
    id: 'MASQUERADE',
    label: 'MASQUERADE',
    description: t('standalone.nat.action_masquerade_description')
  },
  {
    id: 'ACCEPT',
    label: 'ACCEPT',
    description: t('standalone.nat.action_accept_description')
  }
])

const isCreatingRule = computed(() => {
  return !props.currentRule
})

const isEditingRule = computed(() => {
  return !!props.currentRule
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

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      errorBag.value.clear()

      nextTick(() => {
        focusElement(ruleNameRef)
      })
      firewallConfig.fetch()
      listHostSuggestions()
      sourceAddress.value = ''
      destinationAddress.value = ''

      if (isCreatingRule.value) {
        // creating rule, reset form to defaults
        ruleName.value = ''
        outboundZone.value = '*'
        action.value = 'SNAT'
        rewriteIpAddress.value = ''
      } else if (props.currentRule) {
        // editing rule
        ruleName.value = props.currentRule.name || ''
        // source/destination addresses will be set inside listHostSuggestions
        outboundZone.value = props.currentRule.src || '*'
        action.value = props.currentRule.target || 'SNAT'
        rewriteIpAddress.value = props.currentRule.snat_ip || ''
      }
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  error.value.listHostSuggestions = ''
  error.value.listHostSuggestionsDetails = ''
  error.value.saveRule = ''
  error.value.saveRuleDetails = ''
}

async function listHostSuggestions() {
  loading.value.listHostSuggestions = true

  try {
    const res = await ubusCall('ns.firewall', 'list-host-suggestions')
    const hostSuggestions = res.data.hosts.map((host: RuleHost) => {
      const description = `${host.label} (${host.type})`

      return {
        id: host.value,
        label: host.value,
        description
      }
    })
    sourceAddressOptions.value = hostSuggestions

    const anyAddress = {
      id: '0.0.0.0/0',
      label: '0.0.0.0/0',
      description: t('standalone.nat.any_address')
    }
    destinationAddressOptions.value = [anyAddress, ...hostSuggestions]

    if (props.currentRule) {
      // editing rule

      // check if sourceAddress is in the list of suggestions
      const sourceAddressFound = sourceAddressOptions.value.find(
        (addr: NeComboboxOption) => addr.id === props.currentRule?.src_ip
      )

      if (!sourceAddressFound) {
        // add address to the list of suggestions
        sourceAddressOptions.value.push({
          id: props.currentRule.src_ip,
          label: props.currentRule.src_ip
        })
      }
      sourceAddress.value = props.currentRule.src_ip

      // check if destinationAddress is in the list of suggestions
      const destinationAddressFound = destinationAddressOptions.value.find(
        (addr: NeComboboxOption) => addr.id === props.currentRule?.dest_ip
      )

      if (!destinationAddressFound) {
        // add address to the list of suggestions
        destinationAddressOptions.value.push({
          id: props.currentRule.dest_ip,
          label: props.currentRule.dest_ip
        })
      }
      destinationAddress.value = props.currentRule.dest_ip
    }
  } catch (err: any) {
    console.error(err)
    error.value.listHostSuggestions = t(getAxiosErrorMessage(err))
    error.value.listHostSuggestionsDetails = err.toString()
  } finally {
    loading.value.listHostSuggestions = false
  }
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref<any>
): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      errorBag.value.set(fieldName, [validator.errMessage as string])

      // remember the first field with error for focus management
      if (!firstErrorRef.value) {
        firstErrorRef.value = fieldRef
      }
    }
  }
  return validators.every((validator) => validator.valid)
}

function validate() {
  clearErrors()
  errorBag.value.clear()

  const allValidators: [validationOutput[], string, Ref<any>][] = [
    // rule name
    [[validateRequired(ruleName.value)], 'name', ruleNameRef],
    // source address
    [
      [
        validateRequired(sourceAddress.value),
        // instead of validateAnyOf we might use validateIp4OrCidr()
        validateAnyOf(
          [validateIp4Address, validateIp4Cidr],
          sourceAddress.value,
          t('error.invalid_ip_v4_address_or_cidr')
        )
      ],
      'src_ip',
      sourceAddressRef
    ],
    // outbound zone
    [[validateRequired(outboundZone.value)], 'src', outboundZoneRef],
    // destination address
    [
      [
        validateRequired(destinationAddress.value),
        // instead of validateAnyOf we might use validateIp4OrCidr()
        validateAnyOf(
          [validateIp4Address, validateIp4Cidr],
          destinationAddress.value,
          t('error.invalid_ip_v4_address_or_cidr')
        )
      ],
      'dest_ip',
      destinationAddressRef
    ],
    // rewrite ip address
    [
      action.value === 'SNAT'
        ? [validateRequired(rewriteIpAddress.value), validateIpAddress(rewriteIpAddress.value)]
        : [],
      'snat_ip',
      rewriteIpAddressRef
    ]
  ]

  // reset firstErrorRef for focus management
  firstErrorRef.value = undefined

  const isValidationOk = allValidators
    .map(([validators, fieldName, fieldRef]) => runFieldValidators(validators, fieldName, fieldRef))
    .every((result) => result)

  if (firstErrorRef.value) {
    focusElement(firstErrorRef.value)
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

  const ruleData: NatRule = {
    name: ruleName.value,
    src: outboundZone.value,
    src_ip: sourceAddress.value,
    dest_ip: destinationAddress.value,
    target: action.value,
    snat_ip: action.value === 'SNAT' ? rewriteIpAddress.value : ''
  }

  if (isEditingRule.value) {
    ruleData.id = props.currentRule?.id
  }
  const apiMethod = isEditingRule.value ? 'edit-rule' : 'add-rule'

  try {
    await ubusCall('ns.nat', apiMethod, ruleData)
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
    :title="isEditingRule ? t('standalone.nat.edit_nat_rule') : t('standalone.nat.add_nat_rule')"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form>
      <div class="space-y-6">
        <!-- rule name -->
        <NeTextInput
          :label="t('standalone.nat.rule_name')"
          v-model.trim="ruleName"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('name'))"
          :disabled="loading.saveRule"
          ref="ruleNameRef"
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
          </template>
        </NeInlineNotification>
        <!-- source address -->
        <NeCombobox
          v-model="sourceAddress"
          :disabled="loading.saveRule || loading.listHostSuggestions"
          :label="t('standalone.nat.source_address')"
          :options="sourceAddressOptions"
          :placeholder="
            loading.listHostSuggestions ? t('common.loading') : t('ne_combobox.choose_or_enter')
          "
          :helperText="t('standalone.nat.address_helper')"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('src_ip'))"
          acceptUserInput
          :optionalLabel="t('common.optional')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :userInputLabel="t('ne_combobox.user_input_label')"
          ref="sourceAddressRef"
        >
          <template #tooltip>
            <NeTooltip placement="top-start">
              <template #content>{{ t('standalone.nat.source_address_tooltip') }}</template>
            </NeTooltip>
          </template>
        </NeCombobox>
        <!-- outbound zone -->
        <NeCombobox
          v-model="outboundZone"
          :disabled="loading.saveRule"
          :label="t('standalone.nat.outbound_zone')"
          :options="zoneOptions"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('zone'))"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selectedLabel="t('ne_combobox.selected')"
          :userInputLabel="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
          ref="outboundZoneRef"
        />
        <!-- destination address -->
        <NeCombobox
          v-model="destinationAddress"
          :disabled="loading.saveRule || loading.listHostSuggestions"
          :label="t('standalone.nat.destination_address')"
          :helperText="t('standalone.nat.address_helper')"
          :options="destinationAddressOptions"
          :placeholder="
            loading.listHostSuggestions ? t('common.loading') : t('ne_combobox.choose_or_enter')
          "
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('dest_ip'))"
          acceptUserInput
          :optionalLabel="t('common.optional')"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          ref="destinationAddressRef"
        >
          <template #tooltip>
            <NeTooltip placement="top-start">
              <template #content>{{ t('standalone.nat.destination_address_tooltip') }}</template>
            </NeTooltip>
          </template>
        </NeCombobox>
        <!-- action -->
        <NeRadioSelection
          v-model="action"
          :disabled="loading.saveRule"
          :label="t('standalone.nat.action')"
          :options="actionOptions"
        />
        <!-- rewrite ip address -->
        <NeTextInput
          v-if="action === 'SNAT'"
          :label="t('standalone.nat.rewrite_ip_address')"
          v-model.trim="rewriteIpAddress"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('snat_ip'))"
          :disabled="loading.saveRule"
          ref="rewriteIpAddressRef"
        />
        <!-- saveRule error notification -->
        <NeInlineNotification
          v-if="error.saveRule"
          kind="error"
          :title="t('error.cannot_save_nat_rule')"
          :description="error.saveRule"
        >
          <template #details v-if="error.saveRuleDetails">
            {{ error.saveRuleDetails }}
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
            isCreatingRule ? t('standalone.nat.add_nat_rule') : t('standalone.nat.save_nat_rule')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
