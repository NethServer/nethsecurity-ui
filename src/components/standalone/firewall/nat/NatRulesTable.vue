<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeButton } from '@nethesis/vue-components'
import {
  NeBadge,
  NeDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import { ref, type PropType } from 'vue'
import { type NatRule } from '@/stores/standalone/firewall'
import { getZoneColorClasses } from '@/lib/standalone/network'

const props = defineProps({
  rules: {
    type: Array as PropType<NatRule[]>,
    required: true
  },
  loading: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['reloadRules', 'editRule', 'deleteRule'])

const { t } = useI18n()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.rules, {
  itemsPerPage: pageSize
})

function getDropdownItems(rule: NatRule) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => emit('deleteRule', rule),
      danger: true
    }
  ]
}
</script>

<template>
  <div>
    <NeTable
      :ariaLabel="t('standalone.nat.nat_rules')"
      cardBreakpoint="xl"
      :loading="loading"
      :skeletonColumns="6"
      :skeletonRows="3"
    >
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.nat.name') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.nat.source_address') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.nat.outbound_zone') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.nat.destination_address') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.nat.action') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.nat.rewrite_ip') }}</NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
          <NeTableCell :data-label="t('standalone.nat.name')">
            {{ item.name }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.nat.source_address')">
            {{ item.src_ip }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.nat.outbound_zone')">
            <span v-if="item.src === '*'">{{ t('common.any') }}</span>
            <NeBadge
              v-else
              :text="item.src.toUpperCase()"
              kind="custom"
              :customColorClasses="getZoneColorClasses(item.src)"
            />
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.nat.destination_address')">
            {{ item.dest_ip }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.nat.action')">
            {{ item.target }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.nat.rewrite_ip')">
            <span v-if="item.snat_ip">{{ item.snat_ip }}</span>
            <span v-else> - </span>
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="align-center -ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
              <NeButton kind="tertiary" size="lg" @click="emit('editRule', item)">
                <template #prefix>
                  <font-awesome-icon
                    :icon="['fas', 'pen-to-square']"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </template>
                {{ t('common.edit') }}
              </NeButton>
              <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
            </div>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="props.rules.length"
          :page-size="pageSize"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :page-size-label="t('ne_table.show')"
          @select-page="
            (page: number) => {
              currentPage = page
            }"
          @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
        />
      </template>
    </NeTable>
  </div>
</template>
