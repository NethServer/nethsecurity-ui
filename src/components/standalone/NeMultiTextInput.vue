<script setup lang="ts">
import { onMounted } from 'vue'
import { ref } from 'vue'
import { NeButton, NeTextInput } from '@nethserver/vue-tailwind-lib'
import { watch } from 'vue'

const props = defineProps<{
  modelValue: string[]
  addItemLabel: string
  invalidMessages?: string[]
  title?: string
  optional?: boolean
  disableInputs?: boolean
  disableAddButton?: boolean
  optionalLabel?: string
}>()

const emit = defineEmits(['delete-item', 'add-item', 'update:modelValue'])

const items = ref<string[]>([])

function deleteItem(idx: number) {
  items.value.splice(idx, 1)
  emit('update:modelValue', items.value)
  emit('delete-item')
}

function addItem() {
  items.value.push('')
  emit('update:modelValue', items.value)
  emit('add-item')
}

function updateModelValue(idx: number, newValue: string) {
  items.value[idx] = newValue
  emit('update:modelValue', items.value)
}

watch(props.modelValue, () => {
  items.value = [...props.modelValue]
})

onMounted(() => {
  items.value = [...props.modelValue]
})
</script>

<template>
  <div>
    <div v-if="title" class="mb-4 flex items-end justify-between">
      <div>
        <span class="mr-2 text-sm font-medium leading-6 text-gray-700 dark:text-gray-200">
          {{ title }}
        </span>
        <slot name="tooltip"></slot>
      </div>
      <span v-if="optional" class="ml-2 font-normal">{{ optionalLabel }}</span>
    </div>

    <div class="space-y-6">
      <div class="space-y-4">
        <div v-for="(item, i) in items" :key="i" class="flex items-start gap-2">
          <NeTextInput
            :value="items[i]"
            @input="updateModelValue(i, $event.target.value)"
            class="grow"
            :invalid-message="invalidMessages ? invalidMessages[i] : ''"
            :disabled="disableInputs"
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
