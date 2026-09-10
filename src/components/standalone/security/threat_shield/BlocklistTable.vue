<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { Blocklist, BlocklistDirection } from './BlocklistTab.vue'
import { useI18n } from 'vue-i18n'
import {
  NeProgressBar,
  NeToggle,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import { range } from 'lodash-es'
import { ref } from 'vue'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faArrowDown, faArrowRightArrowLeft, faArrowUp } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
  blocklists: Blocklist[]
  disableToggles: boolean
  kind: 'ip' | 'dns'
  loading?: boolean
}>()

defineEmits<{
  toggleBlocklist: [item: Blocklist]
}>()

const { t, te } = useI18n()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.blocklists, {
  itemsPerPage: pageSize
})

function getTypeLabel(item: Blocklist) {
  switch (item.type) {
    case 'community':
      return t('standalone.threat_shield.community')
    case 'enterprise':
      return t('standalone.threat_shield.enterprise')
    default:
      return t('standalone.threat_shield.unknown')
  }
}

function getTypeIcon(item: Blocklist) {
  switch (item.type) {
    case 'community':
      return 'users'
    case 'enterprise':
      return 'award'
    default:
      return 'warning'
  }
}

function getBlocklistName(blocklist: Blocklist) {
  return props.kind === 'ip' ? blocklist.description : blocklist.name
}

type DirectionIcon = {
  icon: IconDefinition
  rotationClass: string
}

const directionIcons: Record<BlocklistDirection, DirectionIcon> = {
  in: { icon: faArrowDown, rotationClass: 'rotate-45' },
  out: { icon: faArrowUp, rotationClass: 'rotate-45' },
  inout: { icon: faArrowRightArrowLeft, rotationClass: '-rotate-45' }
}

function getDirectionLabel(item: Blocklist) {
  switch (item.direction) {
    case 'in':
      return t('standalone.threat_shield.direction_in')
    case 'out':
      return t('standalone.threat_shield.direction_out')
    case 'inout':
      return t('standalone.threat_shield.direction_inout')
    default:
      return '-'
  }
}

function getPortsLabel(item: Blocklist) {
  return item.ports?.length ? item.ports.join(', ') : '-'
}
</script>

<template>
  <NeTable
    :aria-label="t('standalone.threat_shield.blocklist')"
    card-breakpoint="xl"
    :skeleton-columns="kind == 'ip' ? 6 : 4"
    :skeleton-rows="8"
    :loading="loading"
    class="z-10"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.threat_shield.name') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.threat_shield.type') }}</NeTableHeadCell>
      <NeTableHeadCell v-if="kind == 'dns'">
        {{ t('standalone.threat_shield.description') }}
      </NeTableHeadCell>
      <NeTableHeadCell v-if="kind == 'ip'">
        {{ t('standalone.threat_shield.direction') }}
      </NeTableHeadCell>
      <NeTableHeadCell v-if="kind == 'ip'">
        {{ t('standalone.threat_shield.ports') }}
      </NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.threat_shield.confidence') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('common.status') }}</NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.name">
        <NeTableCell :data-label="t('standalone.threat_shield.name')">
          <p>{{ getBlocklistName(item) }}</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.threat_shield.type')">
          <div class="flex flex-row items-center gap-x-2">
            <FontAwesomeIcon :icon="['fas', getTypeIcon(item)]" class="h-5 w-5" />
            <p>
              {{ getTypeLabel(item) }}
            </p>
          </div>
        </NeTableCell>
        <NeTableCell v-if="kind == 'dns'" :data-label="t('standalone.threat_shield.description')">
          {{
            te(`standalone.threat_shield_dns.description_${item.name}`)
              ? t(`standalone.threat_shield_dns.description_${item.name}`)
              : item.description
          }}
        </NeTableCell>
        <NeTableCell v-if="kind == 'ip'" :data-label="t('standalone.threat_shield.direction')">
          <div class="flex flex-row items-center gap-x-2">
            <FontAwesomeIcon
              v-if="item.direction && directionIcons[item.direction]"
              :icon="directionIcons[item.direction].icon"
              :class="directionIcons[item.direction].rotationClass"
              class="h-4 w-4 text-gray-700 dark:text-gray-400"
              aria-hidden="true"
            />
            <p>{{ getDirectionLabel(item) }}</p>
          </div>
        </NeTableCell>
        <NeTableCell v-if="kind == 'ip'" :data-label="t('standalone.threat_shield.ports')">
          <p>{{ getPortsLabel(item) }}</p>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.threat_shield.confidence')">
          <p v-if="item.confidence === -1">{{ t('standalone.threat_shield.unknown') }}</p>
          <div v-else class="max-w-40">
            <div class="mb-2 flex flex-row">
              <div v-for="i in range(0, 10)" :key="i" class="flex grow basis-0 justify-center">
                <p v-if="i + 1 == item.confidence" class="text-xs font-semibold">
                  {{ item.confidence }}/10
                </p>
              </div>
            </div>
            <NeProgressBar
              color="custom"
              custom-color-classes="bg-linear-to-r from-cyan-500 to-indigo-500"
              :progress="(item.confidence / 10) * 100"
              size="sm"
            />
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('common.status')">
          <NeToggle
            v-model="item.enabled"
            :disabled="disableToggles || item.type === 'unknown'"
            :label="item.enabled ? t('common.enabled') : t('common.disabled')"
            @change="
              () => {
                $emit('toggleBlocklist', item)
              }
            "
          />
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.blocklists.length"
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
