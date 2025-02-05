<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { Blocklist } from './BlocklistTab.vue'
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
</script>

<template>
  <NeTable
    :ariaLabel="t('standalone.threat_shield.blocklist')"
    cardBreakpoint="xl"
    :skeletonColumns="4"
    :skeletonRows="8"
    :loading="loading"
    class="z-10"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.threat_shield.name') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.threat_shield.type') }}</NeTableHeadCell>
      <NeTableHeadCell v-if="kind == 'dns'">
        {{ t('standalone.threat_shield.description') }}
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
        <NeTableCell :data-label="t('standalone.threat_shield.confidence')">
          <p v-if="item.confidence === -1">{{ t('standalone.threat_shield.unknown') }}</p>
          <div class="max-w-[10rem]" v-else>
            <div class="mb-2 flex flex-row">
              <div v-for="i in range(0, 10)" :key="i" class="flex grow basis-0 justify-center">
                <p class="text-xs font-semibold" v-if="i + 1 == item.confidence">
                  {{ item.confidence }}/10
                </p>
              </div>
            </div>
            <NeProgressBar
              color="custom"
              custom-color-classes="bg-gradient-to-r from-cyan-500 to-indigo-500"
              :progress="(item.confidence / 10) * 100"
              size="sm"
            />
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('common.status')">
          <NeToggle
            v-model="item.enabled"
            @change="
              () => {
                $emit('toggleBlocklist', item)
              }
            "
            :disabled="disableToggles || item.type === 'unknown'"
            :label="item.enabled ? t('common.enabled') : t('common.disabled')"
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
            }"
        @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
      />
    </template>
  </NeTable>
</template>
