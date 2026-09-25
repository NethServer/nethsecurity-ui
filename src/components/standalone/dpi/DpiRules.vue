<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeButton,
  NeDropdownFilter,
  NeEmptyState,
  NeInlineNotification,
  NeTextInput,
  type FilterOption
} from '@nethesis/vue-components'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { refDebounced } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import {
  faArrowRightLong,
  faCirclePlus,
  faMagnifyingGlass,
  faShield
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  DPI_RULES_KEY,
  moveRuleIdToEdge,
  reorderRuleIds,
  useDpiRules,
  type DpiRule,
  type DpiRulePosition,
  type ListRulesResponse
} from '@/composables/useDpiRules'
import { ubusCall } from '@/lib/standalone/ubus'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import DpiRulesTable from '@/components/standalone/dpi/DpiRulesTable.vue'
import CreateOrEditDpiRuleDrawer from '@/components/standalone/dpi/CreateOrEditDpiRuleDrawer.vue'
import DeleteDpiRuleModal from '@/components/standalone/dpi/DeleteDpiRuleModal.vue'
import RenameDpiRuleDrawer from '@/components/standalone/dpi/RenameDpiRuleDrawer.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const nameFilter = ref('')
const sourceFilter = ref<string[]>([])
const groupFilter = ref<string[]>([])
const actionFilter = ref<string[]>([])
const search = refDebounced(nameFilter, 400)

const { data: allRules, isLoading: isLoadingAll, isError, error } = useDpiRules()

const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()

function onRulesChanged() {
  return Promise.all([queryClient.invalidateQueries({ queryKey: DPI_RULES_KEY }), uci.getChanges()])
}

const { mutate: orderRules, isPending: isReordering } = useMutation({
  mutationFn: (order: string[]) => ubusCall<ListRulesResponse>('ns.dpi', 'order-rules', { order }),
  onSuccess: onRulesChanged
})

const { mutate: toggleRule } = useMutation({
  mutationFn: (payload: { id: string; enabled: boolean }) =>
    ubusCall<{ data: { message: string } }>(
      'ns.dpi',
      payload.enabled ? 'enable-rule' : 'disable-rule',
      { id: payload.id }
    ),
  onSuccess: onRulesChanged
})

const isFiltered = computed(
  () =>
    search.value.trim() !== '' ||
    sourceFilter.value.length > 0 ||
    groupFilter.value.length > 0 ||
    actionFilter.value.length > 0
)

const filteredRules = computed(() => {
  const name = search.value.trim().toLowerCase()

  return (allRules.value ?? []).filter((rule) => {
    if (name && !rule.name.toLowerCase().includes(name)) {
      return false
    }
    if (sourceFilter.value.length) {
      if (!rule.source.some((entry) => sourceFilter.value.includes(entry))) {
        return false
      }
    }
    if (groupFilter.value.length) {
      if (!rule.appgroups.some((appgroup) => groupFilter.value.includes(appgroup.id))) {
        return false
      }
    }
    if (actionFilter.value.length && !actionFilter.value.includes(rule.action)) {
      return false
    }
    return true
  })
})

const rules = computed<DpiRule[]>(() => filteredRules.value)
const isLoading = computed(() => isLoadingAll.value)
const hasRules = computed(() => rules.value.length > 0)
const hasNoRulesConfigured = computed(
  () => !isLoading.value && !isFiltered.value && !hasRules.value
)

