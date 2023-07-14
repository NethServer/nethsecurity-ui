<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps({
  isShown: { type: Boolean, default: false },
  title: { type: String, default: '' },
  closeAriaLabel: { type: String, default: 'Close' }
})

const emit = defineEmits(['close'])

const { t } = useI18n()

//// move to library

//// "top" property

//// z-index property?

//// test from library

function closeDrawer() {
  emit('close')
}
</script>

<!-- //// use top-16 instead of top-0 ? -->

<template>
  <TransitionRoot as="template" :show="isShown">
    <Dialog as="div" class="relative z-50" @close="closeDrawer">
      <TransitionChild
        as="template"
        enter="transition-opacity ease-linear duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed top-0 right-0 bottom-0 left-0 bg-gray-900/80 dark:bg-gray-900/80" />
      </TransitionChild>

      <div class="fixed top-0 right-0 bottom-0 flex">
        <TransitionChild
          as="template"
          enter="transition ease-in-out duration-300 transform"
          enter-from="translate-x-full"
          enter-to="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leave-from="translate-x-0"
          leave-to="translate-x-full"
        >
          <DialogPanel
            class="relative ml-16 flex w-[80vw] sm:w-[25rem] lg:w-[30rem] 3xl:w-[35rem] flex-1 bg-white dark:bg-gray-900 shadow-[0px_20px_40px_0_rgba(0,0,0,0.2)] dark:shadow-[0px_20px_40px_0_rgba(0,0,0,0.6)]"
          >
            <TransitionChild
              v-if="!title"
              as="template"
              enter="ease-in-out duration-300"
              enter-from="opacity-0"
              enter-to="opacity-100"
              leave="ease-in-out duration-300"
              leave-from="opacity-100"
              leave-to="opacity-0"
            >
              <div class="absolute right-full top-0 flex w-16 justify-center pt-5">
                <button type="button" class="-m-2.5 p-2.5" @click="closeDrawer">
                  <span class="sr-only">{{ t('standalone.shell.close_sidebar') }}</span>
                  <font-awesome-icon
                    :icon="['fas', 'xmark']"
                    class="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </TransitionChild>
            <div class="p-6">
              <!-- drawer header -->
              <div v-if="title">
                <div class="flex items-center justify-between">
                  <div class="text-lg">
                    {{ props.title }}
                  </div>
                  <button
                    type="button"
                    @click="closeDrawer"
                    class="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-700 hover:bg-gray-200 focus:ring-gray-600 focus:ring-offset-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-gray-300 dark:focus:ring-offset-gray-900"
                  >
                    <span class="sr-only">{{ props.closeAriaLabel }}</span>
                    <font-awesome-icon
                      :icon="['fas', 'xmark']"
                      class="h-4 w-4"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <hr class="my-6 border-gray-200 dark:border-gray-700" />
              </div>
              <!-- drawer content -->
              <slot></slot>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
