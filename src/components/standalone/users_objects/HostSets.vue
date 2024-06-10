<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import CreateOrEditHostSetDrawer from './CreateOrEditHostSetDrawer.vue'
import HostSetsTable from './HostSetsTable.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import ObjectUsagesModal from './ObjectUsagesModal.vue'
import CannotDeleteObjectModal from './CannotDeleteObjectModal.vue'
import { getHostSetIcon } from '@/lib/standalone/user_objects'

export type HostSet = {
  id: string
  name: string
  family?: IpVersion
  ipaddr: string[]
  singleton: boolean
  subtype: string
  used?: boolean
  matches?: string[]
}

export type IpVersion = 'ipv4' | 'ipv6'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const hostSets = ref<HostSet[]>([])
const currentHostSet = ref<HostSet | undefined>(undefined)
const currentHostSetName = ref('')
const currentUsageIds = ref<string[]>([])
const isShownCreateOrEditHostSetDrawer = ref(false)
const isShownDeleteHostSetModal = ref(false)
const isShownUsagesModal = ref(false)
const isShownCannotDeleteObjectModal = ref(false)
const textFilter = ref('')

const loading = ref({
  listHostSets: false,
  listStaticLeases: false,
  listDnsRecords: false
})

const error = ref({
  listHostSets: '',
  listHostSetsDetails: '',
  listStaticLeases: '',
  listStaticLeasesDetails: '',
  listDnsRecords: '',
  listDnsRecordsDetails: ''
})

const hostSetsComboboxOptions = computed(() => {
  return hostSets.value.map((hostSet) => {
    return {
      id: hostSet.id,
      label: hostSet.name,
      description: t(`standalone.objects.subtype_${hostSet.subtype}`),
      icon: getHostSetIcon(hostSet.subtype)
    }
  })
})

const filteredHostSets = computed(() => {
  if (!textFilter.value) {
    // no filter
    return hostSets.value
  } else {
    // filter units
    return hostSets.value.filter((hostSet) => searchStringInHostSet(hostSet, textFilter.value))
  }
})

onMounted(() => {
  loadData()
})

function loadData() {
  listHosts()
  uciChangesStore.getChanges()
}

function searchStringInHostSet(hostSet: HostSet, queryText: string) {
  const regex = /[^a-zA-Z0-9-]/g
  queryText = queryText.replace(regex, '')
  let found = false

  // search in string attributes
  found = ['name', 'subtype'].some((attrName) => {
    const attrValue = hostSet[attrName as keyof HostSet] as string
    return new RegExp(queryText, 'i').test(attrValue?.replace(regex, ''))
  })

  if (found) {
    return true
  }

  // search in records (ipaddr attribute)
  found = !!hostSet.ipaddr?.some((record) => {
    return new RegExp(queryText, 'i').test(record?.replace(regex, ''))
  })

  if (found) {
    return true
  }
}

async function listHosts() {
  loading.value.listHostSets = true
  hostSets.value = []
  error.value.listHostSets = ''
  error.value.listHostSetsDetails = ''

  try {
    const res = await ubusCall('ns.objects', 'list-hosts')
    hostSets.value = res.data.values as HostSet[]
  } catch (err: any) {
    console.error(err)
    error.value.listHostSets = t(getAxiosErrorMessage(err))
    error.value.listHostSetsDetails = err.toString()
  } finally {
    loading.value.listHostSets = false
  }
}

function showCreateHostSetDrawer() {
  currentHostSet.value = undefined
  isShownCreateOrEditHostSetDrawer.value = true
}

function showEditHostSetDrawer(hostSet: HostSet) {
  currentHostSet.value = hostSet
  isShownCreateOrEditHostSetDrawer.value = true
}

function showDeleteHostSetModal(hostSet: HostSet) {
  currentHostSet.value = hostSet

  if (!hostSet.used) {
    isShownDeleteHostSetModal.value = true
  } else {
    currentUsageIds.value = hostSet.matches || []
    currentHostSetName.value = hostSet.name
    isShownCannotDeleteObjectModal.value = true
  }
}

function showUsagesModal(hostSet: HostSet) {
  currentUsageIds.value = hostSet.matches || []
  currentHostSetName.value = hostSet.name
  isShownUsagesModal.value = true
}
</script>

