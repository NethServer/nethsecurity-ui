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

const { t } = useI18n()

const loading = ref(false)
const users = ref<User[]>([])
const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})

async function fetchUsers() {
  try {
    loading.value = true
    users.value = (
      await ubusCall('ns.users', 'list-users', { database: props.database.id })
    ).data.users
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value = false
  }
}

function refreshData() {
  if (props.database.initialized) {
    fetchUsers()
  } else {
    users.value = []
  }
}

watch(
  () => props.database,
  () => {
    refreshData()
  }
)

onMounted(() => {
  refreshData()
})
</script>

<template>
  <NeSkeleton v-if="loading" :lines="15" />
  <div v-else class="flex flex-col gap-y-6">
    <div>
      <NeTitle level="h3">{{ t('standalone.users_database.database_configuration') }}</NeTitle>
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.users_database.database_configuration_description') }}
      </p>
    </div>

    <!-- Database Card -->
    <div
      class="flex max-w-2xl flex-row items-center justify-between rounded-md border-l-4 border-indigo-400 p-5 text-gray-700 dark:border-indigo-500 dark:bg-gray-800 dark:text-gray-200 sm:rounded-lg sm:shadow"
      v-if="database.initialized"
    >
      <div class="flex flex-row items-center">
        <font-awesome-icon
          :icon="['fas', 'database']"
          aria-hidden="true"
          :class="`mb-2 h-4 w-4 rounded-full bg-gray-900 p-2 text-gray-300 dark:bg-gray-50 dark:text-gray-600 md:mb-0 md:mr-5`"
        />
        <p>
          {{
            database.type === 'local' ? t('standalone.users_database.local_database') : database.id
          }}
        </p>
      </div>
      <NeDropdown
        :items="[
          {
            id: 'delete',
            label: t('common.delete'),
            iconStyle: 'fas',
            icon: 'trash',
            danger: true,
            action: () => {
              console.log('delete')
            }
          }
        ]"
        :align-to-right="true"
      />
    </div>
    <NeEmptyState
      v-else
      :title="t('standalone.users_database.no_database_found')"
      :icon="['fas', 'database']"
      ><NeButton kind="primary"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'wrench']"
            class="h-4 w-4"
            aria-hidden="true"
          /> </template
        >{{ t('standalone.users_database.configure_database') }}</NeButton
      ></NeEmptyState
    >

    <template v-if="database.initialized">
      <div>
        <NeTitle level="h3">{{ t('standalone.users_database.users') }}</NeTitle>
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.users_database.users_description') }}
        </p>
      </div>
      <NeEmptyState
        v-if="users.length == 0"
        :title="t('standalone.users_database.no_users_found')"
        :icon="['fas', 'user-group']"
        ><NeButton kind="secondary"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.users_database.add_user') }}</NeButton
        ></NeEmptyState
      >
    </template>
  </div>
</template>
