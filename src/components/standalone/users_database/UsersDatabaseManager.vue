<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import type { UserDatabase } from '@/views/standalone/users_objects/UsersDatabaseView.vue'
import {
  NeDropdown,
  NeHeading,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  NeEmptyState,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { onMounted } from 'vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CreateOrEditDatabaseDrawer from './CreateOrEditDatabaseDrawer.vue'
import DeleteDatabaseModal from './DeleteDatabaseModal.vue'
import UsersTable from './UsersTable.vue'
import DeleteUserModal from './DeleteUserModal.vue'
import CreateOrEditUserDrawer from './CreateOrEditUserDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { CanceledError } from 'axios'
import { onUnmounted } from 'vue'

export type User = {
  local: boolean
  database: string
  name: string
  description: string
  id: string
  password?: string
  openpvn_ipaddr?: string
  openvpn_enabled?: string
  admin: boolean
}

const props = defineProps<{
  database: UserDatabase
}>()

const emit = defineEmits(['database-changed', 'database-deleted'])

const { t } = useI18n()

const uciChangesStore = useUciPendingChangesStore()

const isLoadingUsers = ref(false)
const users = ref<User[]>([])
const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const showEditDatabaseDrawer = ref(false)
const showDeleteDatabaseModal = ref(false)
const showCreateOrEditUserDrawer = ref(false)
const showDeleteUserModal = ref(false)
const selectedUser = ref<User>()
const usersRequestAbortController = ref<AbortController>(new AbortController())

function openCreateEditUserDrawer(itemToEdit?: User) {
  selectedUser.value = itemToEdit
  showCreateOrEditUserDrawer.value = true
}

function openDeleteUserModal(itemToDelete: User) {
  selectedUser.value = itemToDelete
  showDeleteUserModal.value = true
}
async function setAdmin(item: User) {
  await ubusCall('ns.users', 'set-admin', { name: item.name, database: 'main' })
  refreshUsers()
}
async function removeAdmin(item: User) {
  await ubusCall('ns.users', 'remove-admin', { name: item.name, database: 'main' })
  refreshUsers()
}

async function fetchUsers() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  try {
    isLoadingUsers.value = true
    users.value = (
      await ubusCall(
        'ns.users',
        'list-users',
        { database: props.database.name },
        { signal: usersRequestAbortController.value.signal }
      )
    ).data.users
  } catch (err: any) {
    if (!(err instanceof CanceledError)) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } finally {
    isLoadingUsers.value = false
  }
}

async function refreshUsers() {
  await uciChangesStore.getChanges()
  fetchUsers()
}

watch(
  () => props.database,
  () => {
    usersRequestAbortController.value.abort()
    usersRequestAbortController.value = new AbortController()
    fetchUsers()
  }
)

onUnmounted(() => {
  usersRequestAbortController.value.abort()
})

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div>
      <NeHeading tag="h5" class="mb-2">{{
        t('standalone.users_database.database_configuration')
      }}</NeHeading>
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.users_database.database_configuration_description') }}
      </p>
    </div>

    <!-- Database Card -->
    <div
      class="flex max-w-2xl flex-row items-center justify-between rounded-md border-l-4 border-indigo-400 p-5 text-gray-700 dark:border-indigo-500 dark:bg-gray-800 dark:text-gray-200 sm:rounded-lg sm:shadow"
    >
      <div class="flex flex-row items-center">
        <font-awesome-icon
          :icon="['fas', 'database']"
          aria-hidden="true"
          :class="`mr-5 h-4 w-4 rounded-full bg-gray-900 p-2 text-gray-300 dark:bg-gray-50 dark:text-gray-600`"
        />
        <div>
          <p>
            {{
              database.type === 'local'
                ? t('standalone.users_database.local_database')
                : database.name
            }}
          </p>
          <p v-if="database.type === 'ldap' && database.schema === 'rfc2307'" class="text-sm">
            {{ t('standalone.users_database.remote_ldap') }}
          </p>
          <p v-else-if="database.type === 'ldap' && database.schema === 'ad'" class="text-sm">
            {{ t('standalone.users_database.remote_active_directory') }}
          </p>
        </div>
        <p
          v-if="database.type === 'ldap'"
          class="ml-4 border-l border-gray-800 py-3 pl-4 dark:border-gray-600 md:ml-8 md:pl-8"
        >
          <strong class="text-sm">URI:</strong><span class="ml-2 text-sm">{{ database.uri }}</span>
        </p>
      </div>
      <div class="flex flex-row items-center">
        <NeButton
          kind="tertiary"
          @click="showEditDatabaseDrawer = true"
          class="mr-2"
          v-if="database.type === 'ldap'"
        >
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'pen-to-square']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('common.edit') }}
        </NeButton>
        <NeDropdown
          v-if="database.type === 'ldap'"
          :items="[
            {
              id: 'delete',
              label: t('common.delete'),
              iconStyle: 'fas',
              icon: 'trash',
              danger: true,
              action: () => {
                showDeleteDatabaseModal = true
              }
            }
          ]"
          :align-to-right="true"
        />
      </div>
    </div>

    <div class="flex flex-row items-center justify-between">
      <div>
        <NeHeading tag="h5" class="mb-2">{{ t('standalone.users_database.users') }}</NeHeading>
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.users_database.users_description') }}
        </p>
      </div>
      <NeButton
        kind="secondary"
        v-if="database.type === 'local' && users.length > 0"
        @click="openCreateEditUserDrawer()"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'circle-plus']"
            class="h-4 w-4"
            aria-hidden="true"
          /> </template
        >{{ t('standalone.users_database.add_user') }}</NeButton
      >
    </div>
    <NeInlineNotification
      v-if="error.notificationDescription"
      :title="t('error.cannot_retrieve_users')"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="isLoadingUsers" :lines="10" />
    <template v-else-if="!error.notificationDescription">
      <NeEmptyState
        v-if="users.length == 0"
        :title="t('standalone.users_database.no_users_found')"
        :icon="['fas', 'user-group']"
        :class="[database.type == 'local' ? '' : 'pb-3']"
        ><NeButton
          kind="secondary"
          v-if="database.type === 'local'"
          @click="openCreateEditUserDrawer()"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.users_database.add_user') }}</NeButton
        ></NeEmptyState
      >
      <UsersTable
        v-else
        :is-ldap-database="database.type === 'ldap'"
        :users="users"
        @delete="openDeleteUserModal"
        @edit="openCreateEditUserDrawer"
        @setAdmin="setAdmin"
        @removeAdmin="removeAdmin"
      />
    </template>
  </div>
  <CreateOrEditDatabaseDrawer
    :item-to-edit="database"
    :is-shown="showEditDatabaseDrawer"
    @close="showEditDatabaseDrawer = false"
    @add-edit-database="emit('database-changed')"
  />
  <CreateOrEditUserDrawer
    :item-to-edit="selectedUser"
    :is-shown="showCreateOrEditUserDrawer"
    @close="showCreateOrEditUserDrawer = false"
    @add-edit-user="refreshUsers"
  />
  <DeleteDatabaseModal
    :visible="showDeleteDatabaseModal"
    :item-to-delete="database"
    @close="showDeleteDatabaseModal = false"
    @database-deleted="emit('database-deleted')"
  />
  <DeleteUserModal
    :visible="showDeleteUserModal"
    :item-to-delete="selectedUser"
    @close="showDeleteUserModal = false"
    @user-deleted="refreshUsers"
  />
</template>
