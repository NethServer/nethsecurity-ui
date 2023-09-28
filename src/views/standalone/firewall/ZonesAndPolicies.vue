<script lang="ts" setup>
import {
  NeBadge,
  NeButton,
  NeDropdown,
  NeInlineNotification,
  NeSideDrawer,
  NeTitle
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import NeTable from '@/components/standalone/NeTable.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { onMounted, ref } from 'vue'
import CreateZoneDrawer from '@/components/standalone/firewall/CreateZoneDrawer.vue'
import DeleteZoneModal from '@/components/standalone/firewall/DeleteZoneModal.vue'
import {
  Forwarding,
  SpecialZones,
  TrafficPolicy,
  useFirewallStore,
  Zone,
  ZoneType
} from '@/stores/standalone/useFirewallStore'

const { t } = useI18n()

const firewallConfig = useFirewallStore()

const creatingZone = ref(false)
const deleteZone = ref<Zone>()

onMounted(() => {
  firewallConfig.fetch()
})

function color(zone: Zone): string {
  switch (zone.type()) {
    case ZoneType.WAN:
      return 'bg-rose-700'
    case ZoneType.LAN:
      return 'bg-green-700'
    case ZoneType.GUEST:
      return 'bg-blue-700'
    case ZoneType.CUSTOM:
      return 'bg-indigo-700'
  }
}

function icon(zone: Zone): string {
  switch (zone.type()) {
    case ZoneType.WAN:
      return 'earth-americas'
    case ZoneType.LAN:
      return 'location-dot'
    case ZoneType.GUEST:
      return 'users'
    case ZoneType.CUSTOM:
      return 'empty-set'
  }
}

function trafficIcon(trafficPolicy: TrafficPolicy): string {
  switch (trafficPolicy) {
    case TrafficPolicy.ACCEPT:
      return 'arrow-right'
    default:
      return 'ban'
  }
}

function trafficToWan(zone: Zone): boolean | undefined {
  if (zone.name != SpecialZones.WAN) {
    return firewallConfig.forwardings
      .filter((forwarding: Forwarding) => forwarding.source == zone.name)
      .map((forwarding: Forwarding) => forwarding.destination)
      .some((forwardingName) => forwardingName == SpecialZones.WAN)
  }
  return undefined
}

function forwardingsByZone(zone: Zone): Array<Forwarding> {
  return firewallConfig.forwardings.filter(
    (forwarding: Forwarding) =>
      forwarding.source == zone.name && forwarding.destination != SpecialZones.WAN
  )
}

function isSpecialZone(zone: Zone): boolean {
  return Object.values(SpecialZones).includes(zone.name as unknown as SpecialZones)
}
</script>

<template>
  <div class="space-y-8">
    <NeTitle>{{ t('standalone.zones_and_policies.title') }}</NeTitle>
    <div class="flex flex-wrap gap-6">
      <p class="grow text-sm font-normal dark:text-gray-400">
        {{ t('standalone.zones_and_policies.description') }}
      </p>
      <div>
        <!-- TODO: add settings -->
        <NeButton kind="secondary" @click="creatingZone = true" size="lg">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" />
          </template>
          {{ t('standalone.zones_and_policies.add_zone') }}
        </NeButton>
      </div>
    </div>
    <NeInlineNotification
      v-if="firewallConfig.error"
      :title="t(firewallConfig.error.message)"
      kind="error"
    />
    <NeTable
      v-else
      :data="firewallConfig.zones"
      :headers="[
        {
          key: 'label',
          label: t('standalone.zones_and_policies.zone')
        },
        {
          key: 'forwards',
          label: t('standalone.zones_and_policies.allow_forwards_to')
        },
        {
          key: 'output',
          label: t('standalone.zones_and_policies.traffic_to_wan')
        },
        {
          key: 'input',
          label: t('standalone.zones_and_policies.traffic_to_firewall')
        },
        {
          key: 'forward',
          label: t('standalone.zones_and_policies.traffic_to_same_zone')
        },
        {
          key: 'interfaces',
          label: t('standalone.zones_and_policies.interfaces')
        },
        {
          key: 'covered_subnets',
          label: t('standalone.zones_and_policies.covered_subnets')
        },
        {
          key: 'logging',
          label: t('standalone.zones_and_policies.logging')
        },
        {
          key: 'actions'
        }
      ]"
      :loading="firewallConfig.loading"
    >
      <template #label="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-4">
          <div :class="color(item)" class="flex h-10 w-10 items-center justify-center rounded-full">
            <FontAwesomeIcon :icon="['fas', icon(item)]" />
          </div>
          <span class="uppercase">{{ item.name }}</span>
        </div>
      </template>
      <template #forwards="{ item }: { item: Zone }">
        <div class="flex flex-wrap gap-2">
          <template v-for="forward in forwardingsByZone(item)" :key="forward.name">
            <NeBadge :text="forward.destination" />
          </template>
        </div>
      </template>
      <template #output="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-2">
          <template v-if="trafficToWan(item) == undefined"> -</template>
          <template v-else-if="trafficToWan(item)">
            <FontAwesomeIcon :icon="['fas', 'arrow-right']" />
            <p>{{ t('standalone.zones_and_policies.traffic_policy.accept') }}</p>
          </template>
          <template v-else>
            <FontAwesomeIcon :icon="['fas', 'ban']" />
            <p>{{ t('standalone.zones_and_policies.traffic_policy.reject') }}</p>
          </template>
        </div>
      </template>
      <template #input="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-2">
          <FontAwesomeIcon :icon="['fas', trafficIcon(item.input)]" />
          {{ t(`standalone.zones_and_policies.traffic_policy.${item.input}`) }}
        </div>
      </template>
      <template #forward="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-2">
          <FontAwesomeIcon :icon="['fas', trafficIcon(item.forward)]" />
          {{ t(`standalone.zones_and_policies.traffic_policy.${item.forward}`) }}
        </div>
      </template>
      <template #interfaces="{ item }: { item: Zone }">
        <template v-if="item.interfaces.length > 0">
          <p v-for="(iface, index) in item.interfaces" :key="index">
            {{ iface }}
          </p>
        </template>
        <template v-else>-</template>
      </template>
      <template #covered_subnets> -</template>
      <template #logging="{ item }: { item: Zone }">
        <p>{{ item.logging ? 'ON' : 'OFF' }}</p>
      </template>
      <template #actions="{ item }: { item: Zone }">
        <div class="flex gap-3">
          <NeDropdown
            :items="[
              {
                id: 'delete',
                danger: true,
                label: t('common.delete'),
                action: () => (deleteZone = item),
                disabled: isSpecialZone(item)
              }
            ]"
            align-to-right
          />
        </div>
      </template>
    </NeTable>
    <NeSideDrawer
      :is-shown="creatingZone"
      :title="t('standalone.zones_and_policies.add_zone')"
      @close="creatingZone = false"
    >
      <CreateZoneDrawer @cancel="creatingZone = false" @success="creatingZone = false" />
    </NeSideDrawer>
    <DeleteZoneModal
      :zone="deleteZone"
      @cancel="deleteZone = undefined"
      @success="deleteZone = undefined"
    />
  </div>
</template>
