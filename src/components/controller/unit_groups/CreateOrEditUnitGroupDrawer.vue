<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { MessageBag, validateRequired } from '@/lib/validation'
import { ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeTextInput,
  NeCombobox,
  type NeComboboxOption,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { ValidationError } from '@/lib/standalone/ubus'
import { useUnitGroupsStore } from '@/stores/controller/unit_groups'
import type { UnitGroup } from '@/stores/controller/unit_groups'

const props = defineProps<{
  isShown: boolean
  allUnits: Array<NeComboboxOption>
  itemToEdit?: UnitGroup
}>()

const { t } = useI18n()
const unitGroupsStore = useUnitGroupsStore()

const emit = defineEmits(['add-group', 'edit-group', 'close-drawer'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// Form fields
const id = ref<number>()
const name = ref('')
const description = ref('')
const units = ref<NeComboboxOption[]>([])

// input refs
const nameRef = useTemplateRef('name')

async function resetForm() {
  if (props.itemToEdit != undefined) {
    id.value = props.itemToEdit.id
    name.value = props.itemToEdit.name
    description.value = props.itemToEdit.description
    // Remap itemToEdit.units to NeComboboxOption[]
    units.value = props.itemToEdit.units
      ? (props.itemToEdit.units.map((unit: any) => ({
          id: unit,
          // Find the label from allUnits by matching id
          label: props.allUnits.find((opt) => opt.id === unit)?.label || unit,
          description: props.allUnits.find((opt) => opt.id === unit)?.description || ''
        })) as Array<NeComboboxOption>)
      : []
  } else {
    id.value = undefined
    name.value = ''
    description.value = ''
    units.value = []
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  emit('close-drawer')
}

function validate() {
  validationErrorBag.value.clear()

  const nameValidator = validateRequired(name.value)
  if (!nameValidator.valid) {
    validationErrorBag.value.set('name', [nameValidator.errMessage as string])
    focusElement(nameRef)
  }

  if (units.value.length === 0) {
    validationErrorBag.value.set('units', ['error.required'])
  }

  return validationErrorBag.value.size < 1
}

async function createOrEditUnitGroup() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  validationErrorBag.value.clear()

  try {
    isSavingChanges.value = true

    if (validate()) {
      if (id.value == undefined) {
        await unitGroupsStore.addUnitGroup(
          name.value,
          description.value,
          units.value.map((unit: NeComboboxOption) => unit.id)
        )
        emit('add-group')
      } else {
        await unitGroupsStore.updateUnitGroup(
          id.value,
          name.value,
          description.value,
          units.value.map((unit: NeComboboxOption) => unit.id)
        )
        emit('edit-group')
      }
      close()
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle =
        id.value != undefined
          ? t('error.cannot_edit_unit_group')
          : t('error.cannot_create_unit_group')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } finally {
    isSavingChanges.value = false
  }
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      resetForm()
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :close-aria-label="t('common.shell.close_side_drawer')"
    :title="id ? t('controller.unit_groups.edit_group') : t('controller.unit_groups.add_group')"
    @close="close()"
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <div class="flex flex-col gap-y-6">
      <NeTextInput
        ref="name"
        v-model="name"
        :label="t('controller.unit_groups.name')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('name'))"
      />
      <NeTextInput
        v-model="description"
        :label="t('controller.unit_groups.description')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('description'))"
        :optional="true"
      />
      <div>
        <NeCombobox
          v-model="units"
          :label="t('controller.unit_groups.units')"
          :options="allUnits"
          :placeholder="t('ne_combobox.choose_or_enter')"
          :no-results-label="t('ne_combobox.no_results')"
          :limited-options-label="t('ne_combobox.limited_options_label')"
          :no-options-label="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :multiple="true"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('units'))"
        />
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          @click="createOrEditUnitGroup()"
        >
          {{ id ? t('common.save') : t('controller.unit_groups.add_group') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
