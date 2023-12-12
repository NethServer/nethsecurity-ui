<script setup lang="ts">
import { useTabs } from '@/composables/useTabs'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeTitle,
  NeTabs,
  NeButton,
  getAxiosErrorMessage,
  NeSkeleton,
  NeInlineNotification
} from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import UsersDatabaseManager from '@/components/standalone/users_database/UsersDatabaseManager.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import CreateOrEditDatabaseDrawer from '@/components/standalone/users_database/CreateOrEditDatabaseDrawer.vue'

export type UserDatabase = {
  name: string
  type: string
  description: string
  schema?: string
  uri?: string
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const loading = ref(true)
const databases = ref<UserDatabase[]>([])
const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const showCreateDrawer = ref(false)

const { tabs, selectedTab } = useTabs([])

async function fetchDatabases() {
  try {
    loading.value = true
    databases.value = (await ubusCall('ns.users', 'list-databases')).data.databases.map(
      (x: { id: string; type: string; description: string }) => ({
        ...x,
        initialized: true
      })
    )
    tabs.value = databases.value.map((db) => ({
      name: db.name,
      label: db.type === 'local' ? t('standalone.users_database.local_database') : db.name
    }))
    selectedTab.value = tabs.value[0].name
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value = false
  }
}

async function reloadDatabases() {
  await uciChangesStore.getChanges()
  await fetchDatabases()
}

onMounted(() => fetchDatabases())
</script>

<template>
  <div class="mb-6 flex flex-row items-center justify-between">
    <NeTitle class="!mb-0">{{ t('standalone.users_database.title') }}</NeTitle>
    <NeButton kind="secondary" @click="showCreateDrawer = true"
      ><template #prefix>
        <font-awesome-icon
          :icon="['fas', 'circle-plus']"
          class="h-4 w-4"
          aria-hidden="true"
        /> </template
      >{{ t('standalone.users_database.add_database') }}</NeButton
    >
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
  <NeSkeleton v-if="loading" :lines="20" />
  <div v-else-if="!error.notificationDescription">
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
      @database-changed="reloadDatabases"
    />
  </div>
  <CreateOrEditDatabaseDrawer
    :item-to-edit="null"
    :is-shown="showCreateDrawer"
    @close="showCreateDrawer = false"
    @add-edit-database="reloadDatabases"
  />
</template>
