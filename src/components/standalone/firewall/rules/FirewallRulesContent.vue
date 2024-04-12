<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  type NeComboboxOption,
  NeButton,
  getAxiosErrorMessage,
  NeEmptyState,
  NeTextInput
} from '@nethesis/vue-components'
import { onMounted, ref, type PropType, watch, computed } from 'vue'
import CreateOrEditFirewallRuleDrawer from './CreateOrEditFirewallRuleDrawer.vue'
import { isEmpty, uniq } from 'lodash-es'
import { useFirewallStore, type FirewallRule, type RuleType } from '@/stores/standalone/firewall'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import DeleteFirewallRuleModal from './DeleteFirewallRuleModal.vue'
import FirewallRulesTable from './FirewallRulesTable.vue'

const props = defineProps({
  rulesType: {
    type: String as PropType<RuleType>,
    required: true
  }
})

const { t } = useI18n()
const firewallConfig = useFirewallStore()
const uciChangesStore = useUciPendingChangesStore()
const rules = ref<FirewallRule[]>([])
const currentRule = ref<FirewallRule | undefined>(undefined)
const isDuplicatingRule = ref(false)
const isShownCreateOrEditRuleDrawer = ref(false)
const isShownDeleteRuleModal = ref(false)
const knownTags = ref<NeComboboxOption[]>([])
const textFilter = ref('')

const loading = ref({
  listRules: false,
  orderRules: false,
  enableOrDisableRule: false
})

const error = ref({
  listRules: '',
  listRulesDetails: '',
  orderRules: '',
  orderRulesDetails: '',
  enableOrDisableRule: '',
  enableOrDisableRuleDetails: ''
})

const listRulesMethod = computed(() => {
  switch (props.rulesType) {
    case 'forward':
      return 'list-forward-rules'
    case 'input':
      return 'list-input-rules'
    default:
      return 'list-output-rules'
  }
})

const pageDescription = computed(() => {
  switch (props.rulesType) {
    case 'forward':
      return t('standalone.firewall_rules.forward_rules_description')
    case 'input':
      return t('standalone.firewall_rules.input_rules_description')
    default:
      return t('standalone.firewall_rules.output_rules_description')
  }
})

const addRuleLabel = computed(() => {
  switch (props.rulesType) {
    case 'forward':
      return t('standalone.firewall_rules.add_forward_rule')
    case 'input':
      return t('standalone.firewall_rules.add_input_rule')
    default:
      return t('standalone.firewall_rules.add_output_rule')
  }
})

const emptyStateTitle = computed(() => {
  switch (props.rulesType) {
    case 'forward':
      return t('standalone.firewall_rules.no_forward_rule')
    case 'input':
      return t('standalone.firewall_rules.no_input_rule')
    default:
      return t('standalone.firewall_rules.no_output_rule')
  }
})

const filteredRules = computed(() => {
  if (!textFilter.value) {
    // no filter
    return rules.value
  } else {
    // filter rules
    return rules.value.filter((rule) => searchStringInRule(rule, textFilter.value))
  }
})

watch(
  () => props.rulesType,
  () => {
    loadData()
  }
)

onMounted(() => {
  loadData()
})

async function loadData() {
  listRules()
  firewallConfig.fetch()
  uciChangesStore.getChanges()
}

async function listRules() {
  loading.value.listRules = true
  rules.value = []
  error.value.listRules = ''
  error.value.listRulesDetails = ''

  try {
    const res = await ubusCall('ns.firewall', listRulesMethod.value)
    rules.value = res.data.rules

    const tags = uniq(rules.value.map((rule) => rule.ns_tag).flat())
    knownTags.value = tags.map((tag) => {
      return {
        id: tag,
        label: tag
      }
    })
  } catch (err: any) {
    console.error(err)
    error.value.listRules = t(getAxiosErrorMessage(err))
    error.value.listRulesDetails = err.toString()
  } finally {
    loading.value.listRules = false
  }
}

async function orderRules(rules: FirewallRule[]) {
  loading.value.orderRules = true
  error.value.orderRules = ''
  error.value.orderRulesDetails = ''

  try {
    await ubusCall('ns.firewall', 'order-rules', {
      order: rules.map((rule) => rule.id),
      type: props.rulesType
    })

    uciChangesStore.getChanges()
  } catch (err: any) {
    console.error(err)
    error.value.orderRules = t(getAxiosErrorMessage(err))
    error.value.orderRulesDetails = err.toString()
  } finally {
    loading.value.orderRules = false
  }
}

async function toggleRule(rule: FirewallRule) {
  loading.value.enableOrDisableRule = true
  error.value.enableOrDisableRule = ''
  error.value.enableOrDisableRuleDetails = ''

  const apiMethod = rule.enabled ? 'disable-rule' : 'enable-rule'

  try {
    await ubusCall('ns.firewall', apiMethod, {
      id: rule.id
    })
    loadData()
  } catch (err: any) {
    console.error(err)
    error.value.enableOrDisableRule = t(getAxiosErrorMessage(err))
    error.value.enableOrDisableRuleDetails = err.toString()
  } finally {
    loading.value.enableOrDisableRule = false
  }
}

function showCreateRuleDrawer() {
  currentRule.value = undefined
  isDuplicatingRule.value = false
  isShownCreateOrEditRuleDrawer.value = true
}

function showEditRuleDrawer(rule: FirewallRule) {
  currentRule.value = rule
  isDuplicatingRule.value = false
  isShownCreateOrEditRuleDrawer.value = true
}

function showDuplicateRuleDrawer(rule: FirewallRule) {
  currentRule.value = rule
  isDuplicatingRule.value = true
  isShownCreateOrEditRuleDrawer.value = true
}

