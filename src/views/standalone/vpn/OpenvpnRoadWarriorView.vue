<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeHeading,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  NeEmptyState,
  getAxiosErrorMessage,
  NeTabs
} from '@nethesis/vue-components'
import { useTabs } from '@/composables/useTabs'
import RWAccountsManager from '@/components/standalone/openvpn_rw/RWAccountsManager.vue'
import RWServerDetails from '@/components/standalone/openvpn_rw/RWServerDetails.vue'
import { onUnmounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { computed } from 'vue'
import DeleteRWServerModal from '@/components/standalone/openvpn_rw/DeleteRWServerModal.vue'
import CreateOrEditRWServerDrawer from '@/components/standalone/openvpn_rw/CreateOrEditRWServerDrawer.vue'
import ConnectionsHistory from '@/components/standalone/openvpn_rw/ConnectionsHistory.vue'

export type RWAuthenticationMode =
  | 'username_password'
  | 'certificate'
  | 'username_password_certificate'
  | 'username_otp_certificate'

export type RWServer = {
  proto: string
  port: string
  dev_type: string
  topology: string
  enabled: string
  client_to_client: string
  auth: string
  cipher: string
  tls_version_min: string
  ns_auth_mode: RWAuthenticationMode
  ns_bridge?: string
  server: string
  ns_public_ip: string[]
  ns_redirect_gateway: string
  ns_local: string[]
  ns_dhcp_options: { option: string; value: string }[]
  ns_pool_start?: string
  ns_pool_end?: string
  ns_user_db: string
  compress?: string
  ns_description: string
  ifconfig_pool?: string[]
}

export type RWAccount = {
  local: boolean
  database: string
  name: string
  password: string
  description: string
  openvpn_enabled: '0' | '1'
  openvpn_ipaddr: string
  openvpn_2fa: string
  admin: boolean
  id: string
  connected: boolean
  expiration: string | number
  expired: boolean
  real_address?: string
  virtual_address?: string
  bytes_received?: string
  bytes_sent?: string
  since?: number
  used: boolean
  matches: string[]
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const RELOAD_INTERVAL = 10000
const loading = ref(true)
const loadingUsers = ref(true)
const instanceName = ref('')
const instanceData = ref<RWServer>()
const users = ref<RWAccount[]>([])
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

const isInitializingInstance = ref(false)
const showDeleteServerModal = ref(false)
const showCreateOrEditServerModal = ref(false)
const loadingError = ref(false)
const fetchServerIntervalId = ref(0)

const connectedClients = computed(() => users.value.filter((x) => x.connected).length)

const { tabs, selectedTab } = useTabs([
  {
    name: 'road-warrior-server',
    label: t('standalone.openvpn_rw.tabs.road_warrior_server')
  },
  {
    name: 'connection-history',
    label: t('standalone.openvpn_rw.tabs.connections_history')
  }
])

async function fetchUsers(setLoading: boolean = true) {
  try {
    if (setLoading) {
      loadingUsers.value = true
    }
    users.value = (
      await ubusCall('ns.ovpnrw', 'list-users', { instance: instanceName.value })
    ).data.users
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_users')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    loadingError.value = true
  } finally {
    if (setLoading) {
      loadingUsers.value = false
    }
  }
}

async function fetchServer(setLoading: boolean = true) {
  try {
    if (setLoading) {
      loading.value = true
    }
    const instances: string[] = (await ubusCall('ns.ovpnrw', 'list-instances')).data.instances
    if (instances.length > 0) {
      instanceName.value = instances[0]
      instanceData.value = (
        await ubusCall('ns.ovpnrw', 'get-configuration', { instance: instanceName.value })
      ).data
      if (instanceData.value?.ns_description) {
        await fetchUsers(setLoading)
      }
    }
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_rw_server')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    loadingError.value = true
  } finally {
    if (setLoading) {
      loading.value = false
    }
  }
}

async function reloadServer() {
  await uciChangesStore.getChanges()
  instanceName.value = ''
  instanceData.value = undefined
  await fetchServer()
}

async function reloadUsers() {
  await uciChangesStore.getChanges()
  await fetchUsers()
}

async function initAndConfigureServer() {
  if (!instanceName.value) {
    isInitializingInstance.value = true
    try {
      await ubusCall('ns.ovpnrw', 'add-instance')
      await reloadServer()
    } catch (err: any) {
      error.value.notificationTitle = t('error.cannot_initialize_server')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
      return
    } finally {
      isInitializingInstance.value = false
    }
  }
  showCreateOrEditServerModal.value = true
}

onMounted(() => {
  fetchServer()

  // periodically reload data
  fetchServerIntervalId.value = setInterval(() => fetchServer(false), RELOAD_INTERVAL)
})

onUnmounted(() => {
  if (fetchServerIntervalId.value) {
    clearInterval(fetchServerIntervalId.value)
  }
})
</script>

<template>
  <div class="flex flex-col justify-between md:flex-row md:items-center">
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.openvpn_rw.title') }}</NeHeading>
    <div
      v-if="selectedTab == 'road-warrior-server'"
      class="mb-6 text-sm text-gray-500 dark:text-gray-400"
    >
      {{ t('common.data_updated_every_seconds', { seconds: RELOAD_INTERVAL / 1000 }) }}
    </div>
  </div>
  <NeInlineNotification
    v-if="error.notificationDescription"
    :title="t('error.cannot_retrieve_databases')"
    :description="error.notificationDescription"
    class="mb-6"
    kind="error"
  >
    <template #details v-if="error.notificationDetails">
      {{ error.notificationDetails }}
    </template></NeInlineNotification
  >
  <NeSkeleton v-if="loading" size="lg" :lines="10" />
  <div class="flex flex-col" v-else-if="!loadingError">
    <div class="flex flex-col gap-y-6">
      <NeTabs
        v-if="instanceData && instanceData.ns_description"
        :selected="selectedTab"
        :srSelectTabLabel="t('ne_tabs.select_a_tab')"
        :srTabsLabel="t('ne_tabs.tabs')"
        :tabs="tabs"
        class="mb-8"
        @selectTab="selectedTab = $event"
      />
    </div>
    <div class="flex flex-col gap-y-6" v-if="selectedTab == 'connection-history'">
      <ConnectionsHistory :instance="instanceName" />
    </div>
    <div class="flex flex-col gap-y-6" v-if="selectedTab == 'road-warrior-server'">
      <NeHeading tag="h5" class="mb-2">{{
        t('standalone.openvpn_rw.roadwarrior_server')
      }}</NeHeading>
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.openvpn_rw.roadwarrior_server_description') }}
      </p>
      <NeEmptyState
        v-if="!instanceData || !instanceData.ns_description"
        :title="t('standalone.openvpn_rw.no_openvpn_rw_server_found')"
        :icon="['fas', 'globe']"
        ><NeButton
          kind="primary"
          @click="initAndConfigureServer()"
          :loading="isInitializingInstance"
          :disabled="isInitializingInstance"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'wrench']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.openvpn_rw.create_server') }}</NeButton
        ></NeEmptyState
      >
      <RWServerDetails
        v-else
        :connected-clients="connectedClients"
        :server="instanceData"
        @delete-server="showDeleteServerModal = true"
        @edit-server="showCreateOrEditServerModal = true"
      />

      <RWAccountsManager
        v-if="instanceData && instanceData.ns_description"
        :users="users"
        :server="instanceData"
        :instance-name="instanceName"
        :is-loading="loadingUsers"
        @update-users="reloadUsers"
      />
    </div>
    <DeleteRWServerModal
      :visible="showDeleteServerModal"
      :instance-name="instanceName"
      @close="showDeleteServerModal = false"
      @server-deleted="reloadServer"
    />
    <CreateOrEditRWServerDrawer
      :item-to-edit="instanceData"
      :instance-name="instanceName"
      :is-shown="showCreateOrEditServerModal"
      @close="showCreateOrEditServerModal = false"
      @add-edit-server="reloadServer"
    />
  </div>
</template>
