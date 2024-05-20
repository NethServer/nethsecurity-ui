<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeBadge,
  NeHeading,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage,
  NeEmptyState
} from '@nethesis/vue-components'
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EditDhcpInterfaceDrawer from './EditDhcpInterfaceDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useFirewallStore } from '@/stores/standalone/firewall'
import { computed } from 'vue'
import { getZoneBorderColorClasses } from '@/lib/standalone/network'

export type DhcpInterface = {
  device: string
  start: string
  end: string
  active: boolean
  options: Record<string, string>
  zone: string
  first?: string
  last?: string
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const firewallConfig = useFirewallStore()

const loading = ref(true)
const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const selectedInterface = ref<string>('')
const showEditInterfaceDrawer = ref(false)
const interfaces = ref<Record<string, DhcpInterface>>({})
const isInterfaceCardExpanded = ref<Record<string, boolean>>({})

const areAllCardsExpanded = computed(() => {
  return Object.keys(isInterfaceCardExpanded.value).every((k) => isInterfaceCardExpanded.value[k])
})

async function fetchDhcpInterfaces() {
  try {
    loading.value = true
    interfaces.value = (await ubusCall('ns.dhcp', 'list-interfaces')).data
    isInterfaceCardExpanded.value = Object.fromEntries(
      Object.keys(interfaces.value).map((iface) => [iface, false])
    )
    loading.value = false
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

function getBorderColorForInterface(iface: string) {
  const interfaceZone = firewallConfig.zones.find((zone) => zone.interfaces.includes(iface))

  return getZoneBorderColorClasses(interfaceZone?.name ?? '')
}

function openEditInterfaceDrawer(iface: string) {
  selectedInterface.value = iface
  showEditInterfaceDrawer.value = true
}

function closeEditInterfaceDrawer() {
  selectedInterface.value = ''
  showEditInterfaceDrawer.value = false
}

function toggleExpandAllCards() {
  let newInterfaceCardExpandedValues: Record<string, boolean> = {}
  for (let key of Object.keys(isInterfaceCardExpanded.value)) {
    newInterfaceCardExpandedValues[key] = areAllCardsExpanded.value ? false : true
  }

  isInterfaceCardExpanded.value = newInterfaceCardExpandedValues
}

function toggleExpandSingleCard(interfaceName: string) {
  isInterfaceCardExpanded.value[interfaceName] = !isInterfaceCardExpanded.value[interfaceName]
}

async function reloadDhcpInterfaces() {
  await fetchDhcpInterfaces()
  await uciChangesStore.getChanges()
}

onMounted(() => {
  if (firewallConfig.loading || firewallConfig.error) {
    firewallConfig.fetch()
  }
  fetchDhcpInterfaces()
})
</script>

<template>
  <NeInlineNotification
    kind="error"
    :title="
      firewallConfig.error
        ? t('error.cannot_retrieve_zones')
        : t('error.cannot_retrieve_dhcp_interfaces')
    "
    :description="
      firewallConfig.error
        ? t(getAxiosErrorMessage(firewallConfig.error))
        : error.notificationDescription
    "
    v-if="error.notificationDescription || firewallConfig.error"
  >
    <template #details v-if="error.notificationDetails || firewallConfig.error">
      {{ firewallConfig.error ? firewallConfig.error.toString() : error.notificationDetails }}
    </template>
  </NeInlineNotification>
  <NeSkeleton :lines="10" v-if="loading || firewallConfig.loading" />
  <template v-else-if="!firewallConfig.error">
    <div class="mb-4 flex flex-row items-center justify-between">
      <NeHeading tag="h6" class="mb-1.5 grow">{{ t('standalone.dns_dhcp.interfaces') }}</NeHeading>
      <NeButton
        kind="tertiary"
        @click="toggleExpandAllCards()"
        v-if="Object.keys(interfaces).length > 0"
      >
        <template #prefix>
          <font-awesome-icon
            :icon="[
              'fas',
              areAllCardsExpanded
                ? 'down-left-and-up-right-to-center'
                : 'up-right-and-down-left-from-center'
            ]"
            class="h-4 w-4"
            aria-hidden="true"
          /> </template
        >{{
          areAllCardsExpanded
            ? t('standalone.dns_dhcp.collapse_all_cards')
            : t('standalone.dns_dhcp.expand_all_cards')
        }}</NeButton
      >
    </div>
    <NeEmptyState
      v-if="Object.keys(interfaces).length == 0"
      :title="t('standalone.dns_dhcp.no_interface_configured')"
      :icon="['fas', 'circle-info']"
    />
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" v-else>
      <div
        v-for="(iface, ifaceName) in interfaces"
        :key="ifaceName"
        :class="`overflow-hidden rounded-md border-l-4 bg-white text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:rounded-lg sm:shadow ${getBorderColorForInterface(
          ifaceName
        )}`"
      >
        <div class="flex grow flex-col gap-y-4 p-5">
          <div class="flex flex-col">
            <div class="flex flex-row items-start justify-between">
              <p class="text-sm">
                <strong>{{ ifaceName }}</strong>
                <br />
                {{ iface.device }}
              </p>
              <NeBadge
                size="sm"
                :text="
                  iface.active ? t('standalone.dns_dhcp.active') : t('standalone.dns_dhcp.inactive')
                "
                :kind="iface.active ? 'success' : 'secondary'"
              />
            </div>
          </div>
          <div class="flex flex-row content-start items-center">
            <p class="grow text-sm">{{ iface.first }} - {{ iface.last }}</p>
            <NeButton size="sm" kind="tertiary" @click="openEditInterfaceDrawer(ifaceName)">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'pen-to-square']"
                  class="h-4 w-4"
                  aria-hidden="true"
                /> </template
              >{{ t('common.edit') }}</NeButton
            >
          </div>
          <div class="flex flex-col gap-y-4 rounded-md bg-gray-100 p-3 dark:bg-gray-900">
            <div
              class="flex cursor-pointer flex-row items-center"
              @click="toggleExpandSingleCard(ifaceName)"
            >
              <font-awesome-icon
                :icon="[
                  'fas',
                  isInterfaceCardExpanded[ifaceName] ? 'circle-chevron-up' : 'circle-chevron-down'
                ]"
                class="mr-2 h-4 w-4"
                aria-hidden="true"
              />
              <p>{{ t('standalone.dns_dhcp.options') }}</p>
            </div>
            <template v-if="isInterfaceCardExpanded[ifaceName]"
              ><div class="flex flex-col gap-y-2">
                <div
                  class="text-sm"
                  v-for="(ifaceOption, optionName) in iface.options"
                  :key="optionName"
                >
                  <strong>{{ optionName }}:</strong>
                  {{ ifaceOption }}
                </div>
              </div></template
            >
          </div>
        </div>
      </div>
    </div>
  </template>
  <EditDhcpInterfaceDrawer
    :is-shown="showEditInterfaceDrawer"
    :interface-to-edit="selectedInterface"
    @close="closeEditInterfaceDrawer()"
    @edit-interface="reloadDhcpInterfaces()"
  />
</template>
