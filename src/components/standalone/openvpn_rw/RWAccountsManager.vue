<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { RWServer, RWAccount } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import {
  NeEmptyState,
  NeTitle,
  NeTextInput,
  NeCombobox,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  type NeComboboxOption,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { computed } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RWAccountsTable from './RWAccountsTable.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import DeleteRWAccountModal from './DeleteRWAccountModal.vue'
import CreateOrEditRWAccountDrawer from './CreateOrEditRWAccountDrawer.vue'
import RenewCertificateDrawer from './RenewCertificateDrawer.vue'
import { useNotificationsStore } from '@/stores/standalone/notifications'

const props = defineProps<{
  users: RWAccount[]
  server: RWServer
  instanceName: string
  isLoading: boolean
}>()
const emit = defineEmits(['update-users'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const filter = ref('')
const connectionFilter = ref<'all' | 'connected' | 'not_connected'>('all')
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const selectedAccount = ref<RWAccount>()
const showDeleteAccountModal = ref(false)
const showCreateOrEditAccountDrawer = ref(false)
const showRenewCertificateDrawer = ref(false)

function cleanError() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
}

function openCreateEditDrawer(item?: RWAccount) {
  selectedAccount.value = item
  showCreateOrEditAccountDrawer.value = true
}

function openDeleteModal(item: RWAccount) {
  selectedAccount.value = item
  showDeleteAccountModal.value = true
}

function openRenewCertificateDrawer(item: RWAccount) {
  selectedAccount.value = item
  showRenewCertificateDrawer.value = true
}

function createDownloadableFile(content: string, filename: string) {
  let downloadElement = document.createElement('a')
  downloadElement.setAttribute(
    'href',
    'data:text/json;charset=utf-8,' + encodeURIComponent(content)
  )
  downloadElement.setAttribute('download', filename)
  document.body.appendChild(downloadElement)
  downloadElement.click()
  downloadElement.remove()
}

async function toggleAccountEnable(account: RWAccount) {
  cleanError()
  try {
    await ubusCall('ns.ovpnrw', account.openvpn_enabled === '1' ? 'disable-user' : 'enable-user', {
      username: account.name,
      instance: props.instanceName
    })
    emit('update-users')
  } catch (err: any) {
    error.value.notificationTitle =
      account.openvpn_enabled === '1'
        ? t('standalone.openvpn_rw.cannot_disable_account')
        : t('standalone.openvpn_rw.cannot_enable_account')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function downloadConfiguration(account: RWAccount) {
  cleanError()
  try {
    const configuration = (
      await ubusCall('ns.ovpnrw', 'download-user-configuration', {
        username: account.name,
        instance: props.instanceName
      })
    ).data.data
    createDownloadableFile(configuration, `${account.name}.ovpn`)
  } catch (err: any) {
    error.value.notificationTitle = t('standalone.openvpn_rw.cannot_download_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function downloadCertificate(account: RWAccount) {
  cleanError()
  try {
    const certificate = (
      await ubusCall('ns.ovpnrw', 'download-user-certificate', {
        username: account.name,
        instance: props.instanceName
      })
    ).data.data
    createDownloadableFile(certificate, `${account.name}.crt`)
  } catch (err: any) {
    error.value.notificationTitle = t('standalone.openvpn_rw.cannot_download_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function downloadQrCode(account: RWAccount) {
  cleanError()
  try {
    const certificate = (
      await ubusCall('ns.ovpnrw', 'download-user-2fa', {
        username: account.name,
        instance: props.instanceName
      })
    ).data.data
    createDownloadableFile(certificate, `${account.name}.svg`)
  } catch (err: any) {
    error.value.notificationTitle = t('standalone.openvpn_rw.cannot_download_qr_code')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

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
  <NeSkeleton v-if="isLoading" :lines="8" />
  <template v-else-if="users.length == 0">
    <NeEmptyState :title="t('standalone.openvpn_rw.no_users_found')" :icon="['fas', 'user-group']">
      <NeButton kind="secondary" @click="openCreateEditDrawer()">
        <template #prefix>
          <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
        </template>
        {{ t('standalone.openvpn_rw.add_vpn_account') }}
      </NeButton>
    </NeEmptyState>
  </template>
  <template v-else>
    <div class="flex flex-row items-center justify-between">
      <div class="flex flex-row gap-x-3">
        <NeTextInput v-model="filter" placeholder="Filter" />
        <NeCombobox v-model="connectionFilter" :options="connectionFilterOptions" />
      </div>
      <NeButton kind="secondary" @click="openCreateEditDrawer()" class="ml-2">
        <template #prefix>
          <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
        </template>
        {{ t('standalone.openvpn_rw.add_vpn_account') }}
      </NeButton>
    </div>
    <RWAccountsTable
      v-if="filteredUsers.length > 0"
      :users="filteredUsers"
      :authentication-mode="server.ns_auth_mode"
      @delete="openDeleteModal"
      @edit="openCreateEditDrawer"
      @download-certificate="downloadCertificate"
      @download-configuration="downloadConfiguration"
      @download-qr-code="downloadQrCode"
      @enable-disable="toggleAccountEnable"
      @regenerate-certificate="openRenewCertificateDrawer"
    />
    <NeEmptyState
      v-else
      :title="t('standalone.openvpn_rw.no_users_found')"
      :icon="['fas', 'user-group']"
    />
  </template>
  <DeleteRWAccountModal
    :visible="showDeleteAccountModal"
    :account="selectedAccount"
    :instance-name="instanceName"
    @account-deleted="
      () => {
        notificationsStore.addNotification({
          kind: 'success',
          id: 'delete-account',
          title: t('standalone.openvpn_rw.account_deleted')
        })
        emit('update-users')
      }
    "
    @close="showDeleteAccountModal = false"
  />
  <CreateOrEditRWAccountDrawer
    :is-shown="showCreateOrEditAccountDrawer"
    :instance-data="server"
    :instance-name="instanceName"
    :item-to-edit="selectedAccount"
    @close="showCreateOrEditAccountDrawer = false"
    @add-account="
      () => {
        notificationsStore.addNotification({
          kind: 'success',
          id: 'add-account',
          title: t('standalone.openvpn_rw.account_created')
        })
        emit('update-users')
      }
    "
    @edit-account="
      () => {
        notificationsStore.addNotification({
          kind: 'success',
          id: 'edit-account',
          title: t('standalone.openvpn_rw.account_edited')
        })
        emit('update-users')
      }
    "
  />
  <RenewCertificateDrawer
    :account="selectedAccount"
    :instance-name="instanceName"
    :is-shown="showRenewCertificateDrawer"
    @close="showRenewCertificateDrawer = false"
    @renew-certificate="emit('update-users')"
  />
</template>