<template>
  <div class="text-sm">
    <div class="mb-8 flex flex-col items-start justify-between gap-6 xl:flex-row">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('standalone.objects.host_sets_page_description') }}
      </div>
      <NeButton
        v-if="loading.listHostSets || hostSets.length"
        kind="secondary"
        size="lg"
        @click="showCreateHostSetDrawer"
        class="shrink-0"
        :disabled="loading.listHostSets"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
        </template>
        {{ t('standalone.objects.add_host_set') }}
      </NeButton>
    </div>

    <div class="space-y-6">
      <!-- list host sets error notification -->
      <NeInlineNotification
        v-if="error.listHostSets"
        kind="error"
        :title="t('error.cannot_retrieve_host_sets')"
        :description="error.listHostSets"
        class="mb-5"
      >
        <template #details v-if="error.listHostSetsDetails">
          {{ error.listHostSetsDetails }}
        </template>
      </NeInlineNotification>
      <!-- text filter -->
      <div class="flex items-center gap-4">
        <NeTextInput
          :placeholder="t('standalone.objects.filter_host_sets')"
          v-model.trim="textFilter"
          :disabled="loading.listHostSets"
          class="max-w-xs"
        />
        <NeButton
          kind="tertiary"
          @click="textFilter = ''"
          :disabled="loading.listHostSets || !textFilter"
        >
          {{ t('common.clear_filter') }}
        </NeButton>
      </div>
      <!-- empty state -->
      <NeEmptyState
        v-if="!hostSets.length && !loading.listHostSets"
        :title="t('standalone.objects.no_host_sets')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton
          kind="secondary"
          size="lg"
          @click="showCreateHostSetDrawer"
          class="shrink-0"
          :disabled="loading.listHostSets"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('standalone.objects.add_host_set') }}
        </NeButton>
      </NeEmptyState>
      <!-- no host set matching filter -->
      <NeEmptyState
        v-else-if="!filteredHostSets.length && !loading.listHostSets"
        :title="t('standalone.objects.no_hosts_found')"
        :description="t('common.try_changing_search_filter')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton kind="tertiary" @click="textFilter = ''">
          {{ t('common.clear_filter') }}</NeButton
        >
      </NeEmptyState>
      <!-- host sets table -->
      <HostSetsTable
        v-else
        :loading="loading.listHostSets"
        :filteredHostSets="filteredHostSets"
        :allHostSets="hostSets"
        @editHostSet="showEditHostSetDrawer"
        @deleteHostSet="showDeleteHostSetModal"
        @showUsagesHostSet="showUsagesModal"
      />
    </div>
    <!-- create/edit host set -->
    <CreateOrEditHostSetDrawer
      :isShown="isShownCreateOrEditHostSetDrawer"
      :currentHostSet="currentHostSet"
      :allObjects="hostSets"
      :recordOptions="hostSetsComboboxOptions"
      @close="isShownCreateOrEditHostSetDrawer = false"
      @reloadData="loadData"
    />
    <!-- delete host set modal -->
    <DeleteModal
      :visible="isShownDeleteHostSetModal"
      :title="t('standalone.objects.delete_host_set')"
      :deleteButtonLabel="t('standalone.objects.delete_host_set')"
      :errorNotificationTitle="t('error.cannot_delete_host_set')"
      :deleteFunction="
        () =>
          ubusCall('ns.objects', 'delete-host-set', {
            id: currentHostSet?.id.replace('objects/', '')
          })
      "
      @close="isShownDeleteHostSetModal = false"
      @reloadData="loadData"
    >
      {{ t('standalone.objects.confirm_delete_host_set', { name: currentHostSet?.name }) }}
    </DeleteModal>
    <!-- cannot delete modal -->
    <CannotDeleteObjectModal
      :visible="isShownCannotDeleteObjectModal"
      :objectName="currentHostSetName"
      :usageIds="currentUsageIds"
      @close="isShownCannotDeleteObjectModal = false"
    />
    <!-- usages modal -->
    <ObjectUsagesModal
      :visible="isShownUsagesModal"
      :objectName="currentHostSetName"
      :usageIds="currentUsageIds"
      @close="isShownUsagesModal = false"
    />
  </div>
</template>
