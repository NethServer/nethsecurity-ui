<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getStandaloneRoutePrefix } from '@/lib/router'
import { isEmpty } from 'lodash'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

//// remove "to" attribute on items with children
const navigation = [
  { name: t('standalone.dashboard.title'), to: 'dashboard', icon: 'home', current: true },
  {
    name: 'System',
    icon: 'server',
    current: false,
    children: [
      { name: t('standalone.registration.title'), to: 'system/registration', current: false },
      { name: t('standalone.system_settings.title'), to: 'system/systemSettings', current: false },
      { name: t('standalone.services.title'), to: 'system/services', current: false },
      { name: t('standalone.ssh.title'), to: 'system/ssh', current: false },
      {
        name: t('standalone.backup_and_restore.title'),
        to: 'system/backup-restore',
        current: false
      },
      {
        name: t('standalone.reboot_and_shutdown.title'),
        to: 'system/reboot-shutdown',
        current: false
      }
    ],
    expanded: false
  },
  { name: t('standalone.network.title'), to: 'network', icon: 'network-wired', current: false },
  {
    name: t('standalone.users_and_objects.title'),
    to: 'users-and-objects',
    icon: 'user-group',
    current: false
  },
  { name: t('standalone.firewall.title'), to: 'firewall', icon: 'fire', current: false },
  { name: t('standalone.security.title'), to: 'security', icon: 'shield-halved', current: false },
  { name: t('standalone.vpn.title'), to: 'vpn', icon: 'globe', current: false },
  { name: t('standalone.logs.title'), to: 'logs', icon: 'list', current: false },
  { name: t('standalone.report.title'), to: 'report', icon: 'chart-line', current: false }
]
</script>

<template>
  <li v-for="item in navigation" :key="item.name">
    <!-- simple link -->
    <template v-if="isEmpty(item.children)">
      <router-link
        :to="`${getStandaloneRoutePrefix()}/${item.to}`"
        :class="[
          item.current
            ? 'text-gray-900 dark:text-gray-50'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
          'cursor-pointer group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
      >
        <font-awesome-icon :icon="['fas', item.icon]" class="h-6 w-6 shrink-0" aria-hidden="true" />
        {{ item.name }}
      </router-link>
    </template>
    <!-- open submenu -->
    <template v-else>
      <a
        :class="[
          item.current
            ? 'text-gray-900 dark:text-gray-50'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
          'cursor-pointer group flex items-center justify-between rounded-md p-2 text-sm leading-6 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
      >
        <div class="flex items-center gap-x-3">
          <font-awesome-icon
            :icon="['fas', item.icon]"
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
                child.current
                  ? 'text-gray-900 dark:text-gray-50'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
                'cursor-pointer group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800'
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
