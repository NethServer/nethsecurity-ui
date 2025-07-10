<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getControllerRoutePrefix } from '@/lib/router'
import router from '@/router'
import { useNotificationsStore } from '@/stores/notifications'
import { NeDropdown, NeTooltip } from '@nethesis/vue-components'
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import {
  faGear,
  faMoon,
  faArrowRightFromBracket,
  faSun,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons'
import PlatformInfoModal from './PlatformInfoModal.vue'
import { getControllerApiEndpoint } from '@/lib/config'
import axios from 'axios'

const emit = defineEmits(['openSidebar'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const themeStore = useThemeStore()
const loginStore = useLoginStore()
const shakeNotificationsIcon = ref(false)
const topBarButtonsColorClasses =
  'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-50'

const platformInfo = ref<Record<string, any> | null>(null)
const showPlatformInfoModal = ref(false)
const platformInfoError = ref<string | null>(null)

const accountMenuOptions = computed(() => {
  return [
    {
      id: 'account',
      label: t('common.shell.account_settings'),
      icon: faGear,
      action: () => router.push(`${getControllerRoutePrefix()}/account`)
    },
    {
      id: 'theme',
      label: t('common.shell.toggle_theme'),
      icon: themeStore.isLight ? faMoon : faSun,
      action: themeStore.toggleTheme
    },
    {
      id: 'about',
      label: t('common.shell.about'),
      icon: faInfoCircle,
      action: openPlatformInfoModal
    },
    {
      id: 'logout',
      label: t('common.shell.sign_out'),
      icon: faArrowRightFromBracket,
      action: loginStore.logout
    }
  ]
})

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

async function openPlatformInfoModal() {
  try {
    const { data } = await axios.get(`${getControllerApiEndpoint()}/platform`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    platformInfo.value = data.data
  } catch (err: any) {
    platformInfoError.value = err?.message || t('error.generic_error')
  } finally {
    showPlatformInfoModal.value = true
  }
}

function openNotificationsDrawer() {
  notificationsStore.setNotificationDrawerOpen(true)
}
</script>

<template>
  <div
    class="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 dark:border-gray-700 dark:bg-gray-950"
  >
    <button
      type="button"
      class="-m-2.5 p-2.5 text-gray-600 hover:text-gray-900 lg:hidden dark:text-gray-300 dark:hover:text-gray-50"
      @click="emit('openSidebar')"
    >
      <span class="sr-only">{{ t('common.shell.open_sidebar') }}</span>
      <font-awesome-icon :icon="['fas', 'bars']" class="h-6 w-6 shrink-0" aria-hidden="true" />
    </button>

    <!-- Separator -->
    <div class="h-6 w-px bg-gray-200 lg:hidden dark:bg-gray-700" aria-hidden="true" />

    <div class="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
      <div class="relative flex flex-1">
        <!-- global search -->
      </div>
      <div class="flex items-center gap-x-4 lg:gap-x-6">
        <!-- unit name -->
        <div class="hidden text-sm lg:block lg:h-6" aria-hidden="true">
          <span>Controller</span>
        </div>

        <!-- separator -->
        <div
          class="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200 dark:lg:bg-gray-700"
          aria-hidden="true"
        />

        <!-- help -->
        <NeTooltip trigger-event="mouseenter focus" placement="bottom">
          <template #trigger>
            <a
              href="https://docs.nethsecurity.org/en/latest/controller.html"
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
        <NeTooltip trigger-event="mouseenter focus" placement="bottom">
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
        <NeTooltip trigger-event="mouseenter focus" placement="bottom">
          <template #trigger>
            <NeDropdown
              :items="accountMenuOptions"
              :align-to-right="true"
              :open-menu-aria-label="t('common.shell.open_user_menu')"
              menu-classes="z-150!"
            >
              <template #button>
                <button type="button" :class="['-m-2.5 flex p-2.5', topBarButtonsColorClasses]">
                  <div class="flex items-center gap-2">
                    <font-awesome-icon
                      :icon="loginStore.isAdmin ? ['fas', 'crown'] : ['fas', 'circle-user']"
                      class="h-6 w-6 shrink-0"
                      aria-hidden="true"
                    />
                    {{ loginStore.username }}
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

        <!-- PlatformInfoModal -->
        <PlatformInfoModal
          :visible="showPlatformInfoModal"
          :platform-info="platformInfo"
          :error="platformInfoError"
          @close="showPlatformInfoModal = false"
        />
      </div>
    </div>
  </div>
</template>
