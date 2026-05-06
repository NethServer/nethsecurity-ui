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
  NeEmptyState,
  useItemPagination,
  NeTooltip
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
  getIconFromZone
} from '@/lib/standalone/network'
import {
  faArrowRight,
  faBan,
  faList,
  faPenToSquare,
  faTrash
} from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()
const firewallConfig = useFirewallStore()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(
  () => firewallConfig.zonesWithoutAliases,
  {
    itemsPerPage: pageSize
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
  return (
    Object.values(SpecialZones).includes(zone.name as unknown as SpecialZones) ||
    zone.nsTags.includes('automated')
  )
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
        <NeButton kind="primary" size="lg" @click="createZone">
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
      :aria-label="t('standalone.zones_and_policies.firewall_zones')"
      card-breakpoint="2xl"
      :loading="firewallConfig.loading"
      :skeleton-columns="6"
      :skeleton-rows="5"
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
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-if="isEmpty(paginatedItems)">
          <NeTableCell colspan="9">
            <NeEmptyState
              :title="t('ne_table.no_items')"
              :icon="['fas', 'table']"
              class="bg-white dark:bg-gray-950"
            />
          </NeTableCell>
        </NeTableRow>
        <NeTableRow v-for="item in paginatedItems" v-else :key="item.name">
          <NeTableCell :data-label="t('standalone.zones_and_policies.zone')">
            <div class="flex w-full items-center justify-between gap-2">
              <div>
                <div class="flex items-center gap-x-4">
                  <div
                    :class="getZoneColorClasses(item.name)"
                    class="flex h-10 w-10 items-center justify-center rounded-full"
                  >
                    <FontAwesomeIcon :icon="getIconFromZone(item.name)" class="h-5 w-5" />
                  </div>
                  <span class="uppercase">{{ item.name }}</span>
                </div>
              </div>
              <div>
                <NeTooltip trigger-event="mouseenter focus" v-if="item.logging">
                  <template #trigger>
                    <NeLink>
                      <FontAwesomeIcon
                        :icon="faList"
                        class="h-4 w-4 text-indigo-800 dark:text-indigo-300"
                      />
                    </NeLink>
                  </template>
                  <template #content>
                    <span> {{ t('standalone.zones_and_policies.logging_enabled') }} </span>
                  </template>
                </NeTooltip>
              </div>
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
                  :custom-color-classes="getZoneColorClasses(forward.destination)"
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
                <FontAwesomeIcon :icon="faArrowRight" class="text-green-700 dark:text-green-500" />
                <p>ACCEPT</p>
              </template>
              <template v-else>
                <FontAwesomeIcon :icon="faBan" class="text-rose-700 dark:text-rose-500" />
                <p>REJECT</p>
              </template>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.traffic_to_firewall')">
            <div class="flex items-center gap-x-2">
              <FontAwesomeIcon
                :icon="['fas', trafficIcon(item.input)]"
                :class="[
                  item.input === TrafficPolicy.ACCEPT
                    ? 'text-green-700 dark:text-green-500'
                    : 'text-rose-700 dark:text-rose-500'
                ]"
              />
              {{ item.input.toUpperCase() }}
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.traffic_to_same_zone')">
            <div class="flex items-center gap-x-2">
              <FontAwesomeIcon
                :icon="['fas', trafficIcon(item.forward)]"
                :class="[
                  item.forward === TrafficPolicy.ACCEPT
                    ? 'text-green-700 dark:text-green-500'
                    : 'text-rose-700 dark:text-rose-500'
                ]"
              />
              {{ item.forward.toUpperCase() }}
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.zones_and_policies.interfaces')">
            <template v-if="item.interfaces.length > 0">
              {{ item.interfaces.join(', ') }}
            </template>
            <template v-else>-</template>
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="-ml-2.5 flex 2xl:ml-0">
              <NeDropdown
                :items="[
                  {
                    id: 'edit',
                    label: t('common.edit'),
                    action: () => editZone(item),
                    icon: faPenToSquare
                  },
                  {
                    id: 'delete',
                    danger: true,
                    label: t('common.delete'),
                    action: () => (zoneToDelete = item),
                    icon: faTrash,
                    disabled: isSpecialZone(item)
                  }
                ]"
                align-to-right
              />
            </div>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="firewallConfig.zonesWithoutAliases.length"
          :page-size="pageSize"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :page-size-label="t('ne_table.show')"
          @select-page="
            (page: number) => {
              currentPage = page
            }
          "
          @select-page-size="
            (size: number) => {
              pageSize = size
            }
          "
        />
      </template>
    </NeTable>
    <CreateOrEditZoneDrawer
      :is-shown="creatingOrEditingZone"
      :zone-to-edit="zoneToEdit"
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
