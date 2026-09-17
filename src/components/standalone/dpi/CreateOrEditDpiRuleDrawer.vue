<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeButton,
  NeMultiselectCombobox,
  type NeMultiselectComboboxOption,
  NeFormItemLabel,
  NeHeading,
  NeRadioSelection,
  NeSideDrawer,
  NeTextInput,
  NeToggle,
  NeTooltip
} from '@nethesis/vue-components'
import NeStepper from '@/components/standalone/NeStepper.vue'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  faArrowLeft,
  faArrowRight,
  faBan,
  faCircleCheck,
  faCircleXmark,
  faCubes
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import CreateApplicationGroupModal from '@/components/standalone/dpi/CreateApplicationGroupModal.vue'
import {
  useCreateDpiRule,
  useEditDpiRule,
  type DpiRule,
  type DpiRuleAction,
  type DpiRulePosition
} from '@/composables/useDpiRules'
import { useApplicationGroups } from '@/composables/useApplicationGroups'
import { ValidationError } from '@/lib/standalone/ubus'
import {
  MessageBag,
  validateAnyOf,
  validateIpAddress,
  validateIpAddressRange,
  validateIpCidr,
  validateRequired,
  type validationOutput
} from '@/lib/validation'

const TOTAL_STEPS = 4

const {
  isShown = false,
  ruleToEdit = undefined,
  duplicate = false
} = defineProps<{
  isShown?: boolean
  ruleToEdit?: DpiRule
  duplicate?: boolean
}>()

const isEditing = computed(() => ruleToEdit !== undefined && !duplicate)

const emit = defineEmits<{
  close: []
  save: []
}>()

const { t } = useI18n()

const step = ref(1)
const validationErrorBag = ref(new MessageBag())
const sourceAddressesErrors = ref<string[]>([])
const isShownCreateGroupModal = ref(false)

const STEP_OF_FIELD: Record<string, number> = {
  name: 1,
  source: 2,
  action: 3,
  appgroups: 3,
  position: 3
}

// step 1
const enabled = ref(true)
const name = ref('')
// step 2
const sourceType = ref('addresses')
const sourceAddresses = ref<string[]>([''])
// step 3
const selectedGroups = ref<NeMultiselectComboboxOption[]>([])
const action = ref<DpiRuleAction>('block')
const rulePosition = ref<DpiRulePosition>('bottom')

const { data: applicationGroups, isLoading: isLoadingApplicationGroups } = useApplicationGroups()
const { mutate: createRule, isPending: isCreating } = useCreateDpiRule()
const { mutate: editRule, isPending: isSavingEdit } = useEditDpiRule()

const isSaving = computed(() => isCreating.value || isSavingEdit.value)

const canOpen = computed(() => !isEditing.value || (ruleToEdit?.managed ?? false))

const sourceTypeOptions = computed(() => [
  { id: 'addresses', label: t('standalone.dpi.source_type_addresses') },
  { id: 'any', label: t('standalone.dpi.source_type_any') }
])

const actionOptions = computed(() => [
  { id: 'block', label: t('standalone.dpi.action_block') },
  { id: 'allow', label: t('standalone.dpi.action_allow') }
])

const rulePositionOptions = computed(() => [
  { id: 'top', label: t('standalone.dpi.position_top') },
  { id: 'bottom', label: t('standalone.dpi.position_bottom') }
])

const applicationGroupOptions = computed(
  () => applicationGroups.value?.map((group) => ({ id: group.id, label: group.name })) ?? []
)

const sourceSummary = computed(() =>
  sourceType.value === 'addresses'
    ? sourceAddresses.value.filter((address) => address).join(', ')
    : t('standalone.dpi.source_type_any')
)

const matchSummary = computed(() => selectedGroups.value.map((option) => option.label).join(', '))

watch(name, (ruleName) => {
  if (ruleName.trim()) {
    validationErrorBag.value.delete('name')
  }
})

watch(selectedGroups, (groups) => {
  if (groups.length) {
    validationErrorBag.value.delete('appgroups')
  }
})

