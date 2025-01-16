<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  byteFormat1024,
  deleteFromStorage,
  formatDateLoc,
  getAxiosErrorMessage,
  getPreference,
  NeButton,
  NeDropdown,
  NeInlineNotification,
  NeLink,
  NeModal,
  NePaginator,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTooltip,
  NeBadge,
  savePreference,
  useItemPagination
} from '@nethesis/vue-components'
import { type Unit, useUnitsStore } from '@/stores/controller/units'
import { useDefaultsStore } from '@/stores/controller/defaults'
import router from '@/router'
import { onMounted, type PropType, ref } from 'vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import RemoveUnitModal from '@/components/controller/units/RemoveUnitModal.vue'
import { coerce, outside, satisfies } from 'semver'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faCalendarXmark,
  faClock,
  faCloudArrowUp,
  faSync,
  faWarning
} from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'

const props = defineProps({
  filteredUnits: {
    type: Object as PropType<Array<Unit>>,
    required: true
  }
})

// TODO: when dropdown nicely implements icons, remove this with correct imports directly in the component
library.add(faCloudArrowUp)
library.add(faCalendarXmark)

const emit = defineEmits<{
  reloadData: []
  openSshModal: [unit: Unit]
  scheduleUpdate: [unit: Unit]
  abortUpdate: [unit: Unit]
  upgradeUnitPackages: [unit: Unit]
}>()

const { t } = useI18n()
const unitsStore = useUnitsStore()
const defaultsStore = useDefaultsStore()
const loginStore = useLoginStore()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.filteredUnits, {
  itemsPerPage: pageSize
})

const hideOpenUnitPopupsTooltip = ref(false)
const currentUnit = ref<Unit>()
const isShownRemoveUnitModal = ref(false)
const loadingOpenUnit = ref(false)
const showObsoleteApiModal = ref(false)
const showGreaterApiModal = ref(false)

let error = ref({
  openUnit: ''
})

onMounted(() => {
  hideOpenUnitPopupsTooltip.value = getPreference('hideOpenUnitPopupsTooltip', loginStore.username)
})

async function openUnit(unit: Unit, versionCheck = true) {
  error.value.openUnit = ''
  currentUnit.value = unit
  loadingOpenUnit.value = true

  try {
    await unitsStore.getUnitInfo(currentUnit.value.id)
    await unitsStore.getUnits()
    // Find the now updated unit, as the currentUnit might have changed
    currentUnit.value = unitsStore.units.find((u) => u.id == unit.id)!
    // Logic on which message is shown is inside the ObsoleteApiModal component
    let version = coerce(currentUnit.value?.info.api_version)
    if (version == null) {
      version = coerce('0.0.0')!
    }
    if (versionCheck && !satisfies(version, REQUIRED_API_VERSION)) {
      if (outside(version, REQUIRED_API_VERSION, '>')) {
        showGreaterApiModal.value = true
      } else {
        showObsoleteApiModal.value = true
      }
    } else {
      await unitsStore.checkUnitToken(unit.id)
      const routeData = router.resolve({ path: `/controller/manage/${unit.id}/dashboard` })
      window.open(routeData.href, '_blank')
      showGreaterApiModal.value = false
    }
  } catch (err: any) {
    console.error(err)
    error.value.openUnit = t(getAxiosErrorMessage(err))
  } finally {
    loadingOpenUnit.value = false
  }
}

