<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeTextInput,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { computed } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'
import DnsRecordsTable from './DnsRecordsTable.vue'
import DeleteDnsRecordModal from './DeleteDnsRecordModal.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import CreateOrEditDnsRecordDrawer from './CreateOrEditDnsRecordDrawer.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

export type DnsRecord = {
  record: string
  ip: string
  name: string
  description: string
  wildcard: boolean
}

const loading = ref(true)
const error = ref({
  notificationTitle: '',
  notificationDescription: ''
})
const dnsRecords = ref<DnsRecord[]>([])
const filter = ref('')
const showCreateEditDrawer = ref(false)
const showDeleteModal = ref(false)
const selectedItem = ref<DnsRecord | null>(null)

const filteredDnsRecords = computed<DnsRecord[]>(() => {
  return filter.value === ''
    ? dnsRecords.value
    : dnsRecords.value.filter(
        (dnsRecord) =>
          dnsRecord.record.includes(filter.value) ||
          dnsRecord.ip.includes(filter.value) ||
          dnsRecord.name.includes(filter.value) ||
          dnsRecord.description.includes(filter.value)
      )
})

async function fetchDnsRecords() {
  try {
    loading.value = true
    const dnsRecordsResponse = await ubusCall('ns.dns', 'list-records')
    dnsRecords.value = dnsRecordsResponse.data.records
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_dns_records')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
}

function openCreateEditDrawer(itemToEdit: DnsRecord | null) {
  selectedItem.value = itemToEdit
  showCreateEditDrawer.value = true
}

function closeCreateEditDrawer() {
  selectedItem.value = null
  showCreateEditDrawer.value = false
}

function openDeleteModal(itemToDelete: DnsRecord) {
  selectedItem.value = itemToDelete
  showDeleteModal.value = true
}

function closeDeleteModal() {
  selectedItem.value = null
  showDeleteModal.value = false
}

async function reloadDnsRecords() {
  await fetchDnsRecords()
  await uciChangesStore.getChanges()
}

onMounted(() => {
  fetchDnsRecords()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <div class="flex flex-row items-center justify-between">
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.dns_dhcp.dns_records_description') }}
      </p>
      <div>
        <NeButton kind="secondary" @click="openCreateEditDrawer(null)">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'circle-plus']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.dns_dhcp.add_dns_record') }}
        </NeButton>
      </div>
    </div>
    <NeTextInput class="max-w-xs" :placeholder="t('standalone.dns_dhcp.filter')" v-model="filter" />
    <NeInlineNotification
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      v-if="error.notificationDescription"
    />
    <NeSkeleton v-if="loading" :lines="10" />
    <DnsRecordsTable
      :dns-records="filteredDnsRecords"
      v-else
      @record-delete="openDeleteModal"
      @record-edit="openCreateEditDrawer"
    />
  </div>
  <CreateOrEditDnsRecordDrawer
    :is-shown="showCreateEditDrawer"
    :initial-item="selectedItem"
    @close="closeCreateEditDrawer()"
    @add-edit-record="reloadDnsRecords()"
  />
  <DeleteDnsRecordModal
    :visible="showDeleteModal"
    @close="closeDeleteModal()"
    @record-deleted="reloadDnsRecords()"
    :item-to-delete="selectedItem"
  />
</template>
