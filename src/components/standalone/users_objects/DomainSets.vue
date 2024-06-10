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
import CreateOrEditDomainSetDrawer from './CreateOrEditDomainSetDrawer.vue'
import DomainSetsTable from './DomainSetsTable.vue'
import type { IpVersion } from '@/views/standalone/users_objects/ObjectsView.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import CannotDeleteObjectModal from './CannotDeleteObjectModal.vue'
import ObjectUsagesModal from './ObjectUsagesModal.vue'

export type DomainSet = {
  id: string
  name: string
  family?: IpVersion
  domain: string[]
  timeout: string
  used?: boolean
  matches?: string[]
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const domainSets = ref<DomainSet[]>([])
const currentDomainSet = ref<DomainSet | undefined>(undefined)
const currentDomainSetName = ref('')
const currentUsageIds = ref<string[]>([])
const isShownCreateOrEditDomainSetDrawer = ref(false)
const isShownDeleteDomainSetModal = ref(false)
const isShownUsagesModal = ref(false)
const isShownCannotDeleteObjectModal = ref(false)
const textFilter = ref('')

const loading = ref({
  listDomainSets: false
})

const error = ref({
  listDomainSets: '',
  listDomainSetsDetails: ''
})

const filteredDomainSets = computed(() => {
  if (!textFilter.value) {
    // no filter
    return domainSets.value
  } else {
    // filter units
    return domainSets.value.filter((domainSet) =>
      searchStringInDomainSet(domainSet, textFilter.value)
    )
  }
})

onMounted(() => {
  loadData()
})

function loadData() {
  listDomainSets()
  uciChangesStore.getChanges()
}

function searchStringInDomainSet(domainSet: DomainSet, queryText: string) {
  const regex = /[^a-zA-Z0-9-]/g
  queryText = queryText.replace(regex, '')
  let found = false

  // search in string attributes
  found = ['name'].some((attrName) => {
    const attrValue = domainSet[attrName as keyof DomainSet] as string
    return new RegExp(queryText, 'i').test(attrValue?.replace(regex, ''))
  })

  if (found) {
    return true
  }

  // search in records (domain attribute)
  found = !!domainSet.domain?.some((record) => {
    return new RegExp(queryText, 'i').test(record?.replace(regex, ''))
  })

  if (found) {
    return true
  }
}

async function listDomainSets() {
  loading.value.listDomainSets = true
  domainSets.value = []
  error.value.listDomainSets = ''
  error.value.listDomainSetsDetails = ''

  try {
    const res = await ubusCall('ns.objects', 'list-domain-sets')
    domainSets.value = res.data.values as DomainSet[]
  } catch (err: any) {
    console.error(err)
    error.value.listDomainSets = t(getAxiosErrorMessage(err))
    error.value.listDomainSetsDetails = err.toString()
  } finally {
    loading.value.listDomainSets = false
  }
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
</script>

<template>
  <div class="text-sm">
    <div class="mb-8 flex flex-col items-start justify-between gap-6 xl:flex-row">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('standalone.objects.domain_sets_page_description') }}
      </div>
      <NeButton
        v-if="loading.listDomainSets || domainSets.length"
        kind="secondary"
        size="lg"
        @click="showCreateDomainSetDrawer"
        :disabled="loading.listDomainSets"
        class="shrink-0"
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
        v-if="error.listDomainSets"
        kind="error"
        :title="t('error.cannot_retrieve_domain_sets')"
        :description="error.listDomainSets"
        class="mb-5"
      >
        <template #details v-if="error.listDomainSetsDetails">
          {{ error.listDomainSetsDetails }}
        </template>
      </NeInlineNotification>
      <!-- text filter -->
      <div class="flex items-center gap-4">
        <NeTextInput
          :placeholder="t('standalone.objects.filter_domain_sets')"
          v-model.trim="textFilter"
          :disabled="loading.listDomainSets"
          class="max-w-xs"
        />
        <NeButton
          kind="tertiary"
          @click="textFilter = ''"
          :disabled="loading.listDomainSets || !textFilter"
        >
          {{ t('common.clear_filter') }}
        </NeButton>
      </div>
      <!-- empty state -->
      <NeEmptyState
        v-if="!domainSets.length && !loading.listDomainSets"
        :title="t('standalone.objects.no_domain_sets')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton
          kind="secondary"
          size="lg"
          @click="showCreateDomainSetDrawer"
          class="shrink-0"
          :disabled="loading.listDomainSets"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('standalone.objects.add_domain_set') }}
        </NeButton>
      </NeEmptyState>
      <!-- no domain set matching filter -->
      <NeEmptyState
        v-else-if="!filteredDomainSets.length && !loading.listDomainSets"
        :title="t('standalone.objects.no_domain_sets_found')"
        :description="t('common.try_changing_search_filter')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton kind="tertiary" @click="textFilter = ''">
          {{ t('common.clear_filter') }}</NeButton
        >
      </NeEmptyState>
      <!-- domain sets table -->
      <DomainSetsTable
        v-else
        :loading="loading.listDomainSets"
        :filteredDomainSets="filteredDomainSets"
        @editDomainSet="showEditDomainSetDrawer"
        @deleteDomainSet="showDeleteDomainSetModal"
        @showUsagesDomainSet="showUsagesModal"
      />
    </div>
    <!-- create/edit domain set -->
    <CreateOrEditDomainSetDrawer
      :isShown="isShownCreateOrEditDomainSetDrawer"
      :currentDomainSet="currentDomainSet"
      :recordOptions="domainSets"
      @close="isShownCreateOrEditDomainSetDrawer = false"
      @reloadData="loadData"
    />
    <!-- delete domain set modal -->
    <DeleteModal
      :visible="isShownDeleteDomainSetModal"
      :title="t('standalone.objects.delete_domain_set')"
      :deleteButtonLabel="t('standalone.objects.delete_domain_set')"
      :errorNotificationTitle="t('error.cannot_delete_domain_set')"
      :deleteFunction="
        () =>
          ubusCall('ns.objects', 'delete-domain-set', {
            id: currentDomainSet?.id
          })
      "
      @close="isShownDeleteDomainSetModal = false"
      @reloadData="loadData"
    >
      {{ t('standalone.objects.confirm_delete_domain_set', { name: currentDomainSet?.name }) }}
    </DeleteModal>
    <!-- cannot delete modal -->
    <CannotDeleteObjectModal
      :visible="isShownCannotDeleteObjectModal"
      :objectName="currentDomainSetName"
      :usageIds="currentUsageIds"
      @close="isShownCannotDeleteObjectModal = false"
    />
    <!-- usages modal -->
    <ObjectUsagesModal
      :visible="isShownUsagesModal"
      :objectName="currentDomainSetName"
      :usageIds="currentUsageIds"
      @close="isShownUsagesModal = false"
    />
  </div>
</template>
