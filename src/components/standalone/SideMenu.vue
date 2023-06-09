<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getStandaloneRoutePrefix } from '@/lib/router'
import { isEmpty } from 'lodash'
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const navigation: Ref<any> = ref([
  { name: t('standalone.dashboard.title'), to: 'dashboard', icon: 'house' },
  {
    name: t('standalone.system.title'),
    icon: 'server',
    to: 'system',
    children: [
      { name: t('standalone.registration.title'), to: 'system/registration' },
      {
        name: t('standalone.system_settings.title'),
        to: 'system/systemSettings'
      },
      { name: t('standalone.services.title'), to: 'system/services' },
      { name: t('standalone.ssh.title'), to: 'system/ssh' },
      {
        name: t('standalone.backup_and_restore.title'),
        to: 'system/backup-restore'
      },
      {
        name: t('standalone.reboot_and_shutdown.title'),
        to: 'system/reboot-shutdown'
      }
    ],
    expanded: false
  },
  {
    name: t('standalone.network.title'),
    to: 'network',
    icon: 'network-wired',
    children: [
      {
        name: t('standalone.interfaces_and_devices.title'),
        to: 'network/interfaces-and-devices'
      }
    ],
    expanded: false
  },
  {
    name: t('standalone.users_and_objects.title'),
    to: 'users-and-objects',
    icon: 'user-group'
  },
  { name: t('standalone.firewall.title'), to: 'firewall', icon: 'block-brick-fire' },
  { name: t('standalone.security.title'), to: 'security', icon: 'shield-halved' },
  { name: t('standalone.vpn.title'), to: 'vpn', icon: 'globe' },
  { name: t('standalone.logs.title'), to: 'logs', icon: 'list' },
  { name: t('standalone.report.title'), to: 'report', icon: 'chart-line' }
])

function isCurrentRoute(itemPath: string) {
  return route.path.includes(itemPath)
}
</script>

<template>
  <li v-for="item in navigation" :key="item.name">
    <!-- simple link -->
    <template v-if="isEmpty(item.children)">
      <router-link
        :to="`${getStandaloneRoutePrefix()}/${item.to}`"
        :class="[
          isCurrentRoute(item.to)
            ? 'border-l-4 border-primary-700 dark:border-primary-500 text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-800'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
          'cursor-pointer group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm leading-6 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
      >
        <font-awesome-icon
          :icon="[isCurrentRoute(item.to) ? 'fas' : 'fal', item.icon]"
          class="h-6 w-6 shrink-0"
          aria-hidden="true"
        />
        {{ item.name }}
      </router-link>
    </template>
    <!-- open submenu -->
    <template v-else>
      <a
        :class="[
          isCurrentRoute(item.to)
            ? 'text-gray-900 dark:text-gray-50'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
          'cursor-pointer group flex items-center justify-between rounded-md px-3 py-2 text-sm leading-6 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
      >
        <div class="flex items-center gap-x-3">
          <font-awesome-icon
            :icon="[isCurrentRoute(item.to) ? 'fas' : 'fal', item.icon]"
            class="h-6 w-6 shrink-0"
            aria-hidden="true"
          />
          <span>
            {{ item.name }}
          </span>
        </div>
        <font-awesome-icon
          :icon="['fas', 'chevron-down']"
          class="ml-2 h-3 w-3 shrink-0"
          aria-hidden="true"
        />
      </a>
      <ul role="list" class="space-y-1">
        <li v-for="child in item.children" :key="child.name">
          <div class="ml-10">
            <router-link
              :to="`${getStandaloneRoutePrefix()}/${child.to}`"
              :class="[
                isCurrentRoute(child.to)
                  ? 'border-l-4 border-primary-700 dark:border-primary-500 text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
                'cursor-pointer group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm leading-6 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800'
              ]"
            >
              {{ child.name }}
            </router-link>
          </div>
        </li>
      </ul>
    </template>
  </li>
</template>
