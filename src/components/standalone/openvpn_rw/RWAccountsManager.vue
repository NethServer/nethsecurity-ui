<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { RWServer, RWUser } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import {
  NeEmptyState,
  NeTitle,
  NeTextInput,
  NeCombobox,
  NeButton,
  type NeComboboxOption
} from '@nethserver/vue-tailwind-lib'
import { computed } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RWAccountsTable from './RWAccountsTable.vue'

const props = defineProps<{ users: RWUser[]; server: RWServer }>()

const { t } = useI18n()

const filter = ref('')
const connectionFilter = ref<'all' | 'connected' | 'not_connected'>('all')

const connectionFilterOptions = ref<NeComboboxOption[]>([
  {
    id: 'all',
    label: t('standalone.openvpn_rw.connection_all')
  },
  {
    id: 'connected',
    label: t('standalone.openvpn_rw.connection_connected')
  },
  {
    id: 'not_connected',
    label: t('standalone.openvpn_rw.connection_not_connected')
  }
])

const filteredUsers = computed(() => {
  return props.users.filter((user) => {
    let result = true
    if (filter.value) {
      result = user.name.includes(filter.value)
    }

    if (connectionFilter.value === 'connected') {
      result = result && user.connected
    } else if (connectionFilter.value === 'not_connected') {
      result = result && !user.connected
    }

    return result
  })
})
</script>

<template>
  <div class="flex flex-col">
    <NeTitle level="h3">{{ t('standalone.openvpn_rw.roadwarrior_accounts') }}</NeTitle>
    <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
      {{ t('standalone.openvpn_rw.roadwarrior_accounts_description') }}
    </p>
  </div>
  <div class="flex flex-row items-center justify-between">
    <div class="flex flex-row gap-x-3">
      <NeTextInput v-model="filter" placeholder="Filter" />
      <NeCombobox v-model="connectionFilter" :options="connectionFilterOptions" />
    </div>
    <NeButton kind="secondary" @click="() => {}" class="ml-2" v-if="users.length > 0">
      <template #prefix>
        <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
      </template>
      {{ t('standalone.openvpn_rw.add_vpn_account') }}
    </NeButton>
  </div>
  <NeEmptyState
    v-if="users.length == 0"
    :title="t('standalone.openvpn_rw.no_users_found')"
    :icon="['fas', 'user-group']"
  >
    <NeButton kind="secondary" @click="() => {}">
      <template #prefix>
        <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
      </template>
      {{ t('standalone.openvpn_rw.add_vpn_account') }}
    </NeButton>
  </NeEmptyState>
  <template v-else>
    <RWAccountsTable
      v-if="filteredUsers.length > 0"
      :users="filteredUsers"
      :authentication-mode="server.ns_auth_mode"
    />
    <NeEmptyState
      v-else
      :title="t('standalone.openvpn_rw.no_users_found')"
      :icon="['fas', 'user-group']"
    />
  </template>
</template>
