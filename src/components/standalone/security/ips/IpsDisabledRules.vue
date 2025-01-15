<script lang="ts" setup>
import IpsEnabledBadge from '@/components/standalone/security/ips/IpsEnabledBadge.vue'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeButton,
  NeDropdown,
  NeEmptyState,
  NeInlineNotification,
  NePaginator,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  useItemPagination,
  useSort
} from '@nethesis/vue-components'
import type { AxiosResponse } from 'axios'
import { faMagnifyingGlass, faShield, faXmarkCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import IpsDisableRuleDrawer from '@/components/standalone/security/ips/IpsDisableRuleDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

export type Rule = {
  description: string
  id: string
}

type ListRuleResponse = AxiosResponse<{
  rules: Rule[]
}>

const changes = useUciPendingChangesStore()

const { t } = useI18n()

const error = ref<Error>()
const loading = ref(false)
const rules = ref<Rule[]>([])

function listDisabledRules() {
  ubusCall('ns.snort', 'list-disabled-rules', {})
    .then((response: ListRuleResponse) => {
      rules.value = response.data.rules
    })
    .catch((reason) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  listDisabledRules()
})

const filter = ref('')
const filteredRules = computed((): Rule[] => {
  return rules.value.filter((rule) => {
    return rule.description.includes(filter.value) || rule.id.includes(filter.value)
  })
})

const sortKey = ref<keyof Rule>('id')
const sortDescending = ref(false)
const { sortedItems } = useSort(filteredRules, sortKey, sortDescending, {})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(sortedItems, {
  itemsPerPage: pageSize
})

// FIXME: when types from library are fixed, use proper type
const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}

const disablingRule = ref(false)
function handleSave() {
  listDisabledRules()
  changes.getChanges()
  disablingRule.value = false
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-lg">{{ t('standalone.ips.disabled_rules_description') }}</p>
      <IpsEnabledBadge />
    </div>

    <NeInlineNotification
      v-if="error"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('standalone.ips.error_loading_disabled_rules')"
      kind="error"
    />
    <NeSkeleton v-if="loading" :lines="10" />
    <div v-else class="space-y-4">
      <template v-if="rules.length > 0">
        <div class="flex flex-col flex-wrap justify-between gap-4 md:flex-row">
          <NeTextInput v-model="filter" :placeholder="t('common.filter')">
            <template #prefix>
              <FontAwesomeIcon :icon="faMagnifyingGlass" aria-hidden="true" class="h-4 w-4" />
            </template>
          </NeTextInput>
          <NeButton
            v-if="rules.length > 0"
            kind="secondary"
            size="lg"
            @click="disablingRule = true"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faXmarkCircle" aria-hidden="true" class="h-4 w-4" />
            </template>
            {{ t('standalone.ips.disable_rule') }}
          </NeButton>
        </div>
        <NeTable
          :ariaLabel="t('standalone.ips.rules_table')"
          :skeleton-columns="7"
          :skeleton-rows="5"
          :sortDescending="sortDescending"
          :sortKey="sortKey"
          card-breakpoint="xl"
        >
          <NeTableHead>
            <NeTableHeadCell column-key="description" sortable @sort="onSort">
              {{ t('standalone.ips.rule_description') }}
            </NeTableHeadCell>
            <NeTableHeadCell column-key="id" sortable @sort="onSort">
              {{ t('standalone.ips.rule_id') }}
            </NeTableHeadCell>
            <NeTableHeadCell>
              <!-- no header for actions -->
            </NeTableHeadCell>
          </NeTableHead>
          <NeTableBody>
            <NeTableRow v-for="item in paginatedItems" :key="`${item.id}`">
              <NeTableCell :data-label="t('standalone.ips.rule_description')">
                {{ item.description }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.ips.rule_id')">
                {{ item.id }}
              </NeTableCell>
              <NeTableCell :data-label="t('common.actions')">
                <div class="flex justify-end">
                  <NeDropdown :align-to-right="true" :items="{}" />
                </div>
              </NeTableCell>
            </NeTableRow>
          </NeTableBody>
          <template #paginator>
            <NePaginator
              :current-page="currentPage"
              :nav-pagination-label="t('ne_table.pagination')"
              :next-label="t('ne_table.go_to_next_page')"
              :page-size="pageSize"
              :page-size-label="t('ne_table.show')"
              :previous-label="t('ne_table.go_to_previous_page')"
              :range-of-total-label="t('ne_table.of')"
              :total-rows="rules.length"
              @selectPageSize="(size: number) => { pageSize = size }"
              @select-page="(page: number) => { currentPage = page }"
            />
          </template>
        </NeTable>
      </template>
      <NeEmptyState
        v-else
        :description="t('standalone.ips.no_disabled_rules_description')"
        :icon="faShield"
        :title="t('standalone.ips.no_disabled_rules')"
      >
        <NeButton kind="primary" size="lg" @click="disablingRule = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faXmarkCircle" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.ips.disable_rule') }}
        </NeButton>
      </NeEmptyState>
    </div>
    <IpsDisableRuleDrawer
      @save="handleSave"
      :visible="disablingRule"
      @close="disablingRule = false"
    />
  </div>
</template>
