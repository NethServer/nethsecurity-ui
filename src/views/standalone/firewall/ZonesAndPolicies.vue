<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  NeBadge,
  NeDropdown,
  NeHeading,
  NeButton,
  NeInlineNotification,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
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
const { currentPage, pageCount, paginatedItems } = useItemPagination(
  () => firewallConfig.zonesWithoutAliases,
  {
    itemsPerPage: 10
  }
)

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
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.zones_and_policies.title') }}</NeHeading>
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
      :ariaLabel="t('standalone.zones_and_policies.firewall_zones')"
      cardBreakpoint="xl"
      :loading="firewallConfig.loading"
      :skeletonColumns="6"
      :skeletonRows="5"
    >
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.zones_and_policies.zone') }}</NeTableHeadCell>
        <NeTableHeadCell>{{
          t('standalone.zones_and_policies.allow_forwards_to')
        }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.zones_and_policies.traffic_to_wan') }}</NeTableHeadCell>
        <NeTableHeadCell>{{
          t('standalone.zones_and_policies.traffic_to_firewall')
        }}</NeTableHeadCell>
        <NeTableHeadCell>{{
          t('standalone.zones_and_policies.traffic_to_same_zone')
        }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.zones_and_policies.interfaces') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.zones_and_policies.covered_subnets') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.zones_and_policies.logging') }}</NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="item in paginatedItems" :key="item.name">
          <NeTableCell :data-label="t('standalone.zones_and_policies.zone')">
            <div class="flex items-center gap-x-4">
              <div
                :class="getZoneColorClasses(item.name)"
                class="flex h-10 w-10 items-center justify-center rounded-full"
              >
                <FontAwesomeIcon :icon="['fas', getZoneIcon(item.name)]" class="h-5 w-5" />
              </div>
              <span class="uppercase">{{ item.name }}</span>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.allow_forwards_to')">
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
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.traffic_to_wan')">
            <div class="flex items-center gap-x-2">
              <template v-if="getTrafficToWan(item, firewallConfig.forwardings) == undefined">
                -</template
              >
              <template v-else-if="getTrafficToWan(item, firewallConfig.forwardings)">
                <FontAwesomeIcon :icon="['fas', 'arrow-right']" />
                <p>ACCEPT</p>
              </template>
              <template v-else>
                <FontAwesomeIcon :icon="['fas', 'ban']" />
                <p>REJECT</p>
              </template>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.traffic_to_firewall')">
            <div class="flex items-center gap-x-2">
              <FontAwesomeIcon :icon="['fas', trafficIcon(item.input)]" />
              {{ item.input.toUpperCase() }}
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.traffic_to_same_zone')">
            <div class="flex items-center gap-x-2">
              <FontAwesomeIcon :icon="['fas', trafficIcon(item.forward)]" />
              {{ item.forward.toUpperCase() }}
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.interfaces')">
            <template v-if="item.interfaces.length > 0">
              <p v-for="(iface, index) in item.interfaces" :key="index">
                {{ iface }}
              </p>
            </template>
            <template v-else>-</template>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.covered_subnets')">
            -
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.logging')">
            <p>{{ item.logging ? 'ON' : 'OFF' }}</p>
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="-ml-2.5 flex xl:ml-0">
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
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator v-if="pageCount > 1">
        <NePaginator
          :current-page="currentPage ?? 1"
          :total-pages="pageCount ?? 1"
          :next-label="t('common.next')"
          :previous-label="t('common.previous')"
          @select-page="
              (page: number) => {
                currentPage = page
              }
            "
        />
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
