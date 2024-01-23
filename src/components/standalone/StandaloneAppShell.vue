<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useThemeStore } from '@/stores/theme'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import SideMenu from './SideMenu.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { NeButton, NeDropdown, NeSkeleton } from '@nethserver/vue-tailwind-lib'
import { isStandaloneMode, getCompanyName } from '@/lib/config'
import { useI18n } from 'vue-i18n'
import UciChangesModal from './UciChangesModal.vue'
import { isEmpty, isEqual } from 'lodash-es'
import router from '@/router'
import ToastNotificationsArea from './ToastNotificationsArea.vue'
import NotificationDrawer from './NotificationDrawer.vue'
import { useNotificationsStore } from '@/stores/standalone/notifications'
import { ubusCall } from '@/lib/standalone/ubus'

const loginStore = useLoginStore()
const uciChangesStore = useUciPendingChangesStore()
const themeStore = useThemeStore()
const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const unitName = ref('')

let loading = ref({
  systemBoard: false
})

const sidebarOpen = ref(false)

let showUciChangesModal = ref(false)

let isChangesButtonFlashing = ref(false)

const topBarButtonsColorClasses =
  'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50'

const logoFilename = computed(() => {
  if (themeStore.isLight) {
    return 'logo_light.svg'
  } else {
    return 'logo_dark.svg'
  }
})

const accountMenuOptions = computed(() => {
  return [
    {
      id: 'account',
      label: t('standalone.shell.account_settings'),
      icon: 'circle-user',
      iconStyle: 'fas',
      action: () => router.push('/standalone/user'),
      disabled: !isStandaloneMode()
    },
    {
      id: 'theme',
      label: t('standalone.shell.toggle_theme'),
      icon: themeStore.isLight ? 'moon' : 'sun',
      iconStyle: 'fas',
      action: themeStore.toggleTheme
    },
    {
      id: 'logout',
      label: t('standalone.shell.sign_out'),
      icon: 'right-from-bracket',
      iconStyle: 'fas',
      action: loginStore.logout,
      disabled: !isStandaloneMode()
    }
  ]
})

watch(
  () => uciChangesStore.changes,
  (newChanges, oldChanges) => {
    // do nothing if there are no changes or they are the same as the previous ones
    if (isEmpty(newChanges) || isEqual(newChanges, oldChanges)) {
      return
    }

    // briefly flash unsaved changes button
    setTimeout(() => {
      isChangesButtonFlashing.value = true
    }, 500)

    setTimeout(() => {
      isChangesButtonFlashing.value = false
    }, 1000)
  }
)

function openNotificationsDrawer() {
  notificationsStore.setNotificationDrawerOpen(true)
}

async function getSystemBoard() {
  loading.value.systemBoard = true
  const systemBoard = await ubusCall('system', 'board')
  unitName.value = systemBoard.data.hostname
  loading.value.systemBoard = false
}

onMounted(() => {
  getSystemBoard()
})
</script>

