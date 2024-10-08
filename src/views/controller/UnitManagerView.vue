<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isEmpty } from 'lodash-es'
import { MAX_NO_SUBSCRIPTION_UNITS, type Unit, useUnitsStore } from '@/stores/controller/units'
import {
  NeButton,
  NeCard,
  NeDropdown,
  NeEmptyState,
  NeHeading,
  NeProgressBar,
  NeSkeleton,
  NeTextInput,
  NeTooltip
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import UnitsTable from '@/components/controller/units/UnitsTable.vue'
import AddUnitModal from '@/components/controller/units/AddUnitModal.vue'
import OpenSshModal from '@/components/controller/units/OpenSshModal.vue'
import SendOrRevokeSshKeyDrawer from '@/components/controller/units/SendOrRevokeSshKeyDrawer.vue'
import { useDefaultsStore } from '@/stores/controller/defaults'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ScheduleUpdateDrawer from '@/components/controller/units/ScheduleUpdateDrawer.vue'
import AbortUpdateModal from '@/components/controller/units/CancelUpdateModal.vue'
import UpdateUnitsPackagesModal from '@/components/controller/units/UpdateUnitsPackagesModal.vue'
import BatchUnitImageUpdate from '@/components/controller/units/BatchUnitImageUpdate.vue'

export type SendOrRevokeAction = 'send' | 'revoke'

const GET_UNITS_REFRESH_INTERVAL = 10000
const { t } = useI18n()
const unitsStore = useUnitsStore()
const defaultsStore = useDefaultsStore()

const textFilter = ref('')
const isShownAddUnitModal = ref(false)
const getUnitsIntervalId = ref(0)
const isUnitsSkeletonEnabled = ref(true)
const isShownOpenSshModal = ref(false)
const isShownSendOrRevokeSshKeyDrawer = ref(false)
const currentUnit = ref<Unit>()
const sendOrRevokeAction = ref<SendOrRevokeAction>('send')
const unitToUpdate = ref<Unit>()
const unitToAbortUpdate = ref<Unit>()
const unitToUpgradePackages = ref<Unit>()
const showBatchUnitImageUpdate = ref(false)

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

const isAddUnitDisabled = computed(() => {
  return !(
    defaultsStore.defaultsLoaded &&
    (defaultsStore.validSubscription || unitsStore.units.length < MAX_NO_SUBSCRIPTION_UNITS)
  )
})

function searchStringInUnit(unit: Unit, queryText: string) {
  const regex = /[^a-zA-Z0-9-]/g
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

  // search in installed version
  found = new RegExp(queryText, 'i').test(unit.info?.version?.replace(regex, ''))
  if (found) {
    return true
  }
  return false
}

onMounted(() => {
  defaultsStore.getDefaults()
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

function showSendSshKeyDrawer() {
  sendOrRevokeAction.value = 'send'
  isShownSendOrRevokeSshKeyDrawer.value = true
}

function showRevokeSshKeyDrawer() {
  sendOrRevokeAction.value = 'revoke'
  isShownSendOrRevokeSshKeyDrawer.value = true
}

function getBulkActionsKebabMenuItems() {
  return [
    {
      id: 'scheduleSystemUpdate',
      label: t('standalone.update.update_system', 2),
      iconStyle: 'fas',
      icon: 'arrows-rotate',
      action: () => (showBatchUnitImageUpdate.value = true)
    },
    {
      id: 'sendSshKey',
      label: t('controller.units.send_ssh_public_key'),
      iconStyle: 'fas',
      icon: 'key',
      action: () => showSendSshKeyDrawer()
    },
    {
      id: 'revokeSshKey',
      label: t('controller.units.revoke_ssh_public_key'),
      iconStyle: 'fas',
      icon: 'circle-minus',
      action: () => showRevokeSshKeyDrawer()
    }
  ]
}
</script>

<template>
  <div>
    <div>
      <div class="flex flex-col justify-between md:flex-row md:items-center">
        <NeHeading tag="h3" class="mb-7">{{ t('controller.units.title') }}</NeHeading>
        <div class="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {{ t('common.data_updated_every_seconds', { seconds: 10 }) }}
        </div>
      </div>
      <div class="mb-10 flex flex-col justify-between gap-6 2xl:flex-row">
        <!-- page description -->
        <div class="max-w-2xl text-gray-500 dark:text-gray-400">
          {{ t('controller.units.page_description') }}
        </div>
        <!-- units left -->
        <NeCard
          v-if="defaultsStore.defaultsLoaded && !defaultsStore.validSubscription"
          :title="
            t(
              'controller.units.num_units_left',
              {
                num: MAX_NO_SUBSCRIPTION_UNITS - unitsStore.units.length
              },
              MAX_NO_SUBSCRIPTION_UNITS - unitsStore.units.length
            )
          "
          class="w-96"
        >
          <template #titleTooltip>
            <NeTooltip>
              <template #content>
                <span>
                  {{
                    t('controller.units.num_units_left_tooltip', {
                      num: unitsStore.units.length,
                      max: MAX_NO_SUBSCRIPTION_UNITS
                    })
                  }}
                </span>
              </template>
            </NeTooltip>
          </template>
          <NeProgressBar
            color="custom"
            custom-color-classes="bg-gradient-to-r from-indigo-400 to-indigo-700"
            :progress="(unitsStore.units.length / MAX_NO_SUBSCRIPTION_UNITS) * 100"
            size="sm"
          />
        </NeCard>
      </div>
    </div>
    <div class="mb-6 flex flex-col-reverse items-start justify-between gap-6 xl:flex-row">
      <!-- text filter -->
      <div class="flex items-center gap-4">
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
      <div>
        <!-- buttons -->
        <div v-if="!isShownUnitsSkeleton" class="flex shrink-0 flex-row-reverse gap-4 xl:flex-row">
          <!-- allow adding a new unit if the controller has a valid subscription, or the number of units is lower than MAX_NO_SUBSCRIPTION_UNITS -->
          <NeButton
            kind="tertiary"
            size="lg"
            @click="isShownAddUnitModal = true"
            :disabled="isAddUnitDisabled"
            class="shrink-0"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
            </template>
            {{ t('controller.units.add_unit') }}
          </NeButton>
          <!-- bulk actions -->
          <NeDropdown
            :items="getBulkActionsKebabMenuItems()"
            :openMenuAriaLabel="t('controller.units.open_actions_menu')"
            alignToRight
          >
            <template #button>
              <NeButton kind="secondary">
                {{ t('controller.units.actions') }}
                <template #suffix>
                  <font-awesome-icon
                    :icon="['fas', 'chevron-down']"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </template>
              </NeButton>
            </template>
          </NeDropdown>
        </div>
      </div>
    </div>
    <div>
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
          @scheduleUpdate="unitToUpdate = $event"
          @abortUpdate="unitToAbortUpdate = $event"
          @upgradeUnitPackages="unitToUpgradePackages = $event"
        />
      </template>
    </div>

    <!-- add unit modal -->
    <AddUnitModal
      :visible="isShownAddUnitModal"
      @close="isShownAddUnitModal = false"
      @reloadData="loadData"
    />

    <!-- open ssh modal -->
    <OpenSshModal
      :visible="isShownOpenSshModal"
      :unit="currentUnit"
      @close="isShownOpenSshModal = false"
    />

    <!-- send/revoke ssh key drawer -->
    <SendOrRevokeSshKeyDrawer
      :isShown="isShownSendOrRevokeSshKeyDrawer"
      :action="sendOrRevokeAction"
      @close="isShownSendOrRevokeSshKeyDrawer = false"
    />

    <ScheduleUpdateDrawer :unit="unitToUpdate" @close="unitToUpdate = undefined" />

    <AbortUpdateModal :unit="unitToAbortUpdate" @close="unitToAbortUpdate = undefined" />

    <UpdateUnitsPackagesModal
      :unit="unitToUpgradePackages"
      @close="unitToUpgradePackages = undefined"
    />

    <BatchUnitImageUpdate
      :show="showBatchUnitImageUpdate"
      @close="showBatchUnitImageUpdate = false"
    />
  </div>
</template>
