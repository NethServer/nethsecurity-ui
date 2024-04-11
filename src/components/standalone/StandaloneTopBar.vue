<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import router from '@/router'
import { useNotificationsStore } from '@/stores/notifications'
import { NeBadge, NeButton, NeDropdown, NeSkeleton, NeTooltip } from '@nethesis/vue-components'
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { isEmpty, isEqual } from 'lodash-es'
import { ubusCall } from '@/lib/standalone/ubus'
import { isStandaloneMode } from '@/lib/config'
import UciChangesModal from './UciChangesModal.vue'

const emit = defineEmits(['openSidebar'])

const { t } = useI18n()
const loginStore = useLoginStore()
const themeStore = useThemeStore()
const uciChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

let showUciChangesModal = ref(false)
let isChangesButtonFlashing = ref(false)
const unitName = ref('')
const topBarButtonsColorClasses =
  'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50'
const shakeNotificationsIcon = ref(false)

let loading = ref({
  systemBoard: false
})

const accountMenuOptions = computed(() => {
  return [
    {
      id: 'account',
      label: t('common.shell.account_settings'),
      icon: 'circle-user',
      iconStyle: 'fas',
      action: () => router.push('/standalone/account'),
      disabled: !isStandaloneMode()
    },
    {
      id: 'theme',
      label: t('common.shell.toggle_theme'),
      icon: themeStore.isLight ? 'moon' : 'sun',
      iconStyle: 'fas',
      action: themeStore.toggleTheme
    },
    {
      id: 'logout',
      label: t('common.shell.sign_out'),
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

watch(
  () => notificationsStore.numNotifications,
  (newNum, oldNum) => {
    if (newNum > oldNum) {
      // briefly shake notifications icon
      setTimeout(() => {
        shakeNotificationsIcon.value = true
      }, 700)

      setTimeout(() => {
        shakeNotificationsIcon.value = false
      }, 2700)
    }
  }
)

onMounted(() => {
  getSystemBoard()
})

async function getSystemBoard() {
  loading.value.systemBoard = true
  const systemBoard = await ubusCall('system', 'board')
  unitName.value = systemBoard.data.hostname
  loading.value.systemBoard = false
}

function openNotificationsDrawer() {
  notificationsStore.setNotificationDrawerOpen(true)
}
</script>

<template>
  <div
    class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-950 sm:gap-x-6 sm:px-6 lg:px-8"
  >
    <button
      type="button"
      class="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50 lg:hidden"
      @click="emit('openSidebar')"
    >
      <span class="sr-only">{{ t('common.shell.open_sidebar') }}</span>
      <font-awesome-icon :icon="['fas', 'bars']" class="h-6 w-6 shrink-0" aria-hidden="true" />
    </button>

    <!-- Separator -->
    <div class="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" aria-hidden="true" />

    <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
      <div class="relative flex flex-1">
        <!-- global search -->
      </div>
      <!-- unsaved changes button -->
      <div class="flex items-center gap-x-4 lg:gap-x-6">
        <div v-if="uciChangesStore.numChanges">
          <NeButton kind="primary" size="md" @click="showUciChangesModal = true" class="relative">
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
          <UciChangesModal :visible="showUciChangesModal" @close="showUciChangesModal = false" />
        </div>

        <!-- badge for controlled unit -->
        <NeTooltip v-if="!isStandaloneMode()">
          <template #trigger>
            <NeBadge kind="primary" text="Controller" />
          </template>
          <template #content>
            {{ t('common.shell.controlled_unit_tooltip') }}
          </template>
        </NeTooltip>
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
        <NeTooltip triggerEvent="mouseenter focus" placement="bottom">
          <template #trigger>
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
          </template>
          <template #content>
            {{ t('common.help') }}
          </template>
        </NeTooltip>

        <!-- notifications -->
        <NeTooltip triggerEvent="mouseenter focus" placement="bottom">
          <template #trigger>
            <button
              type="button"
              :class="['-m-2.5 flex p-2.5', topBarButtonsColorClasses]"
              @click="openNotificationsDrawer"
            >
              <span class="sr-only">{{ t('common.shell.show_notifications') }}</span>
              <font-awesome-icon
                :icon="['fas', 'bell']"
                :class="['h-6 w-6 shrink-0', { 'fa-shake': shakeNotificationsIcon }]"
                style="--fa-animation-duration: 2s"
                aria-hidden="true"
              />
            </button>
          </template>
          <template #content>
            {{ t('notifications.title') }}
          </template>
        </NeTooltip>

        <!-- profile dropdown -->
        <NeTooltip triggerEvent="mouseenter focus" placement="bottom">
          <template #trigger>
            <NeDropdown
              :items="accountMenuOptions"
              :alignToRight="true"
              :openMenuAriaLabel="t('common.shell.open_user_menu')"
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
          </template>
          <template #content>
            {{ t('common.shell.account') }}
          </template>
        </NeTooltip>
      </div>
    </div>
  </div>
</template>
