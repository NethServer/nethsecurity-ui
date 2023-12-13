<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import type { UserDatabase } from '@/views/standalone/vpn/UsersDatabaseView.vue'
import {
  NeDropdown,
  NeTitle,
  NeButton,
  NeEmptyState,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CreateOrEditDatabaseDrawer from './CreateOrEditDatabaseDrawer.vue'
import DeleteDatabaseModal from './DeleteDatabaseModal.vue'
import UsersTable from './UsersTable.vue'
import DeleteUserModal from './DeleteUserModal.vue'
import CreateOrEditUserDrawer from './CreateOrEditUserDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

export type User = {
  local: boolean
  database: string
  name: string
  description: string
  id: string
  password?: string
  openpvn_ipaddr?: string
  openvpn_enabled?: string
}

const props = defineProps<{
  database: UserDatabase
}>()

const emit = defineEmits(['database-changed'])

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
const selectedUser = ref<User | null>(null)

function openCreateEditUserDrawer(itemToEdit: User | null) {
  selectedUser.value = itemToEdit
  showCreateOrEditUserDrawer.value = true
}

function openDeleteUserModal(itemToDelete: User) {
  selectedUser.value = itemToDelete
  showDeleteUserModal.value = true
}

async function fetchUsers() {
  try {
    isLoadingUsers.value = true
    users.value = (
      await ubusCall('ns.users', 'list-users', { database: props.database.name })
    ).data.users
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
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
    fetchUsers()
  }
)

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div>
      <NeTitle level="h3">{{ t('standalone.users_database.database_configuration') }}</NeTitle>
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
          :class="`mb-2 h-4 w-4 rounded-full bg-gray-900 p-2 text-gray-300 dark:bg-gray-50 dark:text-gray-600 md:mb-0 md:mr-5`"
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
          class="ml-8 border-l border-gray-800 py-3 pl-8 dark:border-gray-600"
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
        <NeTitle level="h3">{{ t('standalone.users_database.users') }}</NeTitle>
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.users_database.users_description') }}
        </p>
      </div>
      <NeButton
        kind="secondary"
        v-if="database.type === 'local' && users.length > 0"
        @click="openCreateEditUserDrawer(null)"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'circle-plus']"
            class="h-4 w-4"
            aria-hidden="true"
          /> </template
        >{{ t('standalone.users_database.add_user') }}</NeButton
      >
    </div>
    <NeSkeleton v-if="isLoadingUsers" :lines="10" />
    <template v-else>
      <NeEmptyState
        v-if="users.length == 0"
        :title="t('standalone.users_database.no_users_found')"
        :icon="['fas', 'user-group']"
        :class="[database.type == 'local' ? '' : 'pb-3']"
        ><NeButton
          kind="secondary"
          v-if="database.type === 'local'"
          @click="openCreateEditUserDrawer(null)"
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
    @database-deleted="emit('database-changed')"
  />
  <DeleteUserModal
    :visible="showDeleteUserModal"
    :item-to-delete="selectedUser"
    @close="showDeleteUserModal = false"
    @user-deleted="refreshUsers"
  />
</template>