<template>
  <div>
    <!-- sidebar for mobile  -->
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog as="div" class="relative z-50 lg:hidden" @close="sidebarOpen = false">
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-900/80 dark:bg-gray-900/80" />
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in-out duration-300"
                leave-from="opacity-100"
                leave-to="opacity-0"
              >
                <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="sidebarOpen = false">
                    <span class="sr-only">{{ t('standalone.shell.close_sidebar') }}</span>
                    <font-awesome-icon
                      :icon="['fas', 'xmark']"
                      class="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </TransitionChild>
              <!-- Sidebar component -->
              <div
                class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-2 pb-4 dark:bg-gray-950"
              >
                <div class="flex h-16 shrink-0 items-center">
                  <img
                    class="h-8 w-auto px-3"
                    :src="`/${logoFilename}`"
                    :alt="`${getCompanyName()} logo`"
                    aria-hidden="true"
                  />
                </div>
                <nav class="flex flex-1 flex-col">
                  <ul role="list" class="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" class="space-y-1">
                        <SideMenu />
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <!-- //// removed lg:inset-y-0 class -->
    <div class="hidden lg:fixed lg:z-50 lg:flex lg:h-screen lg:w-72 lg:flex-col">
      <!-- Sidebar component -->
      <div
        class="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-2 pb-4 dark:border-gray-700 dark:bg-gray-950"
      >
        <div class="flex h-16 shrink-0 items-center">
          <img
            class="h-8 w-auto px-3"
            :src="`/${logoFilename}`"
            :alt="`${getCompanyName()} logo`"
          />
        </div>
        <nav class="flex flex-1 flex-col">
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="space-y-2">
                <SideMenu />
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <div class="lg:pl-72">
      <div
        class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-950 sm:gap-x-6 sm:px-6 lg:px-8"
      >
        <button
          type="button"
          class="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50 lg:hidden"
          @click="sidebarOpen = true"
        >
          <span class="sr-only">{{ t('standalone.shell.open_sidebar') }}</span>
          <font-awesome-icon :icon="['fas', 'bars']" class="h-6 w-6 shrink-0" aria-hidden="true" />
        </button>

        <!-- Separator -->
        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" aria-hidden="true" />

        <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <form class="relative flex flex-1" action="#" method="GET">
            <!-- <label for="search-field" class="sr-only">{{ t('common.search') }}</label> //// global search
            <font-awesome-icon
              :icon="['fas', 'magnifying-glass']"
              :class="[
                'pointer-events-none absolute inset-y-0 left-0 h-full w-4',
                topBarButtonsColorClasses
              ]"
              aria-hidden="true"
            />
            <input
              id="search-field"
              class="block h-full w-full border-0 bg-white py-0 pl-8 pr-0 text-gray-900 placeholder:text-gray-400 focus:ring-0 dark:bg-gray-950 dark:text-gray-50 dark:placeholder:text-gray-500 sm:text-sm"
              :placeholder="t('common.search')"
              type="search"
              name="search"
            /> -->
          </form>
          <div class="flex items-center gap-x-4 lg:gap-x-6">
            <div v-if="uciChangesStore.numChanges">
              <NeButton
                kind="primary"
                size="md"
                @click="showUciChangesModal = true"
                class="relative"
              >
                <template #prefix>
                  <font-awesome-icon
                    :icon="['fas', 'pen-to-square']"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </template>
                <span>
                  {{ t('standalone.uci_changes.unsaved_changes') }}
                </span>
                <span
                  v-if="isChangesButtonFlashing"
                  class="absolute inline-flex h-full w-3/4 animate-ping rounded-md bg-primary-500 opacity-75 dark:bg-primary-300 dark:opacity-75"
                ></span>
              </NeButton>
              <UciChangesModal
                :visible="showUciChangesModal"
                @close="showUciChangesModal = false"
              />
            </div>

            <!-- unit name -->
            <div class="hidden text-sm lg:block lg:h-6" aria-hidden="true">
              <NeSkeleton v-if="loading.systemBoard" class="w-28" />
              <span v-else>{{ unitName }}</span>
            </div>

            <!-- separator -->
            <div
              class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-gray-700"
              aria-hidden="true"
            />

            <!-- help -->
            <a
              href="https://docs.nethsecurity.org/"
              target="_blank"
              rel="noreferrer"
              :class="['-m-2.5 flex items-center gap-3 p-2.5', topBarButtonsColorClasses]"
            >
              <font-awesome-icon
                :icon="['fas', 'circle-question']"
                class="h-6 w-6 shrink-0"
                aria-hidden="true"
              />
            </a>

            <!-- notifications -->
            <button
              type="button"
              :class="['-m-2.5 flex p-2.5', topBarButtonsColorClasses]"
              @click="openNotificationsDrawer"
            >
              <span class="sr-only">{{ t('standalone.shell.show_notifications') }}</span>
              <font-awesome-icon
                :icon="['fas', 'bell']"
                class="h-6 w-6 shrink-0"
                aria-hidden="true"
              />
            </button>

            <!-- profile dropdown -->
            <NeDropdown
              :items="accountMenuOptions"
              :alignToRight="true"
              :openMenuAriaLabel="t('standalone.shell.open_user_menu')"
            >
              <template #button>
                <button type="button" :class="['-m-2.5 flex p-2.5', topBarButtonsColorClasses]">
                  <div class="flex items-center gap-2">
                    <font-awesome-icon
                      :icon="['fas', 'circle-user']"
                      class="h-6 w-6 shrink-0"
                      aria-hidden="true"
                    />
                    <font-awesome-icon
                      :icon="['fas', 'chevron-down']"
                      class="h-3 w-3 shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              </template>
            </NeDropdown>
          </div>
        </div>
      </div>

      <main class="py-10">
        <div class="px-4 sm:px-6 lg:px-8">
          <RouterView />
        </div>
      </main>
    </div>
    <NotificationDrawer />
    <ToastNotificationsArea />
  </div>
</template>
