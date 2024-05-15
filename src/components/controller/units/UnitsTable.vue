<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeDropdown,
  NeInlineNotification,
  NeLink,
  NeTooltip,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  getAxiosErrorMessage,
  getPreference,
  savePreference,
  byteFormat1024,
  formatDateLoc,
  deleteFromStorage,
  useItemPagination
} from '@nethesis/vue-components'
import { useUnitsStore, type Unit } from '@/stores/controller/units'
import { useDefaultsStore } from '@/stores/controller/defaults'
import router from '@/router'
import { onMounted, ref, type PropType } from 'vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import RemoveUnitModal from '@/components/controller/units/RemoveUnitModal.vue'

const props = defineProps({
  filteredUnits: {
    type: Object as PropType<Array<Unit>>,
    required: true
  }
})

const emit = defineEmits(['reloadData', 'openSshModal'])

const { t } = useI18n()
const unitsStore = useUnitsStore()
const defaultsStore = useDefaultsStore()
const loginStore = useLoginStore()
const { currentPage, pageCount, paginatedItems } = useItemPagination(() => props.filteredUnits, {
  itemsPerPage: 10
})

const hideOpenUnitPopupsTooltip = ref(false)
const currentUnit = ref<Unit>()
const isShownRemoveUnitModal = ref(false)

let error = ref({
  openUnit: ''
})

onMounted(() => {
  hideOpenUnitPopupsTooltip.value = getPreference('hideOpenUnitPopupsTooltip', loginStore.username)
})

async function openUnit(unitId: string) {
  error.value.openUnit = ''

  try {
    await unitsStore.checkUnitToken(unitId)
    const routeData = router.resolve({ path: `/controller/manage/${unitId}/dashboard` })
    window.open(routeData.href, '_blank')
  } catch (err: any) {
    console.error(err)
    error.value.openUnit = t(getAxiosErrorMessage(err))
  }
}

