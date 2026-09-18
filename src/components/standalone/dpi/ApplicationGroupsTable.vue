<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeBadgeV2,
  NeButton,
  NeDropdown,
  NePaginator,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTooltip
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faClone, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons'
import { groupContentSummary, type DpiApplicationGroup } from '@/composables/useApplicationGroups'
import type { DpiRule } from '@/composables/useDpiRules'

const {
  groups,
  rules = [],
  loading = false,
  currentPage,
  pageSize,
  totalRows
} = defineProps<{
  groups: DpiApplicationGroup[]
  rules?: DpiRule[]
  loading?: boolean
  currentPage: number
  pageSize: number
  totalRows: number
}>()

const emit = defineEmits<{
  edit: [group: DpiApplicationGroup]
  duplicate: [group: DpiApplicationGroup]
  delete: [group: DpiApplicationGroup]
  'select-page': [page: number]
  'select-page-size': [size: number]
}>()

const { t } = useI18n()

const ruleNamesMap = computed(() => {
  const map = new Map<string, string>()
  for (const rule of rules) {
    map.set(rule.id, rule.name)
  }
  return map
})

function contentOf(group: DpiApplicationGroup) {
  return groupContentSummary(group)
    .map((part) => t(`standalone.dpi.${part.key}`, part.count))
    .join(' · ')
}

function ruleNamesOf(matches: string[]): string[] {
  return matches
    .map((match) => {
      const ruleId = match.replace(/^dpi\//, '')
      return ruleNamesMap.value.get(ruleId) || ruleId
    })
    .sort()
}

function actionsOf(group: DpiApplicationGroup) {
  const items = [
    {
      id: 'duplicate',
      label: t('common.duplicate'),
      icon: faClone,
      action: () => emit('duplicate', group)
    }
  ]

  if (group.used) {
    return items
  }

  return [
    ...items,
    {
      id: 'delete',
      label: t('common.delete'),
      icon: faTrash,
      danger: true,
      action: () => emit('delete', group)
    }
  ]
}
</script>

<template>
  <NeTable
    :aria-label="t('standalone.dpi.application_groups')"
    card-breakpoint="xl"
    :loading="loading"
    :skeleton-rows="5"
  >
    <NeTableHead>
      <NeTableHeadCell>{{ t('common.name') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dpi.content') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.dpi.used_by_rules') }}</NeTableHeadCell>
      <NeTableHeadCell> </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="group in groups" :key="group.id">
        <NeTableCell :data-label="t('common.name')">
          {{ group.name }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dpi.content')">
          {{ contentOf(group) }}
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.dpi.used_by_rules')">
          <div v-if="group.used" class="flex flex-wrap items-center gap-2">
            <span class="inline-block">
              {{ ruleNamesOf(group.matches).slice(0, 3).join(', ') }}
            </span>
            <NeTooltip
              v-if="ruleNamesOf(group.matches).length > 3"
              trigger-event="mouseenter focus"
              placement="top-start"
            >
              <template #trigger>
                <span class="text-sm font-medium text-primary-700 dark:text-primary-500">
                  {{
                    t('standalone.dpi.n_other_rules', {
                      count: ruleNamesOf(group.matches).length - 3
                    })
                  }}
                </span>
              </template>
              <template #content>
                <div class="flex flex-col gap-1">
                  <div v-for="ruleName in ruleNamesOf(group.matches).slice(3)" :key="ruleName">
                    {{ ruleName }}
                  </div>
                </div>
              </template>
            </NeTooltip>
          </div>
          <NeBadgeV2 v-else kind="gray">
            {{ t('standalone.dpi.not_used') }}
          </NeBadgeV2>
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="-ml-2.5 flex items-center gap-1 xl:ml-0 xl:justify-end">
            <NeButton kind="tertiary" size="lg" @click="emit('edit', group)">
              <template #prefix>
                <FontAwesomeIcon :icon="faPenToSquare" class="size-4" aria-hidden="true" />
              </template>
              {{ t('common.edit') }}
            </NeButton>
            <NeDropdown :items="actionsOf(group)" :align-to-right="true" />
          </div>
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="totalRows"
        :page-size="pageSize"
        :nav-pagination-label="t('ne_table.pagination')"
        :next-label="t('ne_table.go_to_next_page')"
        :previous-label="t('ne_table.go_to_previous_page')"
        :range-of-total-label="t('ne_table.of')"
        :page-size-label="t('ne_table.show')"
        @select-page="(page: number) => emit('select-page', page)"
        @select-page-size="(size: number) => emit('select-page-size', size)"
      />
    </template>
  </NeTable>
</template>