function showDeleteRuleModal(rule: FirewallRule) {
  currentRule.value = rule
  isShownDeleteRuleModal.value = true
}

function hideCreateOrEditRuleDrawer() {
  isShownCreateOrEditRuleDrawer.value = false
}

function searchStringInRule(rule: FirewallRule, queryText: string) {
  const regex = /[^a-zA-Z0-9]/g
  queryText = queryText.replace(regex, '')
  let found = false

  // search in string attributes
  found = ['name', 'src', 'dest', 'ns_service', 'target'].some((attrName) => {
    const attrValue = rule[attrName as keyof FirewallRule] as string
    return new RegExp(queryText, 'i').test(attrValue?.replace(regex, ''))
  })

  if (found) {
    return true
  }

  // search in source addresses
  found = !!rule.src_ip?.some((addr) => {
    return Object.values(addr).some((value) => {
      return new RegExp(queryText, 'i').test(value?.replace(regex, ''))
    })
  })

  if (found) {
    return true
  }

  // search in destination addresses
  found = !!rule.dest_ip?.some((addr) => {
    return Object.values(addr).some((value) => {
      return new RegExp(queryText, 'i').test(value?.replace(regex, ''))
    })
  })

  if (found) {
    return true
  }

  // search in array attributes
  found = ['proto', 'dest_port', 'ns_tag'].some((attrName) => {
    const attrValue = rule[attrName as keyof FirewallRule] as string[]

    return attrValue?.some((value) => {
      return new RegExp(queryText, 'i').test(value?.replace(regex, ''))
    })
  })

  if (found) {
    return true
  }
  return false
}
</script>

<template>
  <div class="text-sm">
    <div class="mb-8 flex items-start justify-between">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ pageDescription }}
      </div>
      <NeButton
        v-if="loading.listRules || rules.length"
        kind="secondary"
        size="lg"
        @click="showCreateRuleDrawer"
        class="ml-6 shrink-0"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
        </template>
        {{ addRuleLabel }}</NeButton
      >
    </div>
    <!-- listRules error notification -->
    <NeInlineNotification
      v-if="error.listRules"
      kind="error"
      :title="t('error.cannot_retrieve_firewall_rules')"
      :description="error.listRules"
      class="mb-5"
    >
      <template #details v-if="error.listRulesDetails">
        {{ error.listRulesDetails }}
      </template>
    </NeInlineNotification>
    <!-- enableOrDisableRule error notification -->
    <NeInlineNotification
      v-if="error.enableOrDisableRule"
      kind="error"
      :title="t('error.cannot_enable_or_disable_firewall_rule')"
      :description="error.enableOrDisableRule"
      class="mb-5"
    >
      <template #details v-if="error.enableOrDisableRuleDetails">
        {{ error.enableOrDisableRuleDetails }}
      </template>
    </NeInlineNotification>
    <!-- orderRules error notification -->
    <NeInlineNotification
      v-if="error.orderRules"
      kind="error"
      :title="t('error.cannot_reorder_firewall_rules')"
      :description="error.orderRules"
      class="mb-5"
    >
      <template #details v-if="error.orderRulesDetails">
        {{ error.orderRulesDetails }}
      </template>
    </NeInlineNotification>
    <template v-else>
      <!-- no error -->
      <!-- text filter -->
      <div class="mb-5 flex items-center gap-4">
        <NeTextInput
          :placeholder="t('standalone.firewall_rules.filter_rules')"
          v-model.trim="textFilter"
          :disabled="loading.listRules"
          class="max-w-xs"
        />
        <NeButton
          kind="tertiary"
          @click="textFilter = ''"
          :disabled="loading.listRules || !textFilter"
        >
          {{ t('standalone.firewall_rules.clear_filter') }}
        </NeButton>
      </div>
      <!-- empty state -->
      <template v-if="!loading.listRules && isEmpty(rules)">
        <NeEmptyState :title="emptyStateTitle" :icon="['fas', 'block-brick-fire']" class="mt-4">
          <NeButton kind="primary" size="lg" @click="showCreateRuleDrawer">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
            </template>
            {{ addRuleLabel }}</NeButton
          >
        </NeEmptyState>
      </template>
      <!-- no rule matching filter -->
      <template v-else-if="!loading.listRules && isEmpty(filteredRules)">
        <NeEmptyState
          :title="t('standalone.firewall_rules.no_rule_found')"
          :description="t('standalone.firewall_rules.try_changing_search_filter')"
          :icon="['fas', 'circle-info']"
          class="mt-4"
        >
          <NeButton kind="tertiary" @click="textFilter = ''">
            {{ t('standalone.firewall_rules.clear_filter') }}</NeButton
          >
        </NeEmptyState>
      </template>
      <!-- rules -->
      <FirewallRulesTable
        :rulesType="rulesType"
        :rules="rules"
        :textFilter="textFilter"
        :loadingRules="loading.listRules"
        @reloadRules="loadData"
        @editRule="showEditRuleDrawer"
        @duplicateRule="showDuplicateRuleDrawer"
        @deleteRule="showDeleteRuleModal"
        @orderRules="orderRules"
        @toggleRule="toggleRule"
      />
    </template>
    <!-- create/edit rule drawer -->
    <CreateOrEditFirewallRuleDrawer
      :ruleType="rulesType"
      :currentRule="currentRule"
      :isDuplicatingRule="isDuplicatingRule"
      :isShown="isShownCreateOrEditRuleDrawer"
      :knownTags="knownTags"
      @close="hideCreateOrEditRuleDrawer"
      @reloadData="loadData"
    />
    <!-- delete rule modal -->
    <DeleteFirewallRuleModal
      :visible="isShownDeleteRuleModal"
      :rule="currentRule"
      @close="isShownDeleteRuleModal = false"
      @reloadData="loadData"
    />
  </div>
</template>
