<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { type PropType, ref, watch, computed, onMounted } from 'vue'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { isEqual } from 'lodash-es'
import { v4 as uuidv4 } from 'uuid'

//// review

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type FilterKind = 'radio' | 'checkbox'

export type FilterOption = {
  id: string
  label: string
  description?: string
  disabled?: boolean
}

const sizeStyle: { [index: string]: string } = {
  xs: 'rounded px-2 py-1 text-xs',
  sm: 'rounded px-2 py-1 text-sm',
  md: 'rounded-md px-2.5 py-1.5 text-sm',
  lg: 'rounded-md px-3 py-2 text-sm',
  xl: 'rounded-md px-3.5 py-2.5 text-sm'
}

//// new syntax for props

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  options: {
    type: Array as PropType<FilterOption[]>,
    required: true
  },
  alignToRight: {
    type: Boolean,
    default: true
  },
  kind: {
    type: String as PropType<FilterKind>,
    required: true
  },
  size: {
    type: String as PropType<ButtonSize>,
    default: 'md'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  id: {
    type: String,
    default: ''
  },
  openMenuAriaLabel: {
    type: String,
    required: true
  }
})

library.add(faChevronDown)

const model = defineModel<string[]>()
const radioModel = ref('')
const checkboxModel = ref<string[]>([])
const top = ref(0)
const left = ref(0)
const right = ref(0)
const buttonRef = ref()

const componentId = computed(() => (props.id ? props.id : uuidv4()))

watch(
  () => props.alignToRight,
  () => {
    calculatePosition()
  }
)

watch(
  () => radioModel.value,
  () => {
    model.value = [radioModel.value]
  }
)

watch(
  () => checkboxModel.value,
  () => {
    model.value = checkboxModel.value
  }
)

watch(
  () => model.value,
  () => {
    updateInternalModel()
  }
)

onMounted(() => {
  updateInternalModel()
})

function updateInternalModel() {
  if (props.kind === 'radio') {
    // update only if the value is different to avoid "Maximum recursive updates exceeded" error
    if (model.value && radioModel.value !== model.value[0]) {
      radioModel.value = model.value[0]
    }
  } else if (props.kind === 'checkbox') {
    // update only if the value is different to avoid "Maximum recursive updates exceeded" error
    if (model.value && !isEqual(checkboxModel.value, model.value)) {
      checkboxModel.value = model.value
    }
  }
}

function calculatePosition() {
  top.value = buttonRef.value?.$el.getBoundingClientRect().bottom + window.scrollY
  left.value = buttonRef.value?.$el.getBoundingClientRect().left - window.scrollX
  right.value =
    document.documentElement.clientWidth -
    buttonRef.value?.$el.getBoundingClientRect().right -
    window.scrollX
}
</script>

<template>
  ////
  <div>radioModel {{ radioModel }}</div>
  <div>checkboxModel {{ checkboxModel }}</div>

  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      ref="buttonRef"
      class="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50"
      @click="calculatePosition()"
    >
      <span class="sr-only">{{ openMenuAriaLabel }}</span>
      <slot name="button">
        <!-- default button -->
        <button
          class="font-semibold text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors duration-200 hover:bg-gray-200/70 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:ring-gray-500 dark:hover:bg-gray-600/30 dark:hover:text-gray-50 dark:focus:ring-primary-300 dark:focus:ring-offset-primary-950"
          :class="sizeStyle[props.size]"
          :disabled="disabled"
          type="button"
        >
          <div class="flex items-center justify-center">
            <slot v-if="$slots.label" name="label"></slot>
            <span v-else>{{ label }}</span>
            <font-awesome-icon
              :icon="['fas', 'chevron-down']"
              class="ml-2 h-3 w-3"
              aria-hidden="true"
            />
          </div>
        </button>
      </slot>
    </MenuButton>
    <Teleport to="body">
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <MenuItems
          :style="[
            { top: top + 'px' },
            alignToRight ? { right: right + 'px' } : { left: left + 'px' }
          ]"
          class="absolute z-50 mt-2.5 min-w-[10rem] rounded-md bg-white px-4 py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none dark:bg-gray-950 dark:ring-gray-500/50"
        >
          <MenuItem as="div" v-for="option in options" :key="option.id" :disabled="option.disabled">
            <!-- divider -->
            <hr
              v-if="option.id.includes('divider')"
              class="my-1 border-gray-200 dark:border-gray-700"
            />
            <!-- filter option -->
            <div v-if="kind === 'radio'" class="flex items-center py-2" @click.stop>
              <!-- radio button -->
              <input
                type="radio"
                :id="`${componentId}-${option.id}`"
                :name="componentId"
                v-model="radioModel"
                :value="option.id"
                :aria-describedby="`${componentId}-${option.id}-description`"
                class="peer border-gray-300 text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-950 dark:text-primary-500 checked:dark:bg-primary-500 dark:focus:ring-primary-300 focus:dark:ring-primary-200 focus:dark:ring-offset-gray-900"
                :disabled="option.disabled || disabled"
              />
              <label
                :for="`${componentId}-${option.id}`"
                :disabled="option.disabled"
                class="ms-2 text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:text-gray-50"
              >
                <div>{{ option.label }}</div>
                <div
                  v-if="option.description"
                  :id="`${componentId}-${option.id}-description`"
                  class="text-gray-500 dark:text-gray-400"
                >
                  {{ option.description }}
                </div>
              </label>
            </div>
            <div v-else-if="kind === 'checkbox'" class="flex items-center py-2" @click.stop>
              <!-- checkbox -->
              <div class="flex h-6 items-center">
                <input
                  type="checkbox"
                  :id="`${componentId}-${option.id}`"
                  v-model="checkboxModel"
                  :value="option.id"
                  :aria-describedby="`${componentId}-${option.id}-description`"
                  :disabled="option.disabled || disabled"
                  class="h-5 w-5 rounded border-gray-300 text-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-500 dark:text-primary-500 dark:focus:ring-primary-300 dark:focus:ring-offset-primary-950 sm:h-4 sm:w-4"
                />
              </div>
              <div class="ml-3 text-sm leading-6">
                <!-- show label prop or default slot -->
                <label
                  :class="[
                    'font-medium text-gray-700 dark:text-gray-50',
                    { 'cursor-not-allowed opacity-50': disabled }
                  ]"
                  :for="`${componentId}-${option.id}`"
                >
                  <div>{{ option.label }}</div>
                  <div
                    v-if="option.description"
                    :id="`${componentId}-${option.id}-description`"
                    class="text-gray-500 dark:text-gray-400"
                  >
                    {{ option.description }}
                  </div>
                </label>
              </div>
            </div>
          </MenuItem>
        </MenuItems>
      </transition>
    </Teleport>
  </Menu>
  <!-- <NeDropdown :items="options" :openMenuAriaLabel="openMenuAriaLabel" :alignToRight="alignToRight"> //// 
    <template #button>
      <button
        class="font-semibold text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors duration-200 hover:bg-gray-200/70 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:ring-gray-500 dark:hover:bg-gray-600/30 dark:hover:text-gray-50 dark:focus:ring-primary-300 dark:focus:ring-offset-primary-950"
        :class="sizeStyle[props.size]"
        :disabled="disabled"
        type="button"
      >
        <div class="flex items-center justify-center">
          <slot v-if="$slots.label" name="label"></slot>
          <span v-else>{{ label }}</span>
          <font-awesome-icon
            :icon="['fas', 'chevron-down']"
            class="ml-2 h-3 w-3"
            aria-hidden="true"
          />
        </div>
      </button>
    </template>
  </NeDropdown> -->
</template>
