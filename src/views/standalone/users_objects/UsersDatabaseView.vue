<script setup lang="ts">
import { useTabs } from '@/composables/useTabs'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeHeading,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  getAxiosErrorMessage,
  NeTabs,
  NeTooltip
} from '@nethesis/vue-components'
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UsersDatabaseManager from '@/components/standalone/users_database/UsersDatabaseManager.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import CreateOrEditDatabaseDrawer from '@/components/standalone/users_database/CreateOrEditDatabaseDrawer.vue'
import { useNotificationsStore } from '@/stores/notifications'

export type UserDatabase = {
  name: string
  type: string
  description: string
  schema?: string
  uri?: string
  used?: Array<string>
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const loading = ref({
  listDatabases: true,
  getSubscriptionInfo: true
})
const databases = ref<UserDatabase[]>([])
const error = ref({
  listDatabases: '',
  listDatabasesDetails: '',
  getSubscriptionInfo: '',
  getSubscriptionInfoDetails: ''
})
const showCreateDrawer = ref(false)
const activeSubscription = ref(false)

const { tabs, selectedTab } = useTabs([])

async function fetchDatabases(resetSelectedTab: boolean = false) {
  try {
    loading.value.listDatabases = true
    if (resetSelectedTab) {
      selectedTab.value = ''
    }
    databases.value = (await ubusCall('ns.users', 'list-databases')).data.databases
    tabs.value = databases.value.map((db) => ({
      name: db.name,
      label: db.type === 'local' ? t('standalone.users_database.local_database') : db.name
    }))
    if (!selectedTab.value) {
      selectedTab.value = tabs.value[0].name
    }
  } catch (err: any) {
    error.value.listDatabases = t(getAxiosErrorMessage(err))
    error.value.listDatabasesDetails = err.toString()
  } finally {
    loading.value.listDatabases = false
  }
}

async function reloadDatabases(resetSelectedTab: boolean = false) {
  await uciChangesStore.getChanges()
  await fetchDatabases(resetSelectedTab)
}

onMounted(() => {
  fetchDatabases()
  fetchSubscriptionInfo()
})

async function fetchSubscriptionInfo() {
  loading.value.getSubscriptionInfo = true

  try {
    const res = await ubusCall('ns.subscription', 'info')

    activeSubscription.value = (res.data?.systemd_id && res.data?.active) || false
  } catch (err: any) {
    error.value.getSubscriptionInfo = t(getAxiosErrorMessage(err))
    error.value.getSubscriptionInfoDetails = err.toString()
  } finally {
    loading.value.getSubscriptionInfo = false
  }
}
</script>

<template>
  <div class="mb-6 flex flex-row items-center justify-between">
    <NeHeading tag="h3">{{ t('standalone.users_database.title') }}</NeHeading>
    <!-- add remote database button (subscription only) -->
    <NeButton v-if="activeSubscription" kind="secondary" @click="showCreateDrawer = true"
      ><template #prefix>
        <font-awesome-icon
          :icon="['fas', 'circle-plus']"
          class="h-4 w-4"
          aria-hidden="true"
        /> </template
      >{{ t('standalone.users_database.add_remote_database') }}</NeButton
    >
    <!-- disabled add remote database button for community -->
    <NeTooltip v-else triggerEvent="mouseenter focus" placement="bottom">
      <template #trigger>
        <NeButton kind="secondary" disabled>
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.users_database.add_remote_database') }}
        </NeButton>
      </template>
      <template #content>
        {{ t('standalone.users_database.add_remote_database_tooltip') }}
      </template>
    </NeTooltip>
  </div>
  <!-- list databases error -->
  <NeInlineNotification
    v-if="error.listDatabases"
    :title="t('error.cannot_retrieve_databases')"
    :description="error.listDatabases"
    class="mb-6"
    kind="error"
  >
    <template #details v-if="error.listDatabasesDetails">
      {{ error.listDatabasesDetails }}
    </template></NeInlineNotification
  >
  <!-- get subscription info error -->
  <NeInlineNotification
    v-if="error.getSubscriptionInfo"
    :title="t('error.cannot_retrieve_subscription_info')"
    :description="error.getSubscriptionInfo"
    class="mb-6"
    kind="error"
  >
    <template #details v-if="error.listDatabasesDetails">
      {{ error.listDatabasesDetails }}
    </template></NeInlineNotification
  >
  <NeSkeleton v-if="loading.listDatabases || loading.getSubscriptionInfo" :lines="10" size="lg" />
  <div v-else-if="!error.listDatabases && !error.getSubscriptionInfo">
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <UsersDatabaseManager
      :database="(databases.find(x => x.name === selectedTab) as UserDatabase)"
      @database-changed="reloadDatabases()"
      @database-deleted="reloadDatabases(true)"
    />
  </div>
  <CreateOrEditDatabaseDrawer
    :is-shown="showCreateDrawer"
    @close="showCreateDrawer = false"
    @add-edit-database="
      (name) => {
        notificationsStore.addNotification({
          id: `add_db_${name}`,
          kind: 'success',
          title: t('standalone.users_database.remote_database_added'),
          description: t('standalone.users_database.remote_database_added_description', {
            name: name
          })
        })
        reloadDatabases()
      }
    "
  />
</template>
