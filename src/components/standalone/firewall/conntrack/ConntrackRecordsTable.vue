<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeBadgeV2
} from '@nethesis/vue-components'
import type { ConntrackRecord } from './ConntrackContent.vue'
import { ref } from 'vue'
import { byteFormat1024 } from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faBan, faMagnifyingGlassArrowRight, faTrash } from '@fortawesome/free-solid-svg-icons'
import type { ConntrackLabels } from '@/components/standalone/firewall/conntrack/ConntrackContent.vue'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
const { t } = useI18n()

const props = defineProps<{
  conntrackRecords: ConntrackRecord[]
}>()

const emit = defineEmits<{
  delete: [item: ConntrackRecord]
}>()

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.conntrackRecords, {
  itemsPerPage: pageSize
})

type BadgeKind = InstanceType<typeof NeBadgeV2>['$props']['kind']
type LabelBadge = {
  label: string
  kind: BadgeKind
  icon: IconDefinition
}

function badgeFromLabel(label: ConntrackLabels): LabelBadge | null {
  switch (label) {
    case 'netify-analyzed':
      return {
        label: t('standalone.conntrack.analyzed'),
        kind: 'blue',
        icon: faMagnifyingGlassArrowRight
      }
    case 'netify-block':
      return {
        label: t('standalone.conntrack.block'),
        kind: 'rose',
        icon: faBan
      }
    default:
      return null
  }
}
</script>

<template>
  <NeTable
    :aria-label="t('standalone.dns_dhcp.scan_conntrackRecords')"
    card-breakpoint="2xl"
    :skeleton-columns="5"
    :skeleton-rows="5"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.conntrack.source') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.destination') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.protocol') }}</NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('standalone.conntrack.download') }} / {{ t('standalone.conntrack.upload') }}
      </NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.state') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.timeout') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.id') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.conntrack.netifyd_labels') }}</NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.id">
        <NeTableCell :data-label="t('standalone.conntrack.source')">
          {{ item.source }}:{{ item.source_port }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.destination')">
          {{ item.destination }}:{{ item.destination_port }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.protocol')">
          {{ item.protocol.toUpperCase() }}
        </NeTableCell>
        <NeTableCell
          :data-label="`${t('standalone.conntrack.download')} / ${t(
            'standalone.conntrack.upload'
          )}`"
        >
          {{ byteFormat1024(Number(item.source_stats.bytes)) }} /
          {{ byteFormat1024(Number(item.destination_stats.bytes)) }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.state')">
          {{ item.state || '-' }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.timeout')">
          {{ item.timeout }} s
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.id')">
          {{ item.id }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.conntrack.netifyd_labels')">
          <span
            v-if="item.labels != undefined && item.labels.length > 0"
            class="flex flex-wrap gap-2"
          >
            <template v-for="label in item.labels" :key="label">
              <template v-if="badgeFromLabel(label) != null">
                <NeBadgeV2 :kind="badgeFromLabel(label)!.kind">
                  <FontAwesomeIcon
                    :icon="badgeFromLabel(label)!.icon"
                    aria-hidden="true"
                    class="size-4"
                  />
                  {{ badgeFromLabel(label)!.label }}
                </NeBadgeV2>
              </template>
            </template>
          </span>
          <template v-else>-</template>
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="align-center -ml-2.5 flex xl:ml-0 xl:justify-end">
            <NeButton kind="tertiary" @click="emit('delete', item)">
              <template #prefix>
                <FontAwesomeIcon :icon="faTrash" aria-hidden="true" class="h-4 w-4" />
              </template>
              {{ t('common.delete') }}
            </NeButton>
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.conntrackRecords.length"
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
</template>
