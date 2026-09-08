<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeTextInput
} from '@nethesis/vue-components'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { refDebounced } from '@vueuse/core'
import { faCirclePlus, faCubes, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  useApplicationGroupsPage,
  type DpiApplicationGroup
} from '@/composables/useApplicationGroups'
import { useDpiRules } from '@/composables/useDpiRules'
import ApplicationGroupsTable from '@/components/standalone/dpi/ApplicationGroupsTable.vue'
import CreateApplicationGroupModal from '@/components/standalone/dpi/CreateApplicationGroupModal.vue'
import DeleteApplicationGroupModal from '@/components/standalone/dpi/DeleteApplicationGroupModal.vue'

const { t } = useI18n()

const nameFilter = ref('')
const search = refDebounced(nameFilter, 400)
const page = ref(1)
const pageSize = ref(10)

const { data, isLoading, isPlaceholderData, isError, error } = useApplicationGroupsPage({
  search,
  page,
  pageSize
})
const { data: allRules } = useDpiRules()

const groups = computed(() => data.value?.data ?? [])
const totalRows = computed(() => data.value?.meta.total ?? 0)
const isFiltered = computed(() => search.value.trim() !== '')
const hasGroups = computed(() => groups.value.length > 0)

const groupToEdit = ref<DpiApplicationGroup>()
const isDuplicating = ref(false)
const isShownSaveModal = ref(false)
const groupToDelete = ref<DpiApplicationGroup>()
const isShownDeleteModal = ref(false)

watch(search, () => {
  page.value = 1
})

function createGroup() {
  groupToEdit.value = undefined
  isDuplicating.value = false
  isShownSaveModal.value = true
}

function editGroup(group: DpiApplicationGroup) {
  groupToEdit.value = group
  isDuplicating.value = false
  isShownSaveModal.value = true
}

function duplicateGroup(group: DpiApplicationGroup) {
  groupToEdit.value = group
  isDuplicating.value = true
  isShownSaveModal.value = true
}

function deleteGroup(group: DpiApplicationGroup) {
  groupToDelete.value = group
  isShownDeleteModal.value = true
}

function resetFilters() {
  nameFilter.value = ''
}
</script>

<template>
  <div>
    <NeInlineNotification
      v-if="isError"
      kind="error"
      :title="t('error.cannot_retrieve_application_groups')"
      :description="t(getAxiosErrorMessage(error))"
      class="mb-8"
    />
    <ApplicationGroupsTable
      v-if="isLoading"
      :groups="[]"
      :rules="allRules ?? []"
      loading
      :current-page="page"
      :page-size="pageSize"
      :total-rows="0"
    />
    <template v-else-if="!hasGroups && !isFiltered">
      <NeEmptyState
        :title="t('standalone.dpi.no_application_groups_configured')"
        :description="t('standalone.dpi.no_application_groups_configured_description')"
        :icon="faCubes"
        class="text-center [&>div>div]:max-w-2xl"
      >
        <NeButton kind="primary" size="lg" @click="createGroup">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" />
          </template>
          {{ t('standalone.dpi.create_application_group') }}
        </NeButton>
      </NeEmptyState>
    </template>
    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p class="max-w-2xl text-sm leading-5 text-tertiary-neutral">
          {{ t('standalone.dpi.create_application_group_description') }}
        </p>
        <NeButton kind="primary" size="lg" @click="createGroup">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" />
          </template>
          {{ t('standalone.dpi.create_application_group') }}
        </NeButton>
      </div>
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <NeTextInput
          v-model="nameFilter"
          is-search
          :clear-search-label="t('common.clear_filter')"
          :placeholder="t('standalone.dpi.filter_groups')"
          class="w-80"
        />
      </div>
      <NeEmptyState
        v-if="!hasGroups"
        :title="t('standalone.dpi.no_application_groups_found')"
        :description="t('standalone.dpi.no_application_groups_found_description')"
        :icon="faMagnifyingGlass"
        class="text-center [&>div>div]:max-w-2xl"
      >
        <NeButton kind="tertiary" size="lg" @click="resetFilters">
          {{ t('common.reset_filters') }}
        </NeButton>
      </NeEmptyState>
      <ApplicationGroupsTable
        v-else
        :groups="groups"
        :rules="allRules ?? []"
        :loading="isPlaceholderData"
        :current-page="page"
        :page-size="pageSize"
        :total-rows="totalRows"
        @edit="editGroup"
        @duplicate="duplicateGroup"
        @delete="deleteGroup"
        @select-page="(selected) => (page = selected)"
        @select-page-size="
          (size) => {
            pageSize = size
            page = 1
          }
        "
      />
    </template>
    <CreateApplicationGroupModal
      :visible="isShownSaveModal"
      :group="groupToEdit"
      :duplicate="isDuplicating"
      @close="isShownSaveModal = false"
      @save="isShownSaveModal = false"
    />
    <DeleteApplicationGroupModal
      :visible="isShownDeleteModal"
      :group="groupToDelete"
      @close="isShownDeleteModal = false"
      @deleted="isShownDeleteModal = false"
    />
  </div>
</template>
