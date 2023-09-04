<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeBadge,
  NeButton,
  NeDropdown,
  NeInlineNotification,
  NeTitle
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import NeTable from '@/components/standalone/NeTable.vue'
import type { Zone } from '@/composables/useFirewall'
import { Forward, TrafficPolicy, useFirewall, ZoneType } from '@/composables/useFirewall'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ref } from 'vue'

const { t } = useI18n()

const { error, loading, zones, forwards } = useFirewall()

const editZone = ref<Zone>()
const deleteZone = ref<Zone>()

function getRelatedForwards(zone: Zone): Forward[] {
  return forwards.value.filter((forward) => forward.source.name == zone.name)
}

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
</script>

<template>
  <div class="space-y-8">
    <NeTitle>{{ t('standalone.zones_and_policies.title') }}</NeTitle>
    <div class="flex">
      <p class="text-sm font-normal dark:text-gray-400">
        {{ t('standalone.zones_and_policies.description') }}
      </p>
      <div>
        <!-- TODO: add settings and add zone -->
      </div>
    </div>
    <NeInlineNotification
      v-if="error"
      :title="t(getAxiosErrorMessage(error.message))"
      kind="error"
    />
    <NeTable
      v-else
      :data="zones"
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
      :loading="loading"
    >
      <template #label="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-4">
          <div :class="color(item)" class="flex h-10 w-10 items-center justify-center rounded-full">
            <FontAwesomeIcon :icon="['fas', icon(item)]" />
          </div>
          <span class="uppercase">{{ item.label }}</span>
        </div>
      </template>
      <template #forwards="{ item }: { item: Zone }">
        <div class="flex flex-wrap gap-2">
          <template v-for="forward in getRelatedForwards(item)" :key="forward.destination.name">
            <NeBadge :class="color(item)" :text="forward.destination.label" />
          </template>
        </div>
      </template>
      <template #input="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-2">
          <FontAwesomeIcon :icon="['fas', trafficIcon(item.input)]" />
          {{ t(`standalone.zones_and_policies.traffic_policy.${item.input}`) }}
        </div>
      </template>
      <template #output="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-2">
          <FontAwesomeIcon :icon="['fas', trafficIcon(item.output)]" />
          {{ t(`standalone.zones_and_policies.traffic_policy.${item.output}`) }}
        </div>
      </template>
      <template #forward="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-2">
          <FontAwesomeIcon :icon="['fas', trafficIcon(item.forward)]" />
          {{ t(`standalone.zones_and_policies.traffic_policy.${item.forward}`) }}
        </div>
      </template>
      <template #interfaces="{ item }: { item: Zone }">
        <p v-for="(iface, index) in item.interfaces" :key="index">
          {{ iface }}
        </p>
      </template>
      <template #covered_subnets> -</template>
      <template #logging="{ item }: { item: Zone }">
        <p>{{ item.logging ? 'ON' : 'OFF' }}</p>
      </template>
      <template #actions="{ item }: { item: Zone }">
        <div class="flex gap-3">
          <NeButton kind="tertiary" @click="editZone = item">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'edit']" />
            </template>
            {{ t('common.edit') }}
          </NeButton>
          <NeDropdown
            :items="[
              {
                id: 'delete',
                danger: true,
                label: t('common.delete'),
                action: () => (deleteZone = item)
              }
            ]"
            align-to-right
          />
        </div>
      </template>
    </NeTable>
  </div>
</template>
