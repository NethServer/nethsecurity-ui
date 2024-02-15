<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeButton, NeInlineNotification, NeSkeleton } from '@nethesis/vue-components'
import { NeEmptyState, getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { onMounted } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import AllowlistTable from './AllowlistTable.vue'
import DeleteAddressModal from './DeleteAddressModal.vue'
import CreateOrEditAddressDrawer from './CreateOrEditAddressDrawer.vue'
import { useNotificationsStore } from '@/stores/standalone/notifications'

export type AllowlistAddress = {
  address: string
  description: string
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const fetchError = ref(false)
const allowlist = ref<AllowlistAddress[]>([])
const selectedAddress = ref<AllowlistAddress>()
const loading = ref(false)
const showDeleteAddressModal = ref(false)
const showCreateOrEditAddressDrawer = ref(false)

function openCreateEditAddressDrawer(itemToEdit?: AllowlistAddress) {
  selectedAddress.value = itemToEdit
  showCreateOrEditAddressDrawer.value = true
}

function openDeleteAddressModal(itemToDelete: AllowlistAddress) {
  selectedAddress.value = itemToDelete
  showDeleteAddressModal.value = true
}

async function fetchAllowlist() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''

  try {
    loading.value = true
    allowlist.value = (await ubusCall('ns.threatshield', 'list-allowed')).data.data
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

async function refreshAllowlist() {
  await uciChangesStore.getChanges()
  fetchAllowlist()
}

onMounted(() => {
  fetchAllowlist()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.threat_shield.allowlist_description') }}
      </p>
      <NeButton kind="secondary" @click="openCreateEditAddressDrawer()" v-if="allowlist.length > 0"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'circle-plus']"
            class="h-4 w-4"
            aria-hidden="true"
          /> </template
        >{{ t('standalone.threat_shield.add_address') }}</NeButton
      >
    </div>
    <NeInlineNotification
      v-if="error.notificationDescription"
      :title="t('error.cannot_retrieve_allowlist')"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" :lines="10" />
    <template v-else-if="!fetchError">
      <NeEmptyState
        v-if="allowlist.length == 0"
        :title="t('standalone.threat_shield.allowlist_is_empty')"
        :icon="['fas', 'shield']"
        ><NeButton kind="secondary" @click="openCreateEditAddressDrawer()"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'circle-plus']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.threat_shield.add_address') }}</NeButton
        ></NeEmptyState
      >
      <AllowlistTable
        :allowlist="allowlist"
        v-else
        @delete="openDeleteAddressModal"
        @edit="openCreateEditAddressDrawer"
      />
    </template>
  </div>
  <DeleteAddressModal
    :visible="showDeleteAddressModal"
    :item-to-delete="selectedAddress"
    @address-deleted="
      () => {
        notificationsStore.addNotification({
          id: 'delete_address',
          kind: 'success',
          title: t('standalone.threat_shield.address_deleted')
        })
        refreshAllowlist()
      }
    "
    @close="showDeleteAddressModal = false"
  />
  <CreateOrEditAddressDrawer
    :is-shown="showCreateOrEditAddressDrawer"
    :item-to-edit="selectedAddress"
    @close="showCreateOrEditAddressDrawer = false"
    @add-address="
      () => {
        notificationsStore.addNotification({
          id: 'add_address',
          kind: 'success',
          title: t('standalone.threat_shield.address_added')
        })
        refreshAllowlist()
      }
    "
    @edit-address="
      () => {
        notificationsStore.addNotification({
          id: 'edit_address',
          kind: 'success',
          title: t('standalone.threat_shield.address_edited')
        })
        refreshAllowlist()
      }
    "
  />
</template>
