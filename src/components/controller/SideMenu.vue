<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getControllerRoutePrefix } from '@/lib/router'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

interface MenuItem {
  name: string
  to: string
  icon?: string
  children?: MenuItem[]
}

const { t } = useI18n()
const route = useRoute()
const controllerLogin = useLoginStore()

const navigation: Ref<MenuItem[]> = ref([
  {
    name: 'controller.units.title',
    to: 'units',
    icon: 'server'
  },
  {
    name: 'controller.account_settings.title',
    to: 'account',
    icon: 'gear'
  },
  ...(controllerLogin.isAdmin
    ? [
        {
          name: 'controller.users.title',
          to: 'users',
          icon: 'user-group'
        }
      ]
    : [])
])

function isCurrentRoute(itemPath: string) {
  return route.path.includes(itemPath)
}
</script>

<template>
  <li v-for="item in navigation" :key="item.name">
    <router-link
      :to="`${getControllerRoutePrefix()}/${item.to}`"
      :class="[
        isCurrentRoute(item.to)
          ? 'border-l-4 border-primary-700 bg-gray-100 text-gray-900 dark:border-primary-500 dark:bg-gray-800 dark:text-gray-50'
          : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
        'group flex cursor-pointer items-center gap-x-3 rounded-md px-3 py-2 text-sm font-semibold leading-6 hover:bg-gray-100 dark:hover:bg-gray-800'
      ]"
    >
      <font-awesome-icon
        :icon="[isCurrentRoute(item.to) ? 'fas' : 'fal', item.icon]"
        class="h-6 w-8 shrink-0"
        aria-hidden="true"
      />
      {{ t(item.name) }}
    </router-link>
  </li>
</template>
