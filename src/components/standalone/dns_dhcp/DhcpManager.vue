<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeInlineNotification,
  NeSkeleton,
  NeTitle,
  NeBadge,
  NeButton,
  NeEmptyState
} from '@nethserver/vue-tailwind-lib'
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import EditDhcpInterfaceDrawer from './EditDhcpInterfaceDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ZoneType, useFirewallStore } from '@/stores/standalone/useFirewallStore'
import { computed } from 'vue'

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
const error = ref('')
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
    error.value = t(getAxiosErrorMessage(err))
  }
}

function getColorForInterface(iface: string) {
  const interfaceZone = firewallConfig.zones.find((zone) => zone.interfaces.includes(iface))

  switch (interfaceZone?.type()) {
    case ZoneType.LAN:
      return 'bg-green-100 dark:bg-green-700'
    case ZoneType.WAN:
      return 'bg-rose-100 dark:bg-rose-700'
    case ZoneType.GUEST:
      return 'bg-blue-100 dark:bg-blue-700'
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

function toggleExpandAllCards() {
  for (let key of Object.keys(isInterfaceCardExpanded.value)) {
    isInterfaceCardExpanded.value[key] = areAllCardsExpanded.value ? false : true
  }
}

function toggleExpandSingleCard(interfaceName: string) {
  isInterfaceCardExpanded.value[interfaceName] = !isInterfaceCardExpanded.value[interfaceName]
}

async function reloadDhcpInterfaces() {
  await fetchDhcpInterfaces()
  await uciChangesStore.getChanges()
}

onMounted(() => {
  //TODO: handle firewallconfig error state
  firewallConfig.fetch()
  fetchDhcpInterfaces()
})
</script>

<template>
  <NeInlineNotification
    kind="error"
    :title="t('error.generic_error')"
    :description="error"
    v-if="error"
  />
  <NeSkeleton :lines="10" v-if="loading || firewallConfig.loading" />
  <template v-else>
    <div class="mb-4 flex flex-row items-center justify-between">
      <NeTitle level="h4" class="grow">{{ t('standalone.dns_dhcp.interfaces') }}</NeTitle>
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
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" v-else>
      <div
        v-for="(iface, ifaceName) in interfaces"
        :key="ifaceName"
        class="bg-whitetext-sm overflow-hidden text-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:rounded-lg sm:shadow"
      >
        <div class="flex h-full flex-row">
          <div :class="['w-1.5', getColorForInterface(ifaceName)]"></div>
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
                    iface.active
                      ? t('standalone.dns_dhcp.active')
                      : t('standalone.dns_dhcp.not_active')
                  "
                  :kind="iface.active ? 'success' : 'error'"
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
            <div class="flex flex-col gap-y-3 rounded-md bg-gray-100 p-3 dark:bg-gray-900">
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
                ><div
                  class="text-sm"
                  v-for="(ifaceOption, optionName) in iface.options"
                  :key="optionName"
                >
                  <strong>{{ optionName }}:</strong> {{ ifaceOption }}
                </div></template
              >
            </div>
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