watch(
  sourceAddresses,
  () => {
    sourceAddressesErrors.value = []
    validationErrorBag.value.delete('source')
  },
  { deep: true }
)

watch(
  () => isShown,
  (shown) => {
    if (shown) {
      step.value = 1
      enabled.value = ruleToEdit?.enabled ?? true
      name.value = ruleToEdit
        ? duplicate
          ? t('standalone.dpi.duplicated_rule_name', { name: ruleToEdit.name })
          : ruleToEdit.name
        : ''
      sourceType.value = ruleToEdit && ruleToEdit.source.length === 0 ? 'any' : 'addresses'
      sourceAddresses.value = ruleToEdit?.source.length ? [...ruleToEdit.source] : ['']
      selectedGroups.value =
        ruleToEdit?.appgroups.map((appgroup) => ({ id: appgroup.id, label: appgroup.name })) ?? []
      action.value = ruleToEdit?.action ?? 'block'
      rulePosition.value = 'bottom'
      clearValidationErrors()
    }
  }
)

function close() {
  emit('close')
}

function onGroupCreated() {
  const before = new Set(applicationGroupOptions.value.map((option) => option.id))
  isShownCreateGroupModal.value = false

  const stop = watch(applicationGroupOptions, (options) => {
    const created = options.find((option) => !before.has(option.id))
    if (created) {
      selectedGroups.value = [...selectedGroups.value, created]
      stop()
    }
  })
}

