<script setup lang="ts">
import { NeHeading, NeCard, NeTabs, NeEmptyState, NeButton } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs.ts'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import { onMounted, ref } from 'vue'
import type { AxiosResponse } from 'axios'
import WireguardTunnelDetailCard from '@/components/standalone/wireguard/WireguardTunnelDetailCard.vue'
import { faCirclePlus, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import TunnelDrawer from '@/components/standalone/wireguard/TunnelDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const changes = useUciPendingChangesStore()

const { tabs, selectedTab } = useTabs([
  {
    name: 'server',
    label: t('standalone.wireguard_tunnel.tabs.server')
  },
  {
    name: 'tunnel',
    label: t('standalone.wireguard_tunnel.tabs.tunnel')
  }
])

type Instances = string[]

type ListInstancesResponse = {
  instances: Instances
}

const loading = ref(true)
const error = ref<Error>()
const instances = ref<Instances>([])

async function fetchData(): Promise<AxiosResponse<ListInstancesResponse>> {
  return ubusCall<AxiosResponse<ListInstancesResponse>>('ns.wireguard', 'list-instances')
    .then((response) => {
      instances.value = response.data.instances
    })
    .catch((err) => (error.value = err))
    .finally(() => (loading.value = false))
}

onMounted(() => fetchData())

const showTunnelDrawer = ref(false)
function createdTunnel() {
  Promise.all([changes.getChanges(), fetchData()]).finally(() => (showTunnelDrawer.value = false))
}
</script>

<template>
  <div class="space-y-8">
    <NeHeading tag="h3">{{ t('standalone.wireguard_tunnel.title') }}</NeHeading>
    <NeTabs
      :selected="selectedTab"
      :sr-select-tab-label="t('ne_tabs.select_a_tab')"
      :sr-tabs-label="t('ne_tabs.tabs')"
      :tabs="tabs"
      @select-tab="selectedTab = $event"
    />
    <div v-if="selectedTab == 'server'">
      <NeCard v-if="loading" loading />
      <div v-else class="space-y-6">
        <template v-if="instances.length > 0">
          <WireguardTunnelDetailCard
            v-for="instance in instances"
            :key="instance"
            :instance="instance"
          />
        </template>
        <NeEmptyState
          v-else
          :title="t('standalone.wireguard_tunnel.no_server_configured')"
          :description="t('standalone.wireguard_tunnel.no_server_configured_description')"
          :icon="faGlobe"
        >
          <NeButton kind="primary" @click="showTunnelDrawer = true">
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
            </template>
            {{ t('standalone.wireguard_tunnel.add_server') }}
          </NeButton>
        </NeEmptyState>
      </div>
    </div>
  </div>
  <TunnelDrawer
    :is-shown="showTunnelDrawer"
    @success="createdTunnel"
    @close="showTunnelDrawer = false"
  />
</template>
