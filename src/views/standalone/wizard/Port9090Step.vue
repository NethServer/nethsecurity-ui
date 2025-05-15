<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeHeading,
  NeCard,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeRadioSelection,
  NeTooltip
} from '@nethesis/vue-components'
import { faArrowRight, faArrowLeft, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import {
  MessageBag,
  validateAnyOf,
  validateIpAddress,
  validateIpAddressRange,
  validateIpCidr,
  validateRequired
} from '@/lib/validation'
import type { FirewallRule } from '@/stores/standalone/firewall'
import { cloneDeep } from 'lodash-es'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'

const props = defineProps<{
  inputRules: FirewallRule[]
}>()

const emit = defineEmits<{
  nextStep: []
  previousStep: []
}>()

const { t } = useI18n()
const wizardStore = useSetupWizardStore()
const sourceAddressesErrors = ref<string[]>([])
const errorBag = ref(new MessageBag())
const loadingSaveRule = ref(false)
const errorSaveRule = ref('')
const errorSaveRuleDetails = ref('')
const accessOptions = [
  {
    id: 'disabled',
    label: t('common.disabled')
  },
  {
    id: 'enabled',
    label: t('common.enabled')
  },
  {
    id: 'limited',
    label: t('standalone.wizard.limited')
  }
]

const tcp9090rule = computed(() => {
  return props.inputRules.find((rule) => rule.id === 'ns_allow_ui')
})

async function saveRule() {
  errorSaveRule.value = ''
  errorSaveRuleDetails.value = ''

  if (!validate()) {
    return
  }
  loadingSaveRule.value = true
  const ruleData = cloneDeep(tcp9090rule.value)

  if (ruleData) {
    switch (wizardStore.port9090WanAccess) {
      case 'disabled':
        ruleData.enabled = false
        ruleData.src_ip = []
        break
      case 'enabled':
        ruleData.enabled = true
        ruleData.src_ip = []
        break
      case 'limited':
        ruleData.enabled = true
        // limit rule to specific source addresses
        ruleData.src_ip = [
          ...new Set(
            wizardStore.port9090AllowedAddresses.map((address) => {
              return address
            })
          )
        ]
        break
    }

    // edit-rule api needs this field
    ruleData.dest = ''

    try {
      await ubusCall('ns.firewall', 'edit-rule', ruleData)
      emit('nextStep')
    } catch (err: unknown) {
      console.error(err)
      errorSaveRule.value = t(getAxiosErrorMessage(err))
      errorSaveRuleDetails.value = String(err)
    } finally {
      loadingSaveRule.value = false
    }
  }
}

function validate() {
  errorBag.value.clear()
  errorSaveRule.value = ''
  errorSaveRuleDetails.value = ''

  sourceAddressesErrors.value = []
  wizardStore.port9090AllowedAddresses.forEach(() => {
    sourceAddressesErrors.value.push('')
  })
  let isValidationOk = true

  if (wizardStore.port9090WanAccess !== 'limited') {
    // no need to validate source addresses
    return true
  }

  // validate allowed addresses

  for (const [index, sourceAddress] of wizardStore.port9090AllowedAddresses.entries()) {
    // required
    const sourceAddressRequiredValidation = validateRequired(sourceAddress)
    if (!sourceAddressRequiredValidation.valid) {
      sourceAddressesErrors.value[index] = t(sourceAddressRequiredValidation.errMessage as string)
      isValidationOk = false
    } else {
      // ip, cidr or rage
      const sourceAddressValidation = validateAnyOf(
        [validateIpAddress, validateIpCidr, validateIpAddressRange],
        sourceAddress,
        t('standalone.firewall_rules.invalid_source_address_value', {
          value: sourceAddress
        })
      )

      if (!sourceAddressValidation.valid) {
        sourceAddressesErrors.value[index] = t(sourceAddressValidation.errMessage as string)
        isValidationOk = false
      }
    }
  }
  return isValidationOk
}
</script>

<template>
  <div class="space-y-2">
    <NeHeading tag="h2">
      {{ t('standalone.wizard.web_access_9090_title') }}
    </NeHeading>
    <p>{{ t('standalone.wizard.web_access_9090_description') }}</p>
  </div>
  <div class="space-y-6">
    <NeCard :title="t('standalone.wizard.default_configuration')">
      <div class="space-y-2">
        <p>
          {{ t('standalone.wizard.access_from_lan') }}:
          <FontAwesomeIcon
            :icon="faCircleCheck"
            class="mx-2 h-4 w-4 text-green-700 dark:text-green-500"
            aria-hidden="true"
          />
          <span>{{ t('common.enabled') }}</span>
        </p>
      </div>
    </NeCard>
    <NeCard :title="t('standalone.wizard.settings')">
      <div class="space-y-4">
        <div class="max-w-sm">
          <NeRadioSelection
            v-model="wizardStore.port9090WanAccess"
            :disabled="loadingSaveRule"
            :label="t('standalone.wizard.access_from_wan')"
            :options="accessOptions"
          />
        </div>
        <!-- source addresses -->
        <div class="max-w-sm">
          <NeMultiTextInput
            v-show="wizardStore.port9090WanAccess === 'limited'"
            v-model="wizardStore.port9090AllowedAddresses"
            :disable-inputs="loadingSaveRule"
            :title="t('standalone.wizard.allowed_addresses')"
            :add-item-label="t('standalone.wizard.add_address')"
            :invalid-messages="sourceAddressesErrors"
            :general-invalid-message="t(errorBag.getFirstFor('src_ip'))"
            required
          >
            <template #tooltip>
              <NeTooltip placement="top-start">
                <template #content>{{
                  t('standalone.firewall_rules.source_addresses_tooltip')
                }}</template>
              </NeTooltip>
            </template>
          </NeMultiTextInput>
        </div>
      </div>
    </NeCard>
    <!-- save rule error notification -->
    <NeInlineNotification
      v-if="errorSaveRule"
      kind="error"
      :title="t('error.cannot_save_firewall_rule')"
      :description="errorSaveRule"
    >
      <template v-if="errorSaveRuleDetails" #details>
        {{ errorSaveRuleDetails }}
      </template>
    </NeInlineNotification>
    <!-- footer -->
    <hr />
    <div class="flex flex-row-reverse gap-6">
      <NeButton
        kind="primary"
        size="lg"
        type="submit"
        :disabled="loadingSaveRule"
        :loading="loadingSaveRule"
        @click.prevent="saveRule"
      >
        <template #suffix>
          <FontAwesomeIcon :icon="faArrowRight" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('common.next') }}
      </NeButton>
      <NeButton kind="tertiary" size="lg" @click.prevent="emit('previousStep')">
        <template #prefix>
          <FontAwesomeIcon :icon="faArrowLeft" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('common.previous') }}
      </NeButton>
    </div>
  </div>
</template>
