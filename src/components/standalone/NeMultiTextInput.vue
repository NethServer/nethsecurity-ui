<script setup lang="ts">
import { onMounted } from 'vue'
import { ref } from 'vue'
import {
  NeButton,
  NeTextInput,
  type NeComboboxOption,
  NeCombobox
} from '@nethserver/vue-tailwind-lib'
import { watch } from 'vue'
import _ from 'lodash'

export type KeyValueItem = {
  key: string
  value: string
}

const props = withDefaults(
  defineProps<{
    useKeyCombobox: boolean
    modelValue: string[] | KeyValueItem[]
    addItemLabel: string
    invalidMessages?: string[]
    invalidKeyMessages?: string[]
    keyOptions?: NeComboboxOption[]
    title?: string
    optional?: boolean
    disableInputs?: boolean
    disableAddButton?: boolean
    optionalLabel?: string
    comboboxPlaceholder?: string
    textInputPlaceholder?: string
  }>(),
  { useKeyCombobox: false }
)

const emit = defineEmits(['delete-item', 'add-item', 'update:modelValue'])

const keys = ref<string[]>([])
const items = ref<string[]>([])

function refreshKeysAndItems() {
  items.value = [
    ...(!props.useKeyCombobox
      ? (props.modelValue as string[])
      : (props.modelValue as KeyValueItem[]).map((x) => x.value))
  ]
  if (props.useKeyCombobox) {
    keys.value = [...(props.modelValue as KeyValueItem[]).map((x) => x.key)]
  }
}

function emitUpdate() {
  if (props.useKeyCombobox) {
    emit(
      'update:modelValue',
      _.zip(keys.value, items.value).map(([k, v]) => ({ key: k, value: v }))
    )
  } else {
    emit('update:modelValue', items.value)
  }
}

function deleteItem(idx: number) {
  items.value.splice(idx, 1)
  if (props.useKeyCombobox) {
    keys.value.splice(idx, 1)
  }
  emitUpdate()
  emit('delete-item')
}

function addItem() {
  items.value.push('')
  if (props.useKeyCombobox) {
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
      :class="`${items.length > 0 ? 'mb-2' : 'mb-4'} flex items-center justify-between`"
    >
      <div>
        <span class="mr-2 text-sm font-medium leading-6 text-gray-700 dark:text-gray-200">
          {{ title }}
        </span>
        <slot name="tooltip"></slot>
      </div>
      <span v-if="optional" class="ml-2 text-sm font-normal">{{ optionalLabel }}</span>
    </div>

    <div class="space-y-6">
      <div class="space-y-4">
        <div v-for="(item, i) in items" :key="i" class="flex items-start gap-2">
          <NeCombobox
            :options="keyOptions"
            :model-value="keys[i]"
            @update:model-value="(e) => updateModelKey(i, e)"
            :invalid-message="invalidKeyMessages ? invalidKeyMessages[i] : ''"
            :placeholder="comboboxPlaceholder"
            v-if="useKeyCombobox"
          />
          <NeTextInput
            :value="useKeyCombobox ? items[i] : items[i]"
            @input="updateModelValue(i, $event.target.value)"
            class="grow"
            :invalid-message="invalidMessages ? invalidMessages[i] : ''"
            :disabled="disableInputs"
            :placeholder="textInputPlaceholder"
          />
          <NeButton kind="tertiary" size="md" @click="deleteItem(i)">
            <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4 py-1" aria-hidden="true" />
          </NeButton>
        </div>
        <NeButton size="md" @click="addItem" :disabled="disableAddButton">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ addItemLabel }}
        </NeButton>
      </div>
    </div>
  </div>
</template>
