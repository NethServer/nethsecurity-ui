<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTextInput } from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isEmpty } from 'lodash-es'
import { useUnitsStore, type Unit } from '@/stores/controller/units'
import { NeTitle, NeButton, NeEmptyState, NeSkeleton } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import UnitsTable from '@/components/controller/units/UnitsTable.vue'
import AddUnitModal from '@/components/controller/units/AddUnitModal.vue'
import OpenSshModal from '@/components/controller/units/OpenSshModal.vue'

const GET_UNITS_REFRESH_INTERVAL = 10000
const { t } = useI18n()
const unitsStore = useUnitsStore()
const textFilter = ref('')
const isShownAddUnitModal = ref(false)
const getUnitsIntervalId = ref(0)
const isUnitsSkeletonEnabled = ref(true)
const isShownOpenSshModal = ref(false)
const currentUnit = ref<Unit>()

const filteredUnits = computed(() => {
  if (!textFilter.value) {
    // no filter
    return unitsStore.units
  } else {
    // filter units
    return unitsStore.units.filter((unit) => searchStringInUnit(unit, textFilter.value))
  }
})

const isShownUnitsSkeleton = computed(() => {
  return unitsStore.loadingListUnits && isUnitsSkeletonEnabled.value
})

function searchStringInUnit(unit: Unit, queryText: string) {
  const regex = /[^a-zA-Z0-9]/g
  queryText = queryText.replace(regex, '')
  let found = false

  // search in unit ID
  found = new RegExp(queryText, 'i').test(unit.id?.replace(regex, ''))
  if (found) {
    return true
  }

  // search in unit name
  found = new RegExp(queryText, 'i').test(unit.info?.unit_name?.replace(regex, ''))
  if (found) {
    return true
  }
  return false
}

onMounted(() => {
  loadData()

  // periodically retrieve units data
  getUnitsIntervalId.value = setInterval(unitsStore.getUnits, GET_UNITS_REFRESH_INTERVAL)
})

onUnmounted(() => {
  if (getUnitsIntervalId.value) {
    clearInterval(getUnitsIntervalId.value)
  }
})

async function loadData() {
  isUnitsSkeletonEnabled.value = true
  await unitsStore.getUnits()
  isUnitsSkeletonEnabled.value = false
}

function showOpenSshModal(unit: Unit) {
  currentUnit.value = unit
  isShownOpenSshModal.value = true
}
</script>

<template>
  <div>
    <div class="flex flex-col justify-between md:flex-row md:items-center">
      <NeTitle>{{ t('controller.units.title') }}</NeTitle>
      <div class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {{ t('standalone.dashboard.data_updated_every_seconds', { seconds: 10 }) }}
      </div>
    </div>
    <div class="mb-8 flex flex-col items-start justify-between gap-6 xl:flex-row">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('controller.units.page_description') }}
      </div>
      <div v-if="!isShownUnitsSkeleton" class="flex shrink-0 flex-row-reverse gap-6 xl:flex-row">
        <NeButton kind="tertiary" size="lg" @click="isShownAddUnitModal = true" class="shrink-0">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('controller.units.add_unit') }}
        </NeButton>
        <NeButton kind="secondary" size="lg" @click="loadData" class="shrink-0">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'arrows-rotate']" aria-hidden="true" />
          </template>
          {{ t('controller.units.reload_units') }}
        </NeButton>
      </div>
    </div>
  </div>
  <!-- text filter -->
  <div class="mb-5 flex items-center gap-4">
    <NeTextInput
      :placeholder="t('controller.units.filter_units')"
      v-model.trim="textFilter"
      :disabled="isShownUnitsSkeleton"
      class="max-w-xs"
    />
    <NeButton
      kind="tertiary"
      @click="textFilter = ''"
      :disabled="isShownUnitsSkeleton || !textFilter"
    >
      {{ t('common.clear_filter') }}
    </NeButton>
  </div>
  <!-- skeleton -->
  <template v-if="isShownUnitsSkeleton && isUnitsSkeletonEnabled">
    <NeSkeleton :lines="7" size="lg" />
  </template>
  <template v-else>
    <!-- empty state -->
    <template v-if="isEmpty(unitsStore.units)">
      <NeEmptyState
        :title="t('controller.units.no_units_configured')"
        :icon="['fas', 'server']"
        class="mt-4"
      >
        <NeButton kind="primary" size="lg" @click="isShownAddUnitModal = true">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('controller.units.add_unit') }}</NeButton
        >
      </NeEmptyState>
    </template>
    <!-- no rule matching filter -->
    <template v-else-if="isEmpty(filteredUnits)">
      <NeEmptyState
        :title="t('controller.units.no_units_found')"
        :description="t('common.try_changing_search_filter')"
        :icon="['fas', 'circle-info']"
        class="mt-4"
      >
        <NeButton kind="tertiary" @click="textFilter = ''">
          {{ t('common.clear_filter') }}</NeButton
        >
      </NeEmptyState>
    </template>
    <!-- units table -->
    <UnitsTable
      v-else
      :filteredUnits="filteredUnits"
      @reloadData="loadData"
      @openSshModal="showOpenSshModal"
    />
  </template>

  <!-- add unit modal -->
  <AddUnitModal :visible="isShownAddUnitModal" @close="isShownAddUnitModal = false" />

  <!-- open ssh modal -->
  <OpenSshModal
    :visible="isShownOpenSshModal"
    :unit="currentUnit"
    @close="isShownOpenSshModal = false"
  />
</template>
