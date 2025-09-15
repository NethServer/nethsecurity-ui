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
import CreateOrEditDomainSetDrawer from './CreateOrEditDomainSetDrawer.vue'
import DomainSetsTable from './DomainSetsTable.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import CannotDeleteObjectModal from './CannotDeleteObjectModal.vue'
import ObjectUsagesModal from './ObjectUsagesModal.vue'
import { useDomainSets, type DomainSet } from '@/composables/useDomainSets'
import { useObjectStore } from '@/stores/standalone/objects'
import type { IpVersionFilter } from '@/views/standalone/users_objects/ObjectsView.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const {
  domainSets,
  listDomainSets,
  loadingListDomainSets,
  errorListDomainSets,
  errorListDomainSetsDetails,
  searchStringInDomainSet
} = useDomainSets()

const objects = useObjectStore()

const currentDomainSet = ref<DomainSet | undefined>(undefined)
const currentDomainSetName = ref('')
const currentUsageIds = ref<string[]>([])
const isShownCreateOrEditDomainSetDrawer = ref(false)
const isShownDeleteDomainSetModal = ref(false)
const isShownUsagesModal = ref(false)
const isShownCannotDeleteObjectModal = ref(false)
const textFilter = ref('')
const ipVersionFilter = ref<IpVersionFilter[]>(['any'])

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

const filteredDomainSets = computed(() => {
  return domainSets.value.filter((domainSet) => {
    const matchesTextFilter =
      !textFilter.value || searchStringInDomainSet(domainSet, textFilter.value)
    const matchesIpVersionFilter =
      ipVersionFilter.value[0] == 'any' ||
      ipVersionFilter.value.includes(domainSet.family as IpVersionFilter)
    return matchesTextFilter && matchesIpVersionFilter
  })
})

onMounted(() => {
  loadData()
})

function loadData() {
  listDomainSets()
  objects.load()
  uciChangesStore.getChanges()
}

function showCreateDomainSetDrawer() {
  currentDomainSet.value = undefined
  isShownCreateOrEditDomainSetDrawer.value = true
}

function showEditDomainSetDrawer(domainSet: DomainSet) {
  currentDomainSet.value = domainSet
  isShownCreateOrEditDomainSetDrawer.value = true
}

function showDeleteDomainSetModal(domainSet: DomainSet) {
  currentDomainSet.value = domainSet

  if (!domainSet.used) {
    isShownDeleteDomainSetModal.value = true
  } else {
    currentUsageIds.value = domainSet.matches || []
    currentDomainSetName.value = domainSet.name
    isShownCannotDeleteObjectModal.value = true
  }
}

function showUsagesModal(domainSet: DomainSet) {
  currentUsageIds.value = domainSet.matches || []
  currentDomainSetName.value = domainSet.name
  isShownUsagesModal.value = true
}

function clearFilters() {
  textFilter.value = ''
  ipVersionFilter.value = ['any']
}
</script>

<template>
  <div class="text-sm">
    <div class="mb-8 flex flex-col items-start justify-between gap-6 xl:flex-row">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('standalone.objects.domain_sets_page_description') }}
      </div>
      <NeButton
        v-if="loadingListDomainSets || domainSets.length"
        kind="secondary"
        size="lg"
        :disabled="loadingListDomainSets"
        class="shrink-0"
        @click="showCreateDomainSetDrawer"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
        </template>
        {{ t('standalone.objects.add_domain_set') }}
      </NeButton>
    </div>

    <div class="space-y-6">
      <!-- list domain sets error notification -->
      <NeInlineNotification
        v-if="errorListDomainSets"
        kind="error"
        :title="t('error.cannot_retrieve_domain_sets')"
        :description="errorListDomainSets"
        class="mb-5"
      >
        <template v-if="errorListDomainSetsDetails" #details>
          {{ errorListDomainSetsDetails }}
        </template>
      </NeInlineNotification>
      <!-- text filter -->
      <div class="flex items-center gap-4">
        <NeTextInput
          v-model.trim="textFilter"
          :placeholder="t('standalone.objects.filter_domain_sets')"
          :disabled="loadingListDomainSets"
          class="max-w-xs"
        />
        <NeDropdownFilter
          v-model="ipVersionFilter"
          kind="radio"
          :label="t('standalone.objects.ip_version')"
          :options="ipVersionFilterOptions"
          :clear-search-label="t('ne_dropdown_filter.clear_search')"
          :clear-filter-label="t('ne_dropdown_filter.clear_filter')"
          :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
          :no-options-label="t('ne_dropdown_filter.no_options')"
          :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
        />
        <NeButton kind="tertiary" :disabled="loadingListDomainSets" @click="clearFilters">
          {{ t('common.clear_filters') }}
        </NeButton>
      </div>
      <!-- empty state -->
      <NeEmptyState
        v-if="!domainSets.length && !loadingListDomainSets"
        :title="t('standalone.objects.no_domain_sets')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton
          kind="secondary"
          size="lg"
          class="shrink-0"
          :disabled="loadingListDomainSets"
          @click="showCreateDomainSetDrawer"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('standalone.objects.add_domain_set') }}
        </NeButton>
      </NeEmptyState>
      <!-- no domain set matching filter -->
      <NeEmptyState
        v-else-if="!filteredDomainSets.length && !loadingListDomainSets"
        :title="t('standalone.objects.no_domain_sets_found')"
        :description="t('common.try_changing_search_filters')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton kind="tertiary" @click="clearFilters">
          {{ t('common.clear_filters') }}
        </NeButton>
      </NeEmptyState>
      <!-- domain sets table -->
      <DomainSetsTable
        v-else
        :loading="loadingListDomainSets"
        :filtered-domain-sets="filteredDomainSets"
        @edit-domain-set="showEditDomainSetDrawer"
        @delete-domain-set="showDeleteDomainSetModal"
        @show-usages-domain-set="showUsagesModal"
      />
    </div>
    <!-- create/edit domain set -->
    <CreateOrEditDomainSetDrawer
      :is-shown="isShownCreateOrEditDomainSetDrawer"
      :current-domain-set="currentDomainSet"
      :all-domain-sets="domainSets"
      @close="isShownCreateOrEditDomainSetDrawer = false"
      @reload-data="loadData"
    />
    <!-- delete domain set modal -->
    <DeleteModal
      :visible="isShownDeleteDomainSetModal"
      :title="t('standalone.objects.delete_domain_set')"
      :delete-button-label="t('standalone.objects.delete_domain_set')"
      :error-notification-title="t('error.cannot_delete_domain_set')"
      :delete-function="
        () =>
          ubusCall('ns.objects', 'delete-domain-set', {
            id: currentDomainSet?.id
          })
      "
      @close="isShownDeleteDomainSetModal = false"
      @reload-data="loadData"
    >
      {{ t('standalone.objects.confirm_delete_domain_set', { name: currentDomainSet?.name }) }}
    </DeleteModal>
    <!-- cannot delete modal -->
    <CannotDeleteObjectModal
      :visible="isShownCannotDeleteObjectModal"
      :object-name="currentDomainSetName"
      :usage-ids="currentUsageIds"
      :show-go-to-objects-button="false"
      @close="isShownCannotDeleteObjectModal = false"
    />
    <!-- usages modal -->
    <ObjectUsagesModal
      :visible="isShownUsagesModal"
      :object-name="currentDomainSetName"
      :usage-ids="currentUsageIds"
      :show-go-to-objects-button="false"
      @close="isShownUsagesModal = false"
    />
  </div>
</template>
