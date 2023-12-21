<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeTitle,
  NeEmptyState,
  NeButton,
  getAxiosErrorMessage,
  NeSkeleton,
  NeInlineNotification
} from '@nethserver/vue-tailwind-lib'
import RWAccountsManager from '@/components/standalone/openvpn_rw/RWAccountsManager.vue'
import RWServerDetails from '@/components/standalone/openvpn_rw/RWServerDetails.vue'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { computed } from 'vue'
import DeleteRWServerModal from '@/components/standalone/openvpn_rw/DeleteRWServerModal.vue'
import CreateOrEditRWServerDrawer from '@/components/standalone/openvpn_rw/CreateOrEditRWServerDrawer.vue'
import { useNotificationsStore } from '@/stores/standalone/notifications'

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
  ns_auth_mode: string
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
}

export type RWUser = {
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
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const loading = ref(true)
const instanceName = ref('')
const instanceData = ref<RWServer>()
const users = ref<RWUser[]>([])
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

const isInitializingInstance = ref(false)
const showDeleteServerModal = ref(false)
const showCreateOrEditServerModal = ref(false)
const loadingError = ref(false)

const connectedClients = computed(() => users.value.filter((x) => x.connected).length)

async function fetchUsers() {
  try {
    loading.value = true
    users.value = (
      await ubusCall('ns.ovpnrw', 'list-users', { instance: instanceName.value })
    ).data.users
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_users')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    loadingError.value = true
  } finally {
    loading.value = false
  }
}

async function fetchServer() {
  try {
    loading.value = true
    const instances: string[] = (await ubusCall('ns.ovpnrw', 'list-instances')).data.instances
    if (instances.length > 0) {
      instanceName.value = instances[0]
      instanceData.value = (
        await ubusCall('ns.ovpnrw', 'get-configuration', { instance: instanceName.value })
      ).data
      if (instanceData.value?.ns_description) {
        await fetchUsers()
      }
    }
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_rw_server')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    loadingError.value = true
  } finally {
    loading.value = false
  }
}

async function reloadServer() {
  await uciChangesStore.getChanges()
  instanceName.value = ''
  instanceData.value = undefined
  await fetchServer()
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
})
</script>

<template>
  <NeTitle>{{ t('standalone.openvpn_rw.title') }}</NeTitle>
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
  <NeSkeleton v-if="loading" :lines="20" />
  <div class="flex flex-col gap-y-6" v-else-if="!loadingError">
    <div class="flex flex-col">
      <NeTitle level="h3">{{ t('standalone.openvpn_rw.roadwarrior_server') }}</NeTitle>
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.openvpn_rw.roadwarrior_server_description') }}
      </p>
    </div>
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

    <RWAccountsManager v-if="instanceData && instanceData.ns_description" />
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
    @edit-server="reloadServer"
    @add-server="
      () => {
        notificationsStore.addNotification({
          id: 'add-rw-server',
          kind: 'success',
          title: t('standalone.openvpn_rw.server_configured'),
          description: t('standalone.openvpn_rw.roadwarrior_server_configured_successfully')
        })
        reloadServer()
      }
    "
  />
</template>