function clearValidationErrors() {
  validationErrorBag.value.clear()
  sourceAddressesErrors.value = []
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (const validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [validator.errMessage as string])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validateSourceAddresses(): boolean {
  sourceAddressesErrors.value = sourceAddresses.value.map(() => '')

  let isValid = true
  for (const [index, sourceAddress] of sourceAddresses.value.entries()) {
    const requiredValidation = validateRequired(sourceAddress)
    if (!requiredValidation.valid) {
      // the helper text replaces the generic 'required' message, since it states what to enter
      sourceAddressesErrors.value[index] = t('standalone.dpi.source_addresses_helper')
      isValid = false
      continue
    }

    const formatValidation = validateAnyOf(
      [validateIpAddress, validateIpCidr, validateIpAddressRange],
      sourceAddress,
      t('standalone.firewall_rules.invalid_source_address_value', { value: sourceAddress })
    )
    if (!formatValidation.valid) {
      sourceAddressesErrors.value[index] = formatValidation.errMessage as string
      isValid = false
    }
  }

  return isValid
}

function validateStep(currentStep: number): boolean {
  clearValidationErrors()

  if (currentStep === 1) {
    return runValidators([validateRequired(name.value)], 'name')
  }

  if (currentStep === 2 && sourceType.value === 'addresses') {
    return validateSourceAddresses()
  }

  if (currentStep === 3) {
    return runValidators(
      [
        selectedGroups.value.length
          ? { valid: true }
          : { valid: false, errMessage: 'appgroups_required' }
      ],
      'appgroups'
    )
  }

  return true
}

function goToNextStep() {
  if (!validateStep(step.value)) {
    return
  }

  step.value += 1
}

function goToPreviousStep() {
  clearValidationErrors()
  step.value -= 1
}

function onSaveError(e: Error) {
  if (!(e instanceof ValidationError)) {
    return
  }

  validationErrorBag.value = e.errorBag
  const failing = [...e.errorBag.keys()]
    .map((field) => STEP_OF_FIELD[field])
    .filter((owner): owner is number => owner !== undefined)
  if (failing.length) {
    step.value = Math.min(...failing)
  }
}

function save() {
  for (let candidate = 1; candidate < TOTAL_STEPS; candidate++) {
    if (!validateStep(candidate)) {
      step.value = candidate
      return
    }
  }

  const payload = {
    name: name.value.trim(),
    enabled: enabled.value,
    action: action.value,
    source: sourceType.value === 'any' ? [] : sourceAddresses.value.filter((address) => address),
    appgroups: selectedGroups.value.map((option) => option.id)
  }
  const callbacks = { onSuccess: () => emit('save'), onError: onSaveError }

  if (isEditing.value && ruleToEdit) {
    editRule({ ...payload, id: ruleToEdit.id }, callbacks)
  } else {
    createRule({ ...payload, position: rulePosition.value }, callbacks)
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown && canOpen"
    :title="ruleToEdit ? t('standalone.dpi.edit_rule') : t('standalone.dpi.add_rule')"
    :close-aria-label="t('common.shell.close_side_drawer')"
    @close="close"
  >
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-8 border-b border-gray-200 pb-8 dark:border-gray-700">
        <NeStepper
          :current-step="step"
          :total-steps="TOTAL_STEPS"
          :step-label="t('common.step')"
          bar-size="md"
          bar-color-classes="bg-linear-to-r from-cyan-500 to-indigo-500"
          label-color-classes="text-secondary"
        />
        <!-- step 1: general -->
        <div v-if="step === 1" class="flex flex-col gap-8">
          <div class="flex flex-col gap-1">
            <NeHeading tag="h6">{{ t('standalone.dpi.general') }}</NeHeading>
            <p class="text-sm leading-5 text-tertiary-neutral">
              {{ t('standalone.dpi.general_description') }}
            </p>
          </div>
          <div>
            <NeFormItemLabel>{{ t('standalone.dpi.status') }}</NeFormItemLabel>
            <NeToggle
              v-model="enabled"
              :label="enabled ? t('common.enabled') : t('common.disabled')"
            />
          </div>
          <NeTextInput
            v-model="name"
            :label="t('standalone.dpi.name')"
            :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('name'))"
          />
        </div>
        <!-- step 2: source -->
        <div v-else-if="step === 2" class="flex flex-col gap-8">
          <div class="flex flex-col gap-1">
            <NeHeading tag="h6">{{ t('standalone.dpi.source') }}</NeHeading>
            <p class="text-sm leading-5 text-tertiary-neutral">
              {{ t('standalone.dpi.source_description') }}
            </p>
          </div>
          <NeRadioSelection
            v-model="sourceType"
            :label="t('standalone.dpi.source_type')"
            :options="sourceTypeOptions"
          />
          <NeMultiTextInput
            v-if="sourceType === 'addresses'"
            v-model="sourceAddresses"
            :title="t('standalone.dpi.source_addresses')"
            :placeholder="t('standalone.dpi.source_address_placeholder')"
            :helper-text="t('standalone.dpi.source_addresses_helper')"
            :add-item-label="t('standalone.dpi.add_source_address')"
            :invalid-messages="sourceAddressesErrors"
            :general-invalid-message="t(validationErrorBag.getFirstI18nKeyFor('source'))"
            required
            @add-item="sourceAddressesErrors = []"
            @delete-item="sourceAddressesErrors = []"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.dpi.source_addresses_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeMultiTextInput>
        </div>
        <!-- step 3: match and action -->
        <div v-else-if="step === 3" class="flex flex-col gap-8">
          <div class="flex flex-col gap-1">
            <NeHeading tag="h6">{{ t('standalone.dpi.match_and_action') }}</NeHeading>
            <p class="text-sm leading-5 text-tertiary-neutral">
              {{ t('standalone.dpi.match_and_action_description') }}
            </p>
          </div>
          <NeMultiselectCombobox
            v-model="selectedGroups"
            :loading-options="isLoadingApplicationGroups"
            :label="t('standalone.dpi.application_groups')"
            :options="applicationGroupOptions"
            :placeholder="t('standalone.dpi.choose_application_group')"
            :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('appgroups'))"
            :optional-label="t('common.optional')"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :no-options-label="t('ne_combobox.no_options_label')"
            :user-input-label="t('ne_combobox.user_input_label')"
          />
          <NeRadioSelection
            v-model="action"
            :label="t('standalone.dpi.action')"
            :options="actionOptions"
            :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('action'))"
          />
          <NeRadioSelection
            v-if="!isEditing"
            v-model="rulePosition"
            :label="t('standalone.dpi.rule_position')"
            :options="rulePositionOptions"
            :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('position'))"
          />
        </div>
        <!-- step 4: review -->
        <div v-else class="flex flex-col gap-8">
          <div class="flex flex-col gap-1">
            <NeHeading tag="h6">{{ t('standalone.dpi.review') }}</NeHeading>
            <p class="text-sm leading-5 text-tertiary-neutral">
              {{ t('standalone.dpi.review_description') }}
            </p>
          </div>
          <dl class="flex flex-col gap-5 text-sm leading-5">
            <div class="flex items-center gap-6 pb-1">
              <dt class="w-25 shrink-0 font-medium text-secondary-neutral">
                {{ t('standalone.dpi.status') }}
              </dt>
              <dd class="flex items-center gap-2.5 text-primary-neutral">
                <FontAwesomeIcon
                  :icon="enabled ? faCircleCheck : faCircleXmark"
                  :class="enabled ? 'text-enabled' : 'text-disabled'"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                {{ enabled ? t('common.enabled') : t('common.disabled') }}
              </dd>
            </div>
            <div class="flex items-center gap-6 pb-1">
              <dt class="w-25 shrink-0 font-medium text-secondary-neutral">
                {{ t('standalone.dpi.rule_name') }}
              </dt>
              <dd class="text-primary-neutral">{{ name }}</dd>
            </div>
            <div class="flex items-center gap-6 pb-1">
              <dt class="w-25 shrink-0 font-medium text-secondary-neutral">
                {{ t('standalone.dpi.source') }}
              </dt>
              <dd class="text-primary-neutral">{{ sourceSummary }}</dd>
            </div>
            <div class="flex items-center gap-6 pb-1">
              <dt class="w-25 shrink-0 font-medium text-secondary-neutral">
                {{ t('standalone.dpi.match_type') }}
              </dt>
              <dd class="flex items-center gap-2 text-secondary">
                <FontAwesomeIcon :icon="faCubes" class="h-4 w-4" aria-hidden="true" />
                {{ matchSummary }}
              </dd>
            </div>
            <div class="flex items-center gap-6 pb-1">
              <dt class="w-25 shrink-0 font-medium text-secondary-neutral">
                {{ t('standalone.dpi.action') }}
              </dt>
              <dd class="flex items-center gap-2.5 text-primary-neutral">
                <FontAwesomeIcon
                  :icon="action === 'block' ? faBan : faCircleCheck"
                  :class="action === 'block' ? 'text-danger' : 'text-enabled'"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                {{ action === 'block' ? t('standalone.dpi.block') : t('standalone.dpi.allow') }}
              </dd>
            </div>
            <div class="flex items-center gap-6 pb-1">
              <dt class="w-25 shrink-0 font-medium text-secondary-neutral">
                {{ t('standalone.dpi.rule_position') }}
              </dt>
              <dd class="text-primary-neutral">
                {{
                  rulePosition === 'top'
                    ? t('standalone.dpi.position_top')
                    : t('standalone.dpi.position_bottom')
                }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div class="flex justify-end gap-6">
        <NeButton v-if="step === 1" kind="tertiary" size="lg" @click="close">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton v-else kind="tertiary" size="lg" @click="goToPreviousStep">
          <template #prefix>
            <FontAwesomeIcon :icon="faArrowLeft" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('common.previous') }}
        </NeButton>
        <NeButton v-if="step < TOTAL_STEPS" kind="primary" size="lg" @click="goToNextStep">
          {{ t('common.next') }}
          <template #suffix>
            <FontAwesomeIcon :icon="faArrowRight" class="h-4 w-4" aria-hidden="true" />
          </template>
        </NeButton>
        <NeButton
          v-else
          kind="primary"
          size="lg"
          :loading="isSaving"
          :disabled="isSaving"
          @click="save"
        >
          {{ isEditing ? t('common.save') : t('standalone.dpi.add_rule') }}
        </NeButton>
      </div>
    </div>
    <CreateApplicationGroupModal
      :visible="isShownCreateGroupModal"
      @close="isShownCreateGroupModal = false"
      @save="onGroupCreated"
    />
  </NeSideDrawer>
</template>
