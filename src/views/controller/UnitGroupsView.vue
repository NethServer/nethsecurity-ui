<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeHeading,
  NeSkeleton,
  NeTextInput,
  type NeComboboxOption,
  NeEmptyState,
} from '@nethesis/vue-components'
import { onMounted, ref, computed } from 'vue'
import { useUnitGroupsStore } from '@/stores/controller/unit_groups'
import { isEmpty } from 'lodash-es'
import CreateOrEditUnitGroupDrawer from '@/components/controller/unit_groups/CreateOrEditUnitGroupDrawer.vue'
import UnitGroupsTable from '@/components/controller/unit_groups/UnitGroupsTable.vue'
import { useNotificationsStore } from '@/stores/notifications'

// Import or define the UnitGroup type
import type { UnitGroup } from '@/stores/controller/unit_groups'
import { useUnitsStore } from '@/stores/controller/units'

const { t } = useI18n()
const unitGroupsStore = useUnitGroupsStore()
const unitsStore = useUnitsStore()
const notificationsStore = useNotificationsStore()

const textFilter = ref('')
const showDeleteModal = ref(false)
const showDrawer = ref(false)
const selectedGroup = ref<any>(null)

const allUnits = computed(
  () =>
    unitsStore.units.map((unit: any) => ({
      id: unit.id,
      label: unit.info?.unit_name || unit.id,
      description: unit.info?.unit_name ? unit.id : '',
    })) as Array<NeComboboxOption>
)
const unitNameMap = computed(() => {
  const map: Record<string, string> = {}
  if (!Array.isArray(unitsStore.units)) {
    return map
  }
  unitsStore.units.forEach((unit) => {
    map[unit.id] = unit.info?.unit_name || unit.id
  })
  return map
})
const loading = computed(() => unitGroupsStore.unitGroupsLoading)

async function loadData() {
  await unitGroupsStore.loadUnitGroups()
  await unitsStore.getUnits() // Load units if needed
  showDeleteModal.value = false
  showDrawer.value = false
}

onMounted(() => {
  loadData()
})

function searchStringInGroup(group: UnitGroup, queryText: string) {
  const regex = /[^a-zA-Z0-9-]/g
  queryText = queryText.replace(regex, '')
  let found = false

  // search in group name
  found = new RegExp(queryText, 'i').test(group.name?.replace(regex, ''))
  if (found) {
    return true
  }
  // search in group description
  if (group.description) {
    found = new RegExp(queryText, 'i').test(group.description.replace(regex, ''))
    if (found) {
      return true
    }
  }

  // search in each unit's name or id
  if (Array.isArray(group.units)) {
    for (const unit of group.units) {
      // Try to match by unit id
      if (unit && new RegExp(queryText, 'i').test(unit.replace(regex, ''))) {
        return true
      }
    }
  }
  return false
}

const filteredGroups = computed(() => {
  if (!textFilter.value) {
    // no filter
    return unitGroupsStore.unitGroups
  } else {
    // filter units
    return unitGroupsStore.unitGroups.filter((group) =>
      searchStringInGroup(group, textFilter.value)
    )
  }
})

function openDeleteModal(group: any) {
  selectedGroup.value = group
  showDeleteModal.value = true
}

function openEditDrawer(group: UnitGroup) {
  selectedGroup.value = group
  showDrawer.value = true
}

function openAddDrawer() {
  showDrawer.value = true
  selectedGroup.value = null
}

function closeDrawer() {
  showDrawer.value = false
  selectedGroup.value = null
}
</script>

<template>
  <div>
    <div>
      <div class="flex flex-col justify-between md:flex-row md:items-center">
        <NeHeading tag="h3" class="mb-7">{{ t('controller.unit_groups.title') }}</NeHeading>
      </div>
      <div class="mb-10 flex flex-col justify-between gap-6 2xl:flex-row">
        <!-- page description -->
        <div class="max-w-2xl text-gray-500 dark:text-gray-400">
          {{ t('controller.unit_groups.page_description') }}
        </div>
      </div>
    </div>
    <div class="mb-6 flex flex-col-reverse items-start justify-between gap-6 xl:flex-row">
      <!-- text filter -->
      <div class="flex items-center gap-4">
        <NeTextInput v-model.trim="textFilter" :placeholder="t('controller.unit_groups.filter_groups')"
          :disabled="loading" class="max-w-xs" />
        <NeButton kind="tertiary" :disabled="loading || !textFilter" @click="textFilter = ''">
          {{ t('common.clear_filter') }}
        </NeButton>
      </div>
      <div>
        <!-- buttons -->
        <div v-if="!loading" class="flex shrink-0 flex-row-reverse gap-4 xl:flex-row">
          <!-- allow adding a new unit if the controller has a valid subscription, or the number of units is lower than MAX_NO_SUBSCRIPTION_UNITS -->
          <NeButton kind="tertiary" size="lg" :disabled="showDrawer" class="shrink-0" @click="openAddDrawer()">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
            </template>
            {{ t('controller.unit_groups.add_group') }}
          </NeButton>
        </div>
      </div>
    </div>
    <div>
      <!-- skeleton -->
      <template v-if="loading">
        <NeSkeleton :lines="7" size="lg" />
      </template>
      <template v-else>
        <!-- empty state -->
        <template v-if="isEmpty(unitGroupsStore.unitGroups)">
          <NeEmptyState :title="t('controller.unit_groups.no_groups_configured')" :icon="['fas', 'server']"
            class="mt-4">
            <NeButton kind="primary" size="lg" @click="openAddDrawer()">
              <template #prefix>
                <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
              </template>
              {{ t('controller.unit_groups.add_group') }}
            </NeButton>
          </NeEmptyState>
        </template>
        <!-- no rule matching filter -->
        <template v-else-if="isEmpty(filteredGroups)">
          <NeEmptyState :title="t('controller.unit_groups.no_groups_found')"
            :description="t('common.try_changing_search_filter')" :icon="['fas', 'circle-info']" class="mt-4">
            <NeButton kind="tertiary" @click="textFilter = ''">
              {{ t('common.clear_filter') }}</NeButton>
          </NeEmptyState>
        </template>
        <!-- units groups table -->
        <template v-else>
          <UnitGroupsTable :unit-groups="filteredGroups" :unit-name-map="unitNameMap" @edit-group="openEditDrawer"
            @delete-group="openDeleteModal" @group-deleted="() => {
              loadData()
              notificationsStore.addNotification({
                kind: 'success',
                id: 'delete-unit-group',
                title: t('controller.unit_groups.group_deleted')
              })
            }" />
        </template>
      </template>
    </div>
  </div>
  <CreateOrEditUnitGroupDrawer v-model:show="showDrawer" :item-to-edit="selectedGroup" :is-shown="showDrawer"
    :all-units="allUnits" @edit-group="
      () => {
        loadData()
        notificationsStore.addNotification({
          kind: 'success',
          id: 'edit-unit-group',
          title: t('controller.unit_groups.group_edited')
        })
      }
    " @add-group="
      () => {
        loadData()
        notificationsStore.addNotification({
          kind: 'success',
          id: 'add-unit-group',
          title: t('controller.unit_groups.group_added')
        })
      }
    " @close-drawer=" closeDrawer()" />
</template>
