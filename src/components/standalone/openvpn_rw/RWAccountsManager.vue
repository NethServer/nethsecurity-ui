<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { RWServer, RWAccount } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import {
  NeHeading,
  NeInlineNotification,
  NeEmptyState,
  NeButton,
  NeSkeleton,
  type FilterOption,
  NeTextInput,
  getAxiosErrorMessage,
  NeDropdownFilter
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { computed } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RWAccountsTable from './RWAccountsTable.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import DeleteRWAccountModal from './DeleteRWAccountModal.vue'
import CreateOrEditRWAccountDrawer from './CreateOrEditRWAccountDrawer.vue'
import RenewCertificateDrawer from './RenewCertificateDrawer.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { downloadFile, deleteFile } from '@/lib/standalone/fileUpload'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

type ConnectionFilter = 'all' | 'connected' | 'not_connected'
type ExpirationFilter = 'all' | 'expired' | 'not_expired'

const props = defineProps<{
  users: RWAccount[]
  server: RWServer
  instanceName: string
  isLoading: boolean
}>()
const emit = defineEmits(['update-users'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const textFilter = ref('')
const connectionFilter = ref<ConnectionFilter[]>(['all'])
const expirationFilter = ref<ExpirationFilter[]>(['all'])
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const selectedAccount = ref<RWAccount>()
const showDeleteAccountModal = ref(false)
const showCreateOrEditAccountDrawer = ref(false)
const showRenewCertificateDrawer = ref(false)
const showConfirmDisableModal = ref(false)

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

async function handleToggleAccountEnableRequest(account: RWAccount) {
  if (account.connected && account.openvpn_enabled == '1') {
    selectedAccount.value = account
    showConfirmDisableModal.value = true
  } else {
    await toggleAccountEnable(account)
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

async function downloadAllConfigurations() {
  cleanError()
  try {
    let res = await ubusCall('ns.ovpnrw', 'download_all_user_configurations', {
      instance: props.instanceName
    })
    if (res?.data?.archive_path) {
      //remove prefix /var/run/ns-api-server/downloads/
      res.data.archive_path = res.data.archive_path.replace('/var/run/ns-api-server/downloads/', '')
      const file = await downloadFile(res.data.archive_path)
      const fileURL = URL.createObjectURL(file)
      let link = document.createElement('a')
      link.href = fileURL
      link.download =
        res.data.archive_path.replace('.tar.gz', '') + '-' + Date.now().toString() + '.tar.gz'
      link.click()

      await deleteFile(res.data.archive_path)
    }
  } catch (exception: any) {
    error.value.notificationTitle = t('standalone.openvpn_rw.cannot_download_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(exception))
    error.value.notificationDetails = exception.toString()
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

const connectionFilterOptions = ref<FilterOption[]>([
  {
    id: 'all',
    label: t('common.any')
  },
  {
    id: 'connected',
    label: t('standalone.openvpn_rw.connected')
  },
  {
    id: 'not_connected',
    label: t('standalone.openvpn_rw.not_connected')
  }
])

const expirationFilterOptions = ref<FilterOption[]>([
  {
    id: 'all',
    label: t('common.any')
  },
  {
    id: 'expired',
    label: t('standalone.openvpn_rw.expired')
  },
  {
    id: 'not_expired',
    label: t('standalone.openvpn_rw.not_expired')
  }
])

const filteredUsers = computed(() => {
  return props.users.filter((user) => {
    let result = true
    if (textFilter.value) {
      result = user.name.includes(textFilter.value)
    }

    if (connectionFilter.value[0] === 'connected') {
      result = result && user.connected
    } else if (connectionFilter.value[0] === 'not_connected') {
      result = result && !user.connected
    }

    if (expirationFilter.value[0] === 'expired') {
      result = result && user.expired
    } else if (expirationFilter.value[0] === 'not_expired') {
      result = result && !user.expired
    }

    return result
  })
})

function clearFilters() {
  textFilter.value = ''
  connectionFilter.value = ['all']
  expirationFilter.value = ['all']
}
</script>

<template>
  <div class="flex flex-col">
    <NeHeading tag="h5" class="mb-2">{{
      t('standalone.openvpn_rw.roadwarrior_accounts')
    }}</NeHeading>
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
    <div
      class="flex flex-col-reverse items-start justify-between gap-8 xl:flex-row xl:items-center"
    >
      <div class="flex flex-row gap-x-3">
        <NeTextInput v-model="textFilter" :placeholder="t('common.filter')" />
        <NeDropdownFilter
          v-model="expirationFilter"
          kind="radio"
          :label="t('standalone.openvpn_rw.expiration')"
          :options="expirationFilterOptions"
          :clearFilterLabel="t('ne_dropdown_filter.clear_filter')"
          :openMenuAriaLabel="t('ne_dropdown_filter.open_filter')"
        />
        <NeDropdownFilter
          v-model="connectionFilter"
          kind="radio"
          :label="t('standalone.openvpn_rw.connection')"
          :options="connectionFilterOptions"
          :clearFilterLabel="t('ne_dropdown_filter.clear_filter')"
          :openMenuAriaLabel="t('ne_dropdown_filter.open_filter')"
        />
        <NeButton kind="tertiary" @click="clearFilters">
          {{ t('common.clear_filters') }}
        </NeButton>
      </div>
      <div class="flex flex-row gap-x-3">
        <NeButton kind="tertiary" @click="downloadAllConfigurations()">
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'fa-circle-arrow-down']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('standalone.openvpn_rw.download_all_configs') }}
        </NeButton>
        <NeButton kind="secondary" @click="openCreateEditDrawer()">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.openvpn_rw.add_vpn_account') }}
        </NeButton>
      </div>
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
      @enable-disable="handleToggleAccountEnableRequest"
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
  <!-- confirm account disable modal -->
  <NeModal
    :visible="showConfirmDisableModal"
    kind="warning"
    :title="t('standalone.openvpn_rw.disable_account')"
    :primaryLabel="t('common.disable')"
    primary-button-kind="danger"
    @primaryClick="() => {
      showConfirmDisableModal = false
      toggleAccountEnable(selectedAccount as RWAccount)
    }"
    :close-aria-label="t('common.close')"
    @close="showConfirmDisableModal = false"
  >
    {{ t('standalone.openvpn_rw.disable_account_message') }}
  </NeModal>
</template>
