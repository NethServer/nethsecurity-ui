<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted } from 'vue'
import { ref } from 'vue'
import { NeCombobox, type NeComboboxOption, NeButton, NeTextInput } from '@nethesis/vue-components'
import { watch } from 'vue'
import { zip } from 'lodash-es'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus, faTrash } from '@fortawesome/free-solid-svg-icons'

export type KeyValueItem = {
  key: string
  value: string
}

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    useKeyInput?: boolean
    keyInputType?: 'combobox' | 'text'
    required?: boolean
    modelValue: string[] | KeyValueItem[]
    addItemLabel: string
    invalidMessages?: string[]
    generalInvalidMessage?: string
    invalidKeyMessages?: string[]
    keyOptions?: NeComboboxOption[]
    title?: string
    optional?: boolean
    disableInputs?: boolean
    disableAddButton?: boolean
    optionalLabel?: string
    keyInputPlaceholder?: string
    placeholder?: string
  }>(),
  { useKeyInput: false, required: false, keyOptions: () => [] }
)

defineExpose({
  focus
})

const emit = defineEmits(['delete-item', 'add-item', 'update:modelValue'])

const keys = ref<string[]>([])
const items = ref<string[]>([])

const inputRef = ref()

function refreshKeysAndItems() {
  items.value = [
    ...(!props.useKeyInput
      ? (props.modelValue as string[])
      : (props.modelValue as KeyValueItem[]).map((x) => x.value))
  ]
  if (props.useKeyInput) {
    keys.value = [...(props.modelValue as KeyValueItem[]).map((x) => x.key)]
  }
}

function emitUpdate() {
  if (props.useKeyInput) {
    emit(
      'update:modelValue',
      zip(keys.value, items.value).map(([k, v]) => ({ key: k, value: v }))
    )
  } else {
    emit('update:modelValue', items.value)
  }
}

function deleteItem(idx: number) {
  items.value.splice(idx, 1)
  if (props.useKeyInput) {
    keys.value.splice(idx, 1)
  }
  emitUpdate()
  emit('delete-item')
}

function addItem() {
  items.value.push('')
  if (props.useKeyInput) {
    keys.value.push('')
  }
  emitUpdate()
  emit('add-item')
}

function updateModelValue(idx: number, newValue: string) {
  items.value[idx] = newValue
  emitUpdate()
}

function updateModelKey(idx: number, newValue: string) {
  keys.value[idx] = newValue
  emitUpdate()
}

function focus() {
  inputRef.value?.focus()
}

watch(
  () => props.modelValue,
  () => {
    refreshKeysAndItems()
  },
  { deep: true }
)

onMounted(() => {
  refreshKeysAndItems()
})
</script>

<template>
  <div>
    <div
      v-if="title"
      :class="`${
        items.length > 0 || generalInvalidMessage ? 'mb-2' : ''
      } flex items-center justify-between`"
    >
      <div>
        <span class="mr-2 text-sm leading-6 font-medium text-gray-700 dark:text-gray-200">
          {{ title }}
        </span>
        <slot name="tooltip"></slot>
      </div>
      <span v-if="optional" class="ml-2 text-sm font-normal">{{ optionalLabel }}</span>
    </div>

    <div class="space-y-4">
      <div v-for="(item, i) in items" :key="i" class="flex items-start gap-2">
        <NeCombobox
          v-if="useKeyInput && keyInputType === 'combobox'"
          :options="keyOptions"
          :model-value="keys[i]"
          :invalid-message="invalidKeyMessages ? invalidKeyMessages[i] : ''"
          :placeholder="keyInputPlaceholder"
          :no-results-label="t('ne_combobox.no_results')"
          :limited-options-label="t('ne_combobox.limited_options_label')"
          :no-options-label="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optional-label="t('common.optional')"
          @update:model-value="(e: any) => updateModelKey(i, e)"
        />
        <NeTextInput
          v-else-if="useKeyInput && keyInputType === 'text'"
          :model-value="keys[i]"
          :placeholder="keyInputPlaceholder"
          :invalid-message="invalidKeyMessages ? invalidKeyMessages[i] : ''"
          @update:model-value="(e: any) => updateModelKey(i, e)"
        />
        <NeTextInput
          :ref="
            (r: any) => {
              if (i == 0) {
                inputRef = r
              }
            }
          "
          :value="items[i]"
          class="grow"
          :invalid-message="invalidMessages ? invalidMessages[i] : ''"
          :disabled="disableInputs"
          :placeholder="placeholder"
          @input="updateModelValue(i, $event.target.value)"
        />
        <NeButton
          kind="tertiary"
          size="md"
          :disabled="items.length <= 1 && required"
          @click="deleteItem(i)"
        >
          <FontAwesomeIcon :icon="faTrash" class="h-4 w-4 py-1" aria-hidden="true" />
        </NeButton>
      </div>
      <p v-if="generalInvalidMessage" :class="'mt-2 text-sm text-rose-700 dark:text-rose-400'">
        {{ generalInvalidMessage }}
      </p>
      <NeButton
        class="mt-4 -ml-2.5"
        size="md"
        :disabled="disableAddButton"
        kind="tertiary"
        @click="addItem"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
        </template>
        {{ addItemLabel }}
      </NeButton>
    </div>
  </div>
</template>
