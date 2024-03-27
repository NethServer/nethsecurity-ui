<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '@/components/standalone/NeTable.vue'
import {
  NeButton,
  NeDropdown,
  NeInlineNotification,
  NeLink,
  NeTooltip,
  getAxiosErrorMessage,
  getPreference,
  savePreference
} from '@nethesis/vue-components'
import { useUnitsStore, type Unit } from '@/stores/controller/units'
import { useDefaultsStore } from '@/stores/controller/defaults'
import router from '@/router'
import { onMounted, ref, type PropType } from 'vue'
import { useLoginStore } from '@/stores/controller/controllerLogin'

defineProps({
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
const hideOpenUnitPopupsTooltip = ref(false)

let error = ref({
  openUnit: ''
})

const tableHeaders = [
  // { ////
  //   key: 'select'
  // },
  {
    label: t('controller.units.unit_name'),
    key: 'unit_name'
  },
  {
    label: t('controller.units.status'),
    key: 'status'
  },
  {
    label: t('controller.units.installed_version'),
    key: 'version'
  },
  {
    key: 'actions'
  }
]

onMounted(() => {
  defaultsStore.getDefaults()
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
  return [
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
      disabled: !unit.info?.unit_name
    },
    {
      id: 'openSsh',
      label: t('controller.units.open_ssh_terminal'),
      icon: 'arrow-up-right-from-square',
      iconStyle: 'fas',
      action: () => emit('openSshModal', unit),
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
      action: () => removeUnit(unit),
      danger: true
    }
  ]
}

function openMetrics(unit: Unit) {
  //// use defaults api
  window.open(`${window.location.origin}/grafana/d/W3S__804z/unit-metrics?var-unit=${unit.id}`)
}

function openLogs(unit: Unit) {
  //// use defaults api
  const unitName = unit.info.unit_name

  if (unitName) {
    window.open(
      `${window.location.origin}/grafana/d/liz0yRCZz/logs?var-hostname=${unitName}&var-level=error`
    )
  }
}

async function removeUnit(unit: Unit) {
  await unitsStore.removeUnit(unit.id)
  emit('reloadData')
}

function dontShowAgainHideOpenUnitPopupsTooltip() {
  hideOpenUnitPopupsTooltip.value = true
  savePreference('hideOpenUnitPopupsTooltip', true, loginStore.username)
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
    <NeTable :data="unitsStore.units" :headers="tableHeaders">
      <!-- <template #select="{ item }: { item: Unit }"> c </template> //// -->

      <!-- unit name -->
      <template #unit_name="{ item }: { item: Unit }">
        <div v-if="item.info.unit_name" class="flex items-center gap-2">
          <font-awesome-icon
            :icon="['fas', item.info?.system_id ? 'award' : 'users']"
            class="h-4 w-4"
            aria-hidden="true"
          />
          {{ item.info.unit_name }}
        </div>
        <template v-else>
          {{ item.id || '-' }}
        </template>
      </template>
      <!-- status -->
      <template #status="{ item }: { item: Unit }">
        <div class="flex items-center gap-2">
          <template v-if="!item.connected">
            <font-awesome-icon :icon="['fas', 'circle-xmark']" class="h-4 w-4" aria-hidden="true" />
            <span>{{ t('controller.units.not_connected') }}</span>
          </template>
          <template v-else>
            <font-awesome-icon
              :icon="['fas', 'circle-check']"
              class="h-4 w-4 text-green-700 dark:text-green-500"
              aria-hidden="true"
            />
            <span>{{ t('controller.units.connected') }}</span>
          </template>
        </div>
      </template>
      <!-- installed version -->
      <template #version="{ item }: { item: Unit }">
        {{ item.info?.version || '-' }}
      </template>
      <!-- actions -->
      <template #actions="{ item }: { item: Unit }">
        <div class="flex items-center justify-end gap-2">
          <!-- open unit button -->
          <template v-if="item.connected">
            <NeButton v-if="hideOpenUnitPopupsTooltip" size="sm" @click="openUnit(item.id)">
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
            <NeTooltip v-else kind="tertiary" triggerEvent="mouseenter focus" placement="top-end">
              <template #trigger>
                <NeButton size="sm" @click="openUnit(item.id)">
                  <template #prefix>
                    <font-awesome-icon
                      :icon="['fas', 'arrow-up-right-from-square']"
                      class="h-4 w-4"
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
                <!-- link with inverted theme -->
                <NeLink
                  @click="dontShowAgainHideOpenUnitPopupsTooltip()"
                  class="mt-2 inline-block text-primary-300 hover:text-primary-200 dark:text-primary-700 dark:hover:text-primary-800"
                >
                  {{ t('common.dont_show_again') }}
                </NeLink>
              </template>
            </NeTooltip>
          </template>
          <!-- kebab menu -->
          <NeDropdown :items="getKebabMenuItems(item)" :alignToRight="true" />
        </div>
      </template>
    </NeTable>
  </div>
</template>
