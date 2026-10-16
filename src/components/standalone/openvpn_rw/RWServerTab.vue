<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faGlobe, faWrench, faTrash } from '@fortawesome/free-solid-svg-icons'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useNotificationsStore } from '@/stores/notifications'
import type { RWAccount, RWServer } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import RWServerDetails from './RWServerDetails.vue'
import RWAccountsManager from './RWAccountsManager.vue'
import DeleteRWServerModal from './DeleteRWServerModal.vue'
import CreateOrEditRWServerDrawer from './CreateOrEditRWServerDrawer.vue'
import RenewRWServerCertificateModal from './RenewRWServerCertificateModal.vue'
import RegenerateRWAllCertificatesModal from './RegenerateRWAllCertificatesModal.vue'

const RELOAD_INTERVAL = 10000

const { instance, openConfigureOnMount = false } = defineProps<{
  instance: string
  /** open the configuration drawer of a server just created */
  openConfigureOnMount?: boolean
}>()

const emit = defineEmits<{
  'server-changed': []
  'server-deleted': []
  'configure-opened': []
}>()

const { t } = useI18n()
const queryClient = useQueryClient()
const uciChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const {
  data: server,
  isPending: isPendingServer,
  error: serverError
} = useQuery({
  queryKey: ['ovpnrw', 'server', instance],
  queryFn: () => ubusCall<{ data: RWServer }>('ns.ovpnrw', 'get-configuration', { instance }),
  select: (res) => res.data,
  refetchInterval: RELOAD_INTERVAL
})

const isConfigured = computed(() => Boolean(server.value?.ns_description))

const {
  data: users,
  isPending: isPendingUsers,
  error: usersError
} = useQuery({
  queryKey: ['ovpnrw', 'users', instance],
  queryFn: () =>
    ubusCall<{ data: { users: RWAccount[] } }>('ns.ovpnrw', 'list-users', { instance }),
  select: (res) => res.data.users,
  // an unconfigured server has no users database yet
  enabled: isConfigured,
  refetchInterval: RELOAD_INTERVAL
})

const connectedClients = computed(() => (users.value ?? []).filter((x) => x.connected).length)

const showDeleteServerModal = ref(false)
const showCreateOrEditServerModal = ref(false)
const showRenewServerCertificateModal = ref(false)
const showRegenerateAllCertificatesModal = ref(false)

let configureOpened = false
watch(
  server,
  (newServer) => {
    if (openConfigureOnMount && !configureOpened && newServer && !newServer.ns_description) {
      configureOpened = true
      showCreateOrEditServerModal.value = true
      emit('configure-opened')
    }
  },
  { immediate: true }
)

async function reloadServer() {
  await uciChangesStore.getChanges()
  await queryClient.invalidateQueries({ queryKey: ['ovpnrw', 'server', instance] })
  await queryClient.invalidateQueries({ queryKey: ['ovpnrw', 'users', instance] })
  emit('server-changed')
}

async function reloadUsers() {
  await uciChangesStore.getChanges()
  await queryClient.invalidateQueries({ queryKey: ['ovpnrw', 'users', instance] })
}

async function onServerDeleted() {
  await uciChangesStore.getChanges()
  emit('server-deleted')
}

async function showNotificationAndReload(title: string, description: string) {
  // show toast notification
  setTimeout(() => {
    notificationsStore.createNotification({
      title: title,
      description: description,
      kind: 'success'
    })
  }, 500)
  await reloadServer()
}
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <NeInlineNotification
      v-if="serverError"
      kind="error"
      :title="t('error.cannot_retrieve_rw_server')"
      :description="t(getAxiosErrorMessage(serverError))"
    />
    <NeInlineNotification
      v-if="usersError"
      kind="error"
      :title="t('error.cannot_retrieve_users')"
      :description="t(getAxiosErrorMessage(usersError))"
    />
    <NeSkeleton v-if="isPendingServer" size="lg" :lines="10" />
    <template v-else-if="server">
      <NeEmptyState
        v-if="!isConfigured"
        :title="t('standalone.openvpn_rw.server_not_configured')"
        :description="t('standalone.openvpn_rw.server_not_configured_description')"
        :icon="faGlobe"
      >
        <div class="flex flex-row gap-x-4">
          <NeButton kind="primary" @click="showCreateOrEditServerModal = true">
            <template #prefix>
              <FontAwesomeIcon :icon="faWrench" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('standalone.openvpn_rw.create_server') }}
          </NeButton>
          <NeButton kind="tertiary" @click="showDeleteServerModal = true">
            <template #prefix>
              <FontAwesomeIcon :icon="faTrash" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('common.delete') }}
          </NeButton>
        </div>
      </NeEmptyState>
      <template v-else>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('common.data_updated_every_seconds', { seconds: RELOAD_INTERVAL / 1000 }) }}
        </div>
        <RWServerDetails
          :connected-clients="connectedClients"
          :server="server"
          @delete-server="showDeleteServerModal = true"
          @edit-server="showCreateOrEditServerModal = true"
          @renew-server-certificate="showRenewServerCertificateModal = true"
          @regenerate-all-certificates="showRegenerateAllCertificatesModal = true"
        />
        <RWAccountsManager
          :users="users ?? []"
          :server="server"
          :instance-name="instance"
          :is-loading="isPendingUsers"
          @update-users="reloadUsers"
        />
      </template>
    </template>
    <DeleteRWServerModal
      :visible="showDeleteServerModal"
      :instance-name="instance"
      @close="showDeleteServerModal = false"
      @server-deleted="onServerDeleted"
    />
    <CreateOrEditRWServerDrawer
      :item-to-edit="server"
      :instance-name="instance"
      :is-shown="showCreateOrEditServerModal"
      @close="showCreateOrEditServerModal = false"
      @add-edit-server="reloadServer"
    />
    <RenewRWServerCertificateModal
      :visible="showRenewServerCertificateModal"
      :instance-name="instance"
      @close="showRenewServerCertificateModal = false"
      @server-certificate-renewed="
        showNotificationAndReload(
          t('standalone.openvpn_rw.server_certificate_renewed'),
          t('standalone.openvpn_rw.server_certificate_renewed_message')
        )
      "
    />
    <RegenerateRWAllCertificatesModal
      :visible="showRegenerateAllCertificatesModal"
      :instance-name="instance"
      :server-name="server?.ns_description ?? ''"
      @close="showRegenerateAllCertificatesModal = false"
      @all-certificates-regenerated="
        showNotificationAndReload(
          t('standalone.openvpn_rw.all_certificates_regenerated'),
          t('standalone.openvpn_rw.all_certificates_regenerated_message')
        )
      "
    />
  </div>
</template>
