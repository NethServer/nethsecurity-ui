<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeBadge } from '@nethesis/vue-components'
import { NeButton, NeDropdown, NeInlineNotification, NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import NeTable from '@/components/standalone/NeTable.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { onMounted, ref } from 'vue'
import CreateOrEditZoneDrawer from '@/components/standalone/firewall/CreateOrEditZoneDrawer.vue'
import DeleteZoneModal from '@/components/standalone/firewall/DeleteZoneModal.vue'
import { SpecialZones, TrafficPolicy, useFirewallStore, Zone } from '@/stores/standalone/firewall'
import { isEmpty } from 'lodash-es'
import {
  getTrafficToWan,
  forwardingsToByZone,
  getZoneColorClasses,
  getZoneIcon
} from '@/lib/standalone/network'

const { t } = useI18n()

const firewallConfig = useFirewallStore()

const creatingOrEditingZone = ref(false)
const zoneToDelete = ref<Zone>()
const zoneToEdit = ref<Zone>()

onMounted(() => {
  firewallConfig.fetch()
})

function trafficIcon(trafficPolicy: TrafficPolicy): string {
  switch (trafficPolicy) {
    case TrafficPolicy.ACCEPT:
      return 'arrow-right'
    default:
      return 'ban'
  }
}

function isSpecialZone(zone: Zone): boolean {
  return Object.values(SpecialZones).includes(zone.name as unknown as SpecialZones)
}

function createZone() {
  zoneToEdit.value = undefined
  creatingOrEditingZone.value = true
}

function editZone(zone: Zone) {
  zoneToEdit.value = zone
  creatingOrEditingZone.value = true
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
        <NeButton kind="secondary" @click="createZone" size="lg">
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
          <div
            :class="getZoneColorClasses(item.name)"
            class="flex h-10 w-10 items-center justify-center rounded-full"
          >
            <FontAwesomeIcon :icon="['fas', getZoneIcon(item.name)]" class="h-5 w-5" />
          </div>
          <span class="uppercase">{{ item.name }}</span>
        </div>
      </template>
      <template #forwards="{ item }: { item: Zone }">
        <div class="flex flex-wrap gap-2">
          <template
            v-for="forward in forwardingsToByZone(item, firewallConfig.forwardings)"
            :key="forward.name"
          >
            <NeBadge
              :text="forward.destination.toUpperCase()"
              kind="custom"
              :customColorClasses="getZoneColorClasses(forward.destination)"
            />
          </template>
          <span v-if="isEmpty(forwardingsToByZone(item, firewallConfig.forwardings))">-</span>
        </div>
      </template>
      <template #output="{ item }: { item: Zone }">
        <div class="flex items-center gap-x-2">
          <template v-if="getTrafficToWan(item, firewallConfig.forwardings) == undefined">
            -</template
          >
          <template v-else-if="getTrafficToWan(item, firewallConfig.forwardings)">
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
                id: 'edit',
                label: t('common.edit'),
                action: () => editZone(item),
                icon: 'pen-to-square'
              },
              {
                id: 'delete',
                danger: true,
                label: t('common.delete'),
                action: () => (zoneToDelete = item),
                icon: 'trash',
                disabled: isSpecialZone(item)
              }
            ]"
            align-to-right
          />
        </div>
      </template>
    </NeTable>
    <CreateOrEditZoneDrawer
      :isShown="creatingOrEditingZone"
      :zoneToEdit="zoneToEdit"
      @close="creatingOrEditingZone = false"
      @success="creatingOrEditingZone = false"
    />
    <DeleteZoneModal
      :zone="zoneToDelete"
      @cancel="zoneToDelete = undefined"
      @success="zoneToDelete = undefined"
    />
  </div>
</template>
