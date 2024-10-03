<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeInlineNotification,
  NeSkeleton,
  NeEmptyState,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ref } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { onMounted } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import DeleteAddressModal from './DeleteAddressModal.vue'
import CreateOrEditAddressDrawer from './CreateOrEditAddressDrawer.vue'
import { useNotificationsStore } from '@/stores/notifications'
import type { BanIpLocalAddress } from '@/views/standalone/security/ThreatShieldView.vue'
import AddressTable from './AddressTable.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const fetchError = ref(false)
const localBlocklist = ref<BanIpLocalAddress[]>([])
const selectedAddress = ref<BanIpLocalAddress>()
const loading = ref(false)
const showDeleteAddressModal = ref(false)
const showCreateOrEditAddressDrawer = ref(false)

function openCreateEditAddressDrawer(itemToEdit?: BanIpLocalAddress) {
  selectedAddress.value = itemToEdit
  showCreateOrEditAddressDrawer.value = true
}

function openDeleteAddressModal(itemToDelete: BanIpLocalAddress) {
  selectedAddress.value = itemToDelete
  showDeleteAddressModal.value = true
}

async function fetchLocalBlocklist() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  fetchError.value = false

  try {
    loading.value = true
    localBlocklist.value = (await ubusCall('ns.threatshield', 'list-blocked')).data.data
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

async function refreshLocalBlocklist() {
  await uciChangesStore.getChanges()
  fetchLocalBlocklist()
}

onMounted(() => {
  fetchLocalBlocklist()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.threat_shield.local_blocklist_description') }}
      </p>
      <NeButton
        kind="secondary"
        @click="openCreateEditAddressDrawer()"
        v-if="localBlocklist.length > 0"
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
      :title="t('error.cannot_retrieve_local_blocklist')"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" :lines="6" size="lg" />
    <template v-else-if="!fetchError">
      <NeEmptyState
        v-if="localBlocklist.length == 0"
        :title="t('standalone.threat_shield.local_blocklist_is_empty')"
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
      <AddressTable
        v-else
        :addressList="localBlocklist"
        addressKind="block"
        @delete="openDeleteAddressModal"
        @edit="openCreateEditAddressDrawer"
      />
    </template>
  </div>
  <DeleteAddressModal
    :visible="showDeleteAddressModal"
    :item-to-delete="selectedAddress"
    addressKind="block"
    @address-deleted="
      () => {
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield.address_deleted')
        })
        refreshLocalBlocklist()
      }
    "
    @close="showDeleteAddressModal = false"
  />
  <CreateOrEditAddressDrawer
    :is-shown="showCreateOrEditAddressDrawer"
    :item-to-edit="selectedAddress"
    addressKind="block"
    @close="showCreateOrEditAddressDrawer = false"
    @add-address="
      () => {
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield.address_added')
        })
        refreshLocalBlocklist()
      }
    "
    @edit-address="
      () => {
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield.address_edited')
        })
        refreshLocalBlocklist()
      }
    "
  />
</template>
