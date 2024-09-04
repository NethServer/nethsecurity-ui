<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeDropdownFilter,
  NeEmptyState,
  NeInlineNotification,
  NeTextInput,
  type FilterOption
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import CreateOrEditHostSetDrawer from './CreateOrEditHostSetDrawer.vue'
import HostSetsTable from './HostSetsTable.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import ObjectUsagesModal from './ObjectUsagesModal.vue'
import CannotDeleteObjectModal from './CannotDeleteObjectModal.vue'
import { useHostSets, type HostSet } from '@/composables/useHostSets'
import { useObjectStore } from '@/stores/standalone/objects'
import type { IpVersionFilter } from '@/views/standalone/users_objects/ObjectsView.vue'

type ObjectTypeFilter =
  | 'host'
  | 'cidr'
  | 'range'
  | 'dhcp_static_lease'
  | 'dns_record'
  | 'host_set'
  | 'vpn_user'
  | 'domain_set'

const { t } = useI18n()
const {
  hostSets,
  listHostSets,
  loadingListHostSets,
  errorListHostSets,
  errorListHostSetsDetails,
  hostSetsComboboxOptions,
  searchStringInHostSet
} = useHostSets()

const objects = useObjectStore()

const uciChangesStore = useUciPendingChangesStore()
const currentHostSet = ref<HostSet | undefined>(undefined)
const currentHostSetName = ref('')
const currentUsageIds = ref<string[]>([])
const isShownCreateOrEditHostSetDrawer = ref(false)
const isShownDeleteHostSetModal = ref(false)
const isShownUsagesModal = ref(false)
const isShownCannotDeleteObjectModal = ref(false)
const textFilter = ref('')
const objectTypeFilter = ref<ObjectTypeFilter[]>([])
const ipVersionFilter = ref<IpVersionFilter[]>(['any'])

const objectTypeFilterOptions = ref<FilterOption[]>([
  {
    id: 'host',
    label: t('standalone.objects.subtype_host')
  },
  {
    id: 'cidr',
    label: t('standalone.objects.subtype_cidr')
  },
  {
    id: 'range',
    label: t('standalone.objects.subtype_range')
  },
  {
    id: 'dhcp_static_lease',
    label: t('standalone.objects.subtype_dhcp_static_lease')
  },
  {
    id: 'dns_record',
    label: t('standalone.objects.subtype_dns_record')
  },
  {
    id: 'host_set',
    label: t('standalone.objects.subtype_host_set')
  },
  {
    id: 'vpn_user',
    label: t('standalone.objects.subtype_vpn_user')
  },
  {
    id: 'domain_set',
    label: t('standalone.objects.subtype_domain_set')
  }
])

const ipVersionFilterOptions = ref<FilterOption[]>([
  {
    id: 'any',
    label: t('common.any')
  },
  {
    id: 'ipv4',
    label: 'IPv4'
  },
  {
    id: 'ipv6',
    label: 'IPv6'
  }
])

const filteredHostSets = computed(() => {
  return hostSets.value.filter((hostSet) => {
    const matchesTextFilter = !textFilter.value || searchStringInHostSet(hostSet, textFilter.value)
    const matchesObjectTypeFilter =
      !objectTypeFilter.value.length ||
      objectTypeFilter.value.includes(hostSet.subtype as ObjectTypeFilter)
    const matchesIpVersionFilter =
      ipVersionFilter.value[0] == 'any' ||
      ipVersionFilter.value.includes(hostSet.family as IpVersionFilter)
    return matchesTextFilter && matchesObjectTypeFilter && matchesIpVersionFilter
  })
})

onMounted(() => {
  loadData()
})

function loadData() {
  listHostSets()
  objects.load()
  uciChangesStore.getChanges()
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

function clearFilters() {
  textFilter.value = ''
  objectTypeFilter.value = []
  ipVersionFilter.value = ['any']
}
</script>

<template>
  <div class="text-sm">
    <div class="mb-8 flex flex-col items-start justify-between gap-6 xl:flex-row">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('standalone.objects.host_sets_page_description') }}
      </div>
      <NeButton
        v-if="loadingListHostSets || hostSets.length"
        kind="secondary"
        size="lg"
        @click="showCreateHostSetDrawer"
        class="shrink-0"
        :disabled="loadingListHostSets"
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
        v-if="errorListHostSets"
        kind="error"
        :title="t('error.cannot_retrieve_host_sets')"
        :description="errorListHostSets"
        class="mb-5"
      >
        <template #details v-if="errorListHostSetsDetails">
          {{ errorListHostSetsDetails }}
        </template>
      </NeInlineNotification>
      <!-- text filter -->
      <div class="flex items-center gap-4">
        <NeTextInput
          :placeholder="t('standalone.objects.filter_host_sets')"
          v-model.trim="textFilter"
          :disabled="loadingListHostSets"
          class="max-w-xs"
        />
        <NeDropdownFilter
          v-model="objectTypeFilter"
          kind="checkbox"
          :label="t('standalone.objects.type')"
          :options="objectTypeFilterOptions"
          :clearFilterLabel="t('ne_dropdown_filter.clear_filter')"
          :openMenuAriaLabel="t('ne_dropdown_filter.open_filter')"
        />
        <NeDropdownFilter
          v-model="ipVersionFilter"
          kind="radio"
          :label="t('standalone.objects.ip_version')"
          :options="ipVersionFilterOptions"
          :clearFilterLabel="t('ne_dropdown_filter.clear_filter')"
          :openMenuAriaLabel="t('ne_dropdown_filter.open_filter')"
        />
        <NeButton kind="tertiary" @click="clearFilters" :disabled="loadingListHostSets">
          {{ t('common.clear_filters') }}
        </NeButton>
      </div>
      <!-- empty state -->
      <NeEmptyState
        v-if="!hostSets.length && !loadingListHostSets"
        :title="t('standalone.objects.no_host_sets')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton
          kind="secondary"
          size="lg"
          @click="showCreateHostSetDrawer"
          class="shrink-0"
          :disabled="loadingListHostSets"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('standalone.objects.add_host_set') }}
        </NeButton>
      </NeEmptyState>
      <!-- no host set matching filter -->
      <NeEmptyState
        v-else-if="!filteredHostSets.length && !loadingListHostSets"
        :title="t('standalone.objects.no_hosts_found')"
        :description="t('common.try_changing_search_filters')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton kind="tertiary" @click="clearFilters"> {{ t('common.clear_filters') }}</NeButton>
      </NeEmptyState>
      <!-- host sets table -->
      <HostSetsTable
        v-else
        :loading="loadingListHostSets"
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
      :showGoToObjectsButton="false"
      @close="isShownCannotDeleteObjectModal = false"
    />
    <!-- usages modal -->
    <ObjectUsagesModal
      :visible="isShownUsagesModal"
      :objectName="currentHostSetName"
      :usageIds="currentUsageIds"
      :showGoToObjectsButton="false"
      @close="isShownUsagesModal = false"
    />
  </div>
</template>
