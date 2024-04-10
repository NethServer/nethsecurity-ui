<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeCard, NeButton, getAxiosErrorMessage } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { getHumanizedAppName, getAppIcon, type DpiRule } from '@/lib/standalone/dpi'
import { getZoneBorderColorClasses } from '@/lib/standalone/network'
import { computed, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { Zone } from '@/stores/standalone/firewall'

interface Props {
  rule: DpiRule
  zones: Array<Zone>
}

const props = defineProps<Props>()

const emit = defineEmits(['editRule', 'deleteRule', 'reloadData'])

const { t } = useI18n()
const MAX_APPS_TO_DISPLAY = 8

let loading = ref({
  editRule: false
})

const errorTitle = ref('')
const errorDescription = ref('')

const appsToDisplay = computed(() => {
  const totalApps = props.rule.criteria.length

  if (totalApps == MAX_APPS_TO_DISPLAY + 1) {
    // show all apps istead of "+1 other"
    return props.rule.criteria.slice(0, MAX_APPS_TO_DISPLAY + 1)
  } else {
    return props.rule.criteria.slice(0, MAX_APPS_TO_DISPLAY)
  }
})

const zone = computed(() => {
  return props.zones.find((zone) => zone.interfaces?.includes(props.rule.interface))
})

function getApplicationNames() {
  return props.rule.criteria.filter((app) => app.type === 'application').map((app) => app.name)
}

function getProtocolNames() {
  return props.rule.criteria.filter((app) => app.type === 'protocol').map((app) => app.name)
}

async function toggleRule() {
  loading.value.editRule = true

  const applicationNames = getApplicationNames()
  const protocolNames = getProtocolNames()

  const editRuleData = {
    'config-name': props.rule['config-name'],
    enabled: props.rule.enabled ? false : true,
    device: props.rule.device,
    applications: applicationNames,
    protocols: protocolNames
  }

  try {
    await ubusCall('ns.dpi', 'edit-rule', editRuleData)
    emit('reloadData')
  } catch (err: any) {
    console.error(err)
    errorTitle.value = t('error.cannot_edit_dpi_rule')
    errorDescription.value = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.editRule = false
  }
}
</script>

<template>
  <NeCard
    :menuItems="[
      {
        id: 'enable_disable',
        label: rule.enabled ? t('common.disable') : t('common.enable'),
        iconStyle: 'fas',
        icon: rule.enabled ? 'circle-xmark' : 'circle-check',
        action: () => toggleRule()
      },
      {
        id: 'delete',
        label: t('common.delete'),
        icon: 'trash',
        iconStyle: 'fas',
        action: () => emit('deleteRule', rule),
        danger: true
      }
    ]"
    :errorTitle="errorTitle"
    :errorDescription="errorDescription"
    :class="['border-l-4', zone?.name ? getZoneBorderColorClasses(zone?.name) : '']"
  >
    <template #title>
      <div :class="{ 'opacity-50': !rule.enabled }">
        <span>{{ rule.interface }}</span>
        <span class="ml-3 text-gray-500 dark:text-gray-400">{{ rule.device }}</span>
      </div>
    </template>
    <template #topRight>
      <NeButton kind="tertiary" size="lg" @click="emit('editRule', rule)">
        <template #prefix>
          <font-awesome-icon :icon="['fas', 'pen-to-square']" class="h-4 w-4" aria-hidden="true" />
        </template>
        {{ t('common.edit') }}
      </NeButton>
    </template>
    <div :class="{ 'opacity-50': !rule.enabled }">
      <!-- rule enabled -->
      <div v-if="rule.enabled" class="flex items-center">
        <font-awesome-icon
          :icon="['fas', 'circle-check']"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        />
        <span>{{ t('common.enabled') }}</span>
      </div>
      <!-- rule disabled -->
      <div v-else class="flex items-center">
        <font-awesome-icon
          :icon="['fas', 'circle-xmark']"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        />
        <span>{{ t('common.disabled') }}</span>
      </div>
      <!-- blocked apps -->
      <NeCard alternateBackground class="mt-4">
        <div class="divide-y divide-gray-300 dark:divide-gray-600">
          <div class="pb-3 font-semibold">
            {{ t('standalone.dpi.blocked_apps_and_protocols') }}
          </div>
          <div class="grid grid-cols-1 gap-3 pt-3 md:grid-cols-2">
            <div v-for="app in appsToDisplay" :key="app.id" class="flex items-center">
              <font-awesome-icon :icon="getAppIcon(app)" class="mr-2 h-4 w-4" aria-hidden="true" />
              <span class="truncate">{{ getHumanizedAppName(app.name) }}</span>
            </div>
          </div>
        </div>
        <!-- other apps button -->
        <NeButton
          v-if="rule.criteria.length > appsToDisplay.length"
          kind="tertiary"
          size="sm"
          @click="emit('editRule', rule)"
          class="-ml-2 mt-3"
        >
          {{
            t('standalone.dpi.plus_num_others', {
              num: rule.criteria.length - appsToDisplay.length
            })
          }}
        </NeButton>
      </NeCard>
    </div>
  </NeCard>
</template>
