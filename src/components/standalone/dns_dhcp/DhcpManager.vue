<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeEmptyState,
  NeHeading,
  NeInlineNotification,
  NeSkeleton
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EditDhcpInterfaceDrawer from './EditDhcpInterfaceDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useFirewallStore } from '@/stores/standalone/firewall'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import DhcpCard from '@/components/standalone/dns_dhcp/DhcpCard.vue'

type BindingType = 0 | 1 | 2

export type DhcpInterface = {
  device: string
  start: string
  end: string
  active: boolean
  options: Record<string, string>
  zone: string
  first?: string
  last?: string
  ns_binding?: BindingType
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

function openEditInterfaceDrawer(iface: string) {
  selectedInterface.value = iface
  showEditInterfaceDrawer.value = true
}

function closeEditInterfaceDrawer() {
  selectedInterface.value = ''
  showEditInterfaceDrawer.value = false
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
    v-if="error.notificationDescription || firewallConfig.error"
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
  >
    <template v-if="error.notificationDetails || firewallConfig.error" #details>
      {{ firewallConfig.error ? firewallConfig.error.toString() : error.notificationDetails }}
    </template>
  </NeInlineNotification>
  <NeSkeleton v-if="loading || firewallConfig.loading" :lines="10" />
  <template v-else-if="!firewallConfig.error">
    <NeHeading class="mb-4" tag="h6">{{ t('standalone.dns_dhcp.interfaces') }}</NeHeading>
    <NeEmptyState
      v-if="Object.keys(interfaces).length == 0"
      :title="t('standalone.dns_dhcp.no_interface_configured')"
      :icon="faCircleInfo"
    />
    <div v-else class="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <DhcpCard
        v-for="(iface, ifaceName) in interfaces"
        :key="ifaceName"
        :interface-name="ifaceName"
        :dhcp-interface="iface"
        @edit="openEditInterfaceDrawer(ifaceName)"
      />
    </div>
  </template>
  <EditDhcpInterfaceDrawer
    :is-shown="showEditInterfaceDrawer"
    :interface-to-edit="selectedInterface"
    @close="closeEditInterfaceDrawer()"
    @edit-interface="reloadDhcpInterfaces()"
  />
</template>