const sourceFilterOptions = computed<FilterOption[]>(() => {
  const sources = new Set<string>()
  for (const rule of allRules.value ?? []) {
    for (const source of rule.source) {
      sources.add(source)
    }
  }
  return [...sources]
    .map((source) => ({ id: source, label: source }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const groupFilterOptions = computed<FilterOption[]>(() => {
  const byId = new Map<string, string>()
  for (const rule of allRules.value ?? []) {
    for (const appgroup of rule.appgroups) {
      byId.set(appgroup.id, appgroup.name)
    }
  }
  return [...byId.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const actionFilterOptions = computed<FilterOption[]>(() => [
  { id: 'block', label: t('standalone.dpi.block') },
  { id: 'allow', label: t('standalone.dpi.allow') }
])

const ruleToEdit = ref<DpiRule>()
const isDuplicating = ref(false)
const isShownRuleDrawer = ref(false)
const ruleToRename = ref<DpiRule>()
const isShownRenameDrawer = ref(false)
const ruleToDelete = ref<DpiRule>()
const isShownDeleteModal = ref(false)

function createRule() {
  ruleToEdit.value = undefined
  isDuplicating.value = false
  isShownRuleDrawer.value = true
}

// an unmanaged rule has nothing else to edit, only its name
function editRule(rule: DpiRule) {
  if (!rule.managed) {
    ruleToRename.value = rule
    isShownRenameDrawer.value = true
    return
  }

  ruleToEdit.value = rule
  isDuplicating.value = false
  isShownRuleDrawer.value = true
}

function duplicateRule(rule: DpiRule) {
  ruleToEdit.value = rule
  isDuplicating.value = true
  isShownRuleDrawer.value = true
}

function deleteRule(rule: DpiRule) {
  ruleToDelete.value = rule
  isShownDeleteModal.value = true
}

function onReorder(movedId: string, targetIndex: number) {
  orderRules(reorderRuleIds(allRules.value ?? [], movedId, targetIndex))
}

function onMove(rule: DpiRule, edge: DpiRulePosition) {
  orderRules(moveRuleIdToEdge(allRules.value ?? [], rule.id, edge))
}

function resetFilters() {
  nameFilter.value = ''
  sourceFilter.value = []
  groupFilter.value = []
  actionFilter.value = []
}

function goToApplicationGroups() {
  router.push(`${getStandaloneRoutePrefix(route)}/security/dpi?tab=application-groups`)
}
</script>

<template>
  <div>
    <NeInlineNotification
      v-if="isError"
      kind="error"
      :title="t('error.cannot_retrieve_dpi_rules')"
      :description="t(getAxiosErrorMessage(error))"
      class="mb-8"
    />
    <template v-if="hasNoRulesConfigured">
      <NeEmptyState
        :title="t('standalone.dpi.no_rules_configured')"
        :description="t('standalone.dpi.no_rules_configured_description')"
        :icon="faShield"
        class="text-center [&>div>div]:max-w-2xl"
      >
        <div class="flex flex-col items-center gap-5">
          <NeButton kind="primary" size="lg" @click="createRule">
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" />
            </template>
            {{ t('standalone.dpi.add_rule') }}
          </NeButton>
          <NeButton kind="tertiary" size="lg" @click="goToApplicationGroups">
            {{ t('standalone.dpi.go_to_application_group') }}
            <template #suffix>
              <FontAwesomeIcon :icon="faArrowRightLong" aria-hidden="true" />
            </template>
          </NeButton>
        </div>
      </NeEmptyState>
    </template>
    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p class="max-w-2xl text-sm leading-5 text-tertiary-neutral">
          {{ t('standalone.dpi.rules_evaluation_order') }}
        </p>
        <NeButton kind="primary" size="lg" @click="createRule">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" />
          </template>
          {{ t('standalone.dpi.add_rule') }}
        </NeButton>
      </div>
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <NeTextInput
          v-model="nameFilter"
          is-search
          :clear-search-label="t('common.clear_filter')"
          :placeholder="t('standalone.dpi.filter_rules')"
          class="w-sm"
        />
        <NeDropdownFilter
          v-model="sourceFilter"
          kind="checkbox"
          :label="t('standalone.dpi.source')"
          :options="sourceFilterOptions"
          :clear-search-label="t('ne_dropdown_filter.clear_search')"
          :clear-filter-label="t('ne_dropdown_filter.clear_filter')"
          :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
          :no-options-label="t('ne_dropdown_filter.no_options')"
          :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
        />
        <NeDropdownFilter
          v-model="groupFilter"
          kind="checkbox"
          :label="t('standalone.dpi.match')"
          :options="groupFilterOptions"
          :clear-search-label="t('ne_dropdown_filter.clear_search')"
          :clear-filter-label="t('ne_dropdown_filter.clear_filter')"
          :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
          :no-options-label="t('ne_dropdown_filter.no_options')"
          :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
        />
        <NeDropdownFilter
          v-model="actionFilter"
          kind="checkbox"
          :label="t('standalone.dpi.action')"
          :options="actionFilterOptions"
          :clear-search-label="t('ne_dropdown_filter.clear_search')"
          :clear-filter-label="t('ne_dropdown_filter.clear_filter')"
          :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
          :no-options-label="t('ne_dropdown_filter.no_options')"
          :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
        />
        <NeButton v-if="isFiltered" kind="tertiary" size="lg" @click="resetFilters">
          {{ t('common.reset_filters') }}
        </NeButton>
      </div>
      <NeEmptyState
        v-if="!isLoading && !hasRules"
        :title="t('standalone.dpi.no_rules_found')"
        :description="t('standalone.dpi.no_rules_found_description')"
        :icon="faMagnifyingGlass"
        class="text-center [&>div>div]:max-w-2xl"
      >
        <NeButton kind="tertiary" size="lg" @click="resetFilters">
          {{ t('common.reset_filters') }}
        </NeButton>
      </NeEmptyState>
    </template>
    <DpiRulesTable
      :rules="rules"
      :loading="isLoading"
      :busy="isReordering"
      :can-reorder="!isFiltered"
      @edit="editRule"
      @duplicate="duplicateRule"
      @delete="deleteRule"
      @toggle="(rule) => toggleRule({ id: rule.id, enabled: !rule.enabled })"
      @move="onMove"
      @reorder="onReorder"
    />
    <CreateOrEditDpiRuleDrawer
      :is-shown="isShownRuleDrawer"
      :rule-to-edit="ruleToEdit"
      :duplicate="isDuplicating"
      @close="isShownRuleDrawer = false"
      @save="isShownRuleDrawer = false"
    />
    <RenameDpiRuleDrawer
      :is-shown="isShownRenameDrawer"
      :rule="ruleToRename"
      @close="isShownRenameDrawer = false"
      @renamed="isShownRenameDrawer = false"
    />
    <DeleteDpiRuleModal
      :visible="isShownDeleteModal"
      :rule="ruleToDelete"
      @close="isShownDeleteModal = false"
      @deleted="isShownDeleteModal = false"
    />
  </div>
</template>