function getKebabMenuItems(unit: Unit) {
  const commonMenuItems = [
    {
      id: 'divider1'
    },
    {
      id: 'removeUnit',
      label: t('controller.units.remove_unit'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => maybeShowRemoveUnitModal(unit),
      danger: true
    }
  ]

  const unregisteredUnitMenuItems = [
    {
      id: 'copyJoinCode',
      label: t('controller.units.copy_join_code'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => copyJoinCode(unit)
    }
  ]

  const registeredUnitMenuItems = [
    {
      id: 'openMetrics',
      label: t('controller.units.open_metrics'),
      icon: 'arrow-up-right-from-square',
      iconStyle: 'fas',
      action: () => openMetrics(unit)
    },
    {
      id: 'openLogs',
      label: t('controller.units.open_logs'),
      icon: 'arrow-up-right-from-square',
      iconStyle: 'fas',
      action: () => openLogs(unit),
      disabled: !unit.info.fqdn
    },
    {
      id: 'openSsh',
      label: t('controller.units.open_ssh_terminal'),
      icon: 'terminal',
      iconStyle: 'fas',
      action: () => emit('openSshModal', unit),
      disabled: !unit.connected
    }
  ]

  if (unit.registered) {
    return [...registeredUnitMenuItems, ...commonMenuItems]
  } else {
    return [...unregisteredUnitMenuItems, ...commonMenuItems]
  }
}

function copyJoinCode(unit: Unit) {
  if (unit.join_code) {
    navigator.clipboard.writeText(unit.join_code)
  }
}

function openMetrics(unit: Unit) {
  window.open(
    `https://${defaultsStore.fqdn}${defaultsStore.grafanaPath}/d/W3S__804z/unit-metrics?var-unit=${unit.id}`
  )
}

function openLogs(unit: Unit) {
  const unitFqdn = unit.info.fqdn

  if (unitFqdn) {
    window.open(
      `https://${defaultsStore.fqdn}${defaultsStore.grafanaPath}/d/liz0yRCZz/logs?var-hostname=${unitFqdn}&var-level=error`
    )
  }
}

function dontShowAgainHideOpenUnitPopupsTooltip() {
  hideOpenUnitPopupsTooltip.value = true
  savePreference('hideOpenUnitPopupsTooltip', true, loginStore.username)
}

function getSubscriptionLabel(subscriptionType: string) {
  switch (subscriptionType) {
    case 'community':
      return t('controller.units.subscription_community')
    case 'enterprise':
      return t('controller.units.subscription_enterprise')
    default:
      return t('controller.units.subscription_none')
  }
}

async function maybeShowRemoveUnitModal(unit: Unit) {
  if (unit.registered) {
    showRemoveUnitModal(unit)
  } else {
    await unitsStore.removeUnit(unit.id)

    // remove unit credentials from local storage
    deleteFromStorage(`unit-${unit.id}`)

    emit('reloadData')
  }
}

function showRemoveUnitModal(unit: Unit) {
  currentUnit.value = unit
  isShownRemoveUnitModal.value = true
}
</script>

<template>
  <div>
    <!-- openUnit error modal -->
    <NeInlineNotification
      v-if="error.openUnit"
      kind="error"
      :title="t('error.cannot_open_unit')"
      :description="error.openUnit"
      :closeAriaLabel="t('common.close')"
      class="mb-6"
    />
    <NeTable :ariaLabel="t('controller.units.units')" cardBreakpoint="xl">
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('controller.units.unit_name') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('controller.units.status') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('controller.units.installed_version') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="item in paginatedItems" :key="item.name">
          <!-- unit name -->
          <NeTableCell :data-label="t('controller.units.unit_name')">
            <div class="space-y-1">
              <!-- unit name -->
              <div>
                <div v-if="item.info.unit_name" class="flex items-center gap-2">
                  <NeTooltip interactive>
                    <template #trigger>
                      <font-awesome-icon
                        :icon="[
                          'fas',
                          item.info.subscription_type === 'enterprise' ? 'award' : 'users'
                        ]"
                        class="h-4 w-4"
                        aria-hidden="true"
                      />
                    </template>
                    <template #content>
                      {{ getSubscriptionLabel(item.info.subscription_type) }}
                    </template>
                  </NeTooltip>
                  {{ item.info.unit_name }}
                </div>
                <template v-else>
                  {{ item.id || '-' }}
                </template>
              </div>
              <!-- more info button -->
              <div v-if="item.registered">
                <NeTooltip interactive :maxWidth="450">
                  <template #trigger>
                    <NeButton size="sm" kind="tertiary" class="-mx-2">
                      {{ t('common.more_info') }}
                    </NeButton>
                  </template>
                  <template #content>
                    <div class="space-y-1 px-2 py-1">
                      <!-- hostname -->
                      <div>
                        <span class="mr-2 inline-block font-semibold">
                          {{ t('controller.units.hostname') }}:
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">
                          {{ item.info.fqdn || '-' }}
                        </span>
                      </div>
                      <!-- unit id -->
                      <div>
                        <span class="mr-2 inline-block font-semibold">
                          {{ t('controller.units.unit_id') }}:
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">
                          {{ item.id }}
                        </span>
                      </div>
                      <!-- data received -->
                      <div v-if="item.vpn.bytes_rcvd">
                        <span class="mr-2 inline-block font-semibold">
                          {{ t('controller.units.data_received') }}:
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">
                          {{ byteFormat1024(item.vpn.bytes_rcvd) }}
                        </span>
                      </div>
                      <!-- data sent -->
                      <div v-if="item.vpn.bytes_sent">
                        <span class="mr-2 inline-block font-semibold">
                          {{ t('controller.units.data_sent') }}:
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">
                          {{ byteFormat1024(item.vpn.bytes_sent) }}
                        </span>
                      </div>
                      <!-- connected since -->
                      <div v-if="item.vpn.connected_since">
                        <span class="mr-2 inline-block font-semibold">
                          {{ t('controller.units.connected_since') }}:
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">
                          {{
                            formatDateLoc(
                              new Date(Number(item.vpn.connected_since) * 1000),
                              'PPpp'
                            ) || '-'
                          }}
                        </span>
                      </div>
                      <!-- real address -->
                      <div v-if="item.vpn.real_address">
                        <span class="mr-2 inline-block font-semibold">
                          {{ t('controller.units.real_address') }}:
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">
                          {{ item.vpn.real_address || '-' }}
                        </span>
                      </div>
                      <!-- virtual address -->
                      <div v-if="item.vpn.virtual_address">
                        <span class="mr-2 inline-block font-semibold">
                          {{ t('controller.units.virtual_address') }}:
                        </span>
                        <span class="text-gray-300 dark:text-gray-600">
                          {{ item.vpn.virtual_address || '-' }}
                        </span>
                      </div>
                    </div>
                  </template>
                </NeTooltip>
              </div>
            </div>
          </NeTableCell>
          <!-- status -->
          <NeTableCell :data-label="t('controller.units.status')">
            <div class="flex items-center gap-2">
              <template v-if="item.connected">
                <!-- connected unit -->
                <font-awesome-icon
                  :icon="['fas', 'circle-check']"
                  class="h-4 w-4 text-green-700 dark:text-green-500"
                  aria-hidden="true"
                />
                <span>{{ t('controller.units.connected') }}</span>
              </template>
              <template v-else-if="item.registered">
                <!-- registered unit, but not connected -->
                <font-awesome-icon
                  :icon="['fas', 'circle-xmark']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                <span>{{ t('controller.units.not_connected') }}</span>
              </template>
              <template v-else>
                <!-- unit not registered yet -->
                <font-awesome-icon
                  :icon="['fas', 'circle-xmark']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                <span>{{ t('controller.units.not_registered_yet') }}</span>
              </template>
            </div>
          </NeTableCell>
          <!-- installed version -->
          <NeTableCell :data-label="t('controller.units.installed_version')">
            {{ item.info.version || '-' }}
          </NeTableCell>
          <!-- actions -->
          <NeTableCell :data-label="t('common.actions')">
            <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
              <!-- open unit button -->
              <template v-if="item.connected">
                <NeButton
                  v-if="hideOpenUnitPopupsTooltip"
                  kind="tertiary"
                  @click="openUnit(item.id)"
                  class="shrink-0"
                >
                  <template #prefix>
                    <font-awesome-icon
                      :icon="['fas', 'arrow-up-right-from-square']"
                      class="h-4 w-4"
                      aria-hidden="true"
                    />
                  </template>
                  {{ t('controller.units.open_unit') }}
                </NeButton>
                <!-- show popups warning tooltip -->
                <NeTooltip
                  v-else
                  triggerEvent="mouseenter focus"
                  placement="top-end"
                  class="shrink-0"
                >
                  <template #trigger>
                    <NeButton kind="tertiary" @click="openUnit(item.id)">
                      <template #prefix>
                        <font-awesome-icon
                          :icon="['fas', 'arrow-up-right-from-square']"
                          class="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </template>
                      {{ t('controller.units.open_unit') }}
                    </NeButton>
                  </template>
                  <template #content>
                    <div>
                      {{ t('controller.units.open_unit_tooltip') }}
                    </div>
                    <NeLink invertedTheme @click="dontShowAgainHideOpenUnitPopupsTooltip">
                      {{ t('common.dont_show_again') }}
                    </NeLink>
                  </template>
                </NeTooltip>
              </template>
              <!-- kebab menu -->
              <NeDropdown :items="getKebabMenuItems(item)" :alignToRight="true" />
            </div>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator v-if="pageCount > 1">
        <NePaginator
          :current-page="currentPage ?? 1"
          :total-pages="pageCount ?? 1"
          :next-label="t('common.next')"
          :previous-label="t('common.previous')"
          @select-page="
              (page: number) => {
                currentPage = page
              }
            "
        />
      </template>
    </NeTable>
    <!-- remove unit modal -->
    <RemoveUnitModal
      :visible="isShownRemoveUnitModal"
      :unit="currentUnit"
      @close="isShownRemoveUnitModal = false"
      @reloadData="emit('reloadData')"
    />
  </div>
</template>