function getKebabMenuItems(unit: Unit) {
  const menuItems: Array<any> = []
  if (unit.registered) {
    menuItems.push(
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
    )
  } else {
    menuItems.push({
      id: 'copyJoinCode',
      label: t('controller.units.copy_join_code'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => copyJoinCode(unit)
    })
  }
  if (unit.info?.version_update ?? '' != '') {
    menuItems.push({
      id: 'scheduleUpdate',
      label:
        unit.info.scheduled_update > 0
          ? t('controller.units.edit_scheduled_image_update')
          : t('standalone.update.update_system'),
      icon: unit.info.scheduled_update > 0 ? 'pen-to-square' : 'circle-arrow-up',
      iconStyle: 'fas',
      action: () => emit('scheduleUpdate', unit),
      disabled: !unit.connected || unitsStore.unitUpgradingImage.find((id) => id == unit.id)
    })
  }
  if (unit.info.scheduled_update > 0) {
    menuItems.push({
      id: 'cancelScheduledUpdate',
      label: t('controller.units.cancel_scheduled_image_update'),
      icon: 'circle-xmark',
      iconStyle: 'fas',
      action: () => emit('abortUpdate', unit),
      disabled: !unit.connected
    })
  }
  // apply common menu items
  menuItems.push(
    {
      id: 'upgradeUnitPackages',
      label: t('controller.units.check_packages_updates'),
      icon: 'arrows-rotate',
      iconStyle: 'fas',
      action: () => emit('upgradeUnitPackages', unit),
      disabled: !unit.connected || unitsStore.unitUpdatingPackages.find((id) => id == unit.id)
    },
    {
      id: 'refreshUnitInfo',
      label: t('controller.units.sync_unit_info'),
      icon: 'cloud-arrow-up',
      iconStyle: 'fas',
      action: () => refreshUnitInfo(unit),
      disabled: !unit.connected
    },
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
  )
  return menuItems
}

async function refreshUnitInfo(unit: Unit) {
  await unitsStore.getUnitInfo(unit.id)
  emit('reloadData')
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
            <span v-if="item.info.version" class="flex flex-wrap items-center gap-2">
              <span>{{ item.info.version }}</span>
              <template v-if="item.connected">
                <template v-if="unitsStore.unitUpgradingImage.find((id) => id == item.id)">
                  <NeTooltip>
                    <template #trigger>
                      <NeBadge
                        :icon="faSync"
                        :text="t('controller.units.updating_image')"
                        clickable
                        kind="info"
                      />
                    </template>
                    <template #content>
                      <div>
                        {{ t('controller.units.updating_image_description') }}
                      </div>
                    </template>
                  </NeTooltip>
                </template>
                <template v-else-if="item.info.scheduled_update > 0">
                  <NeTooltip>
                    <template #trigger>
                      <NeBadge
                        :icon="faClock"
                        :text="t('controller.units.scheduled_image_update')"
                        clickable
                        kind="info"
                      />
                    </template>
                    <template #content>
                      <div>
                        {{
                          t('controller.units.scheduled_image_update_tooltip', {
                            version: item.info.version_update,
                            date: new Date(item.info.scheduled_update * 1000).toLocaleString()
                          })
                        }}
                      </div>
                    </template>
                  </NeTooltip>
                </template>
                <template v-else-if="item.info.version_update">
                  <NeTooltip>
                    <template #trigger>
                      <NeBadge
                        :icon="faWarning"
                        :text="t('controller.units.image_update_available')"
                        clickable
                        kind="warning"
                      />
                    </template>
                    <template #content>
                      <div>
                        {{
                          t('controller.units.image_update_available_tooltip', {
                            version: item.info.version_update
                          })
                        }}
                      </div>
                    </template>
                  </NeTooltip>
                </template>
              </template>
            </span>
            <template v-else-if="item.connected">
              <div class="space-x-2">
                <span>{{ t('controller.units.syncing_data') }}</span>
                <NeTooltip>
                  <template #content>{{ t('controller.units.syncing_data_description') }}</template>
                </NeTooltip>
              </div>
            </template>
            <template v-else>-</template>
          </NeTableCell>
          <!-- actions -->
          <NeTableCell :data-label="t('common.actions')">
            <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
              <!-- open unit button -->
              <template v-if="item.connected">
                <NeButton
                  v-if="hideOpenUnitPopupsTooltip"
                  :disabled="loadingOpenUnit && currentUnit?.id == item.id"
                  :loading="loadingOpenUnit && currentUnit?.id == item.id"
                  kind="tertiary"
                  @click="openUnit(item)"
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
                    <NeButton kind="tertiary" @click="openUnit(item)">
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
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="props.filteredUnits.length"
          :page-size="pageSize"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :page-size-label="t('ne_table.show')"
          @select-page="
            (page: number) => {
              currentPage = page
            }"
          @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
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
    <!-- Modal that forbids opening units with obsolete API -->
    <NeModal
      :primaryLabel="t('common.close')"
      :closeAriaLabel="t('common.close')"
      :title="t('controller.units.cannot_open_unit')"
      :visible="showObsoleteApiModal"
      kind="info"
      @close="showObsoleteApiModal = false"
      @primaryClick="showObsoleteApiModal = false"
    >
      {{
        t('controller.units.cannot_open_unit_description', { name: currentUnit?.info.unit_name })
      }}
    </NeModal>
    <!-- Modal that shows a warning if the API version is newer than the required one -->
    <NeModal
      :primaryLabel="t('controller.units.open_unit')"
      :cancelLabel="t('common.close')"
      :closeAriaLabel="t('common.close')"
      :title="t('controller.units.warning_open_unit')"
      :visible="showGreaterApiModal"
      kind="info"
      @close="showGreaterApiModal = false"
      @primaryClick="openUnit(currentUnit!, false)"
    >
      {{ t('controller.units.warning_open_unit_description') }}
    </NeModal>
  </div>
</template>
