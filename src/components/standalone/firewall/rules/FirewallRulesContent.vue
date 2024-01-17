<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeEmptyState,
  getAxiosErrorMessage,
  NeDropdown,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import {
  NeInlineNotification,
  NeSkeleton,
  NeTooltip,
  NeComboboxOption
} from '@nethesis/vue-components'
import { onMounted, ref, type PropType, watch, computed } from 'vue'
import NeTable from '@/components/standalone/NeTable.vue'
import CreateOrEditFirewallRuleDrawer from './CreateOrEditFirewallRuleDrawer.vue'
import { isEmpty, uniq } from 'lodash-es'
import { useFirewallStore, type FirewallRule, type RuleType } from '@/stores/standalone/firewall'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import SourceOrDestinationRuleColumn from './SourceOrDestinationRuleColumn.vue'
import { faGripVertical } from '@fortawesome/free-solid-svg-icons'
import DeleteFirewallRuleModal from './DeleteFirewallRuleModal.vue'

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

const headers = [
  {
    key: 'vertical-grip'
  },
  {
    label: t('standalone.firewall_rules.name'),
    key: 'name'
  },
  {
    label: t('standalone.firewall_rules.source'),
    key: 'source'
  },
  {
    label: t('standalone.firewall_rules.destination'),
    key: 'destination'
  },
  {
    label: t('standalone.firewall_rules.service'),
    key: 'service'
  },
  {
    label: t('standalone.firewall_rules.action'),
    key: 'action'
  }
]

const ruleDragged = ref<number>()
const indexOver = ref<number>()

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

function drop(index: number): void {
  indexOver.value = undefined
  if (ruleDragged.value != undefined && ruleDragged.value != index) {
    if (ruleDragged.value - index < 0) {
      rules.value.splice(index - 1, 0, ...rules.value.splice(ruleDragged.value, 1))
    } else {
      rules.value.splice(index, 0, ...rules.value.splice(ruleDragged.value, 1))
    }
    orderRules()
  }
}

async function orderRules() {
  loading.value.orderRules = true
  error.value.orderRules = ''
  error.value.orderRulesDetails = ''

  try {
    await ubusCall('ns.firewall', 'order-rules', {
      order: rules.value.map((rule) => rule.id),
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

function getServiceText(rule: FirewallRule) {
  if (rule.ns_service) {
    return rule.ns_service
  } else {
    let portsText = ''
    portsText = rule.dest_port.join(', ')

    return t(
      'standalone.firewall_rules.service_ports',
      {
        protocols: rule.proto.join('/').toUpperCase(),
        ports: portsText
      },
      rule.dest_port.length
    )
  }
}

function getRuleKebabMenuItems(rule: FirewallRule) {
  return [
    {
      id: 'enableOrDisable',
      label: rule.enabled ? t('common.disable') : t('common.enable'),
      iconStyle: 'fas',
      icon: rule.enabled ? 'circle-xmark' : 'circle-check',
      action: () => toggleRule(rule)
    },
    {
      id: 'duplicate',
      label: t('standalone.firewall_rules.duplicate'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => showDuplicateRuleDrawer(rule)
    },
    {
      id: 'delete',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      action: () => showDeleteRuleModal(rule),
      danger: true
    }
  ]
}

function getRuleActionIcon(ruleTarget: string) {
  switch (ruleTarget) {
    case 'ACCEPT':
      return 'arrow-right'
    case 'DROP':
    case 'REJECT':
      return 'ban'
    default:
      return 'circle-question'
  }
}

function getRuleActionColor(rule: FirewallRule) {
  if (!rule.enabled) {
    return 'text-gray-500 dark:text-gray-400'
  }

  switch (rule.target) {
    case 'ACCEPT':
      return 'text-green-700 dark:text-green-500'
    case 'DROP':
    case 'REJECT':
      return 'text-rose-700 dark:text-rose-500'
    default:
      return ''
  }
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
    <template v-else>
      <!-- no error -->
      <!-- text filter -->
      <div class="mb-2 flex items-center gap-4">
        <NeTextInput
          :placeholder="t('standalone.firewall_rules.filter_rules')"
          v-model.trim="textFilter"
          :disabled="loading.listRules"
          class="max-w-xs"
        />
        <NeButton kind="tertiary" @click="textFilter = ''" :disabled="loading.listRules">
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
      <NeTable
        v-if="loading.listRules || !isEmpty(filteredRules)"
        :data="filteredRules"
        :headers="headers"
        :style="'card'"
      >
        <template #tbody>
          <tbody>
            <template v-if="loading.listRules">
              <tr>
                <td :colspan="headers.length">
                  <NeSkeleton :lines="8" size="lg" />
                </td>
              </tr>
            </template>
            <template v-else>
              <template v-for="(rule, index) in filteredRules" :key="rule.key">
                <!-- drop target -->
                <tr
                  v-if="!textFilter"
                  :class="[
                    indexOver == index ? 'drop-over drop-target' : '',
                    ruleDragged != undefined ? 'drop-active' : ''
                  ]"
                  class="drop-target"
                  @dragenter="indexOver = index"
                  @dragleave="indexOver = undefined"
                  @drop.prevent="drop(index)"
                  @dragover.prevent
                >
                  <td :colspan="headers.length + 1"></td>
                </tr>
                <tr
                  :class="{ 'opacity-30': ruleDragged == index }"
                  :draggable="!textFilter"
                  @dragend="ruleDragged = undefined"
                  @dragstart="ruleDragged = index"
                >
                  <!-- vertical grip -->
                  <td
                    v-if="!textFilter"
                    class="cursor-move text-center hover:bg-opacity-50 hover:dark:bg-opacity-70"
                  >
                    <FontAwesomeIcon :icon="faGripVertical" />
                  </td>
                  <!-- cannot drag & drop rules with active text filter -->
                  <td v-else>
                    <NeTooltip triggerEvent="mouseenter focus" placement="top-start">
                      <template #trigger>
                        <FontAwesomeIcon
                          :icon="faGripVertical"
                          class="cursor-not-allowed opacity-50"
                        />
                      </template>
                      <template #content>
                        {{ t('standalone.firewall_rules.clear_filter_to_sort_rules') }}
                      </template>
                    </NeTooltip>
                  </td>
                  <!-- name -->
                  <td>
                    <div
                      class="flex items-center justify-between gap-2 border-r border-gray-200 pr-4 dark:border-gray-600"
                    >
                      <div>
                        <div :class="{ 'opacity-50': !rule.enabled }">
                          {{ rule.name }}
                        </div>
                        <div v-if="!rule.enabled" class="mt-2 opacity-50">
                          <font-awesome-icon
                            :icon="['fas', 'circle-xmark']"
                            class="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          <span>{{ t('common.disabled') }}</span>
                        </div>
                      </div>
                      <!-- show details icon -->
                      <NeTooltip>
                        <template #trigger>
                          <FontAwesomeIcon
                            :icon="['fas', 'magnifying-glass-plus']"
                            class="text-primary-700 dark:text-primary-500"
                          />
                        </template>
                        <template #content>
                          <div>
                            <span> {{ t('standalone.firewall_rules.tags') }}: </span>
                            <span>{{ rule.ns_tag?.join(', ') || '-' }}</span>
                          </div>
                          <div>
                            <span> {{ t('standalone.firewall_rules.logging') }}: </span>
                            <span>{{ rule.log ? t('common.enabled') : t('common.disabled') }}</span>
                          </div>
                        </template>
                      </NeTooltip>
                    </div>
                  </td>
                  <!-- source -->
                  <td>
                    <SourceOrDestinationRuleColumn
                      :rule="rule"
                      columnType="source"
                      :rulesType="rulesType"
                      :enabled="rule.enabled"
                    />
                  </td>
                  <!-- destination -->
                  <td>
                    <SourceOrDestinationRuleColumn
                      :rule="rule"
                      columnType="destination"
                      :rulesType="rulesType"
                      :enabled="rule.enabled"
                    />
                  </td>
                  <!-- service -->
                  <td>
                    <span :class="{ 'opacity-50': !rule.enabled }">
                      {{ getServiceText(rule) }}
                    </span>
                  </td>
                  <!-- action -->
                  <td>
                    <span :class="['flex items-center gap-x-2', { 'opacity-50': !rule.enabled }]">
                      <font-awesome-icon
                        :icon="['fas', getRuleActionIcon(rule.target)]"
                        :class="getRuleActionColor(rule)"
                      />
                      {{ t(`standalone.firewall_rules.${rule.target.toLowerCase()}`) }}
                    </span>
                  </td>
                  <td>
                    <!-- edit and kebab menu -->
                    <div class="flex">
                      <NeButton kind="tertiary" @click="showEditRuleDrawer(rule)">
                        <template #prefix>
                          <font-awesome-icon
                            :icon="['fas', 'pen-to-square']"
                            class="h-4 w-4"
                            aria-hidden="true"
                          />
                        </template>
                        {{ t('common.edit') }}
                      </NeButton>
                      <NeDropdown :items="getRuleKebabMenuItems(rule)" :alignToRight="true" />
                    </div>
                  </td>
                </tr>
              </template>
            </template>
            <tr
              :class="[
                indexOver == rules.length ? 'drop-over' : '',
                ruleDragged != undefined ? 'drop-active' : ''
              ]"
              class="drop-target"
              @dragenter="indexOver = rules.length"
              @dragleave="indexOver = undefined"
              @drop.prevent="drop(rules.length)"
              @dragover.prevent
            >
              <td :colspan="headers.length"></td>
            </tr>
          </tbody>
        </template>
      </NeTable>
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

<style scoped>
tr.drop-target > td {
  @apply bg-transparent py-1;
}

tr.drop-over > td {
  @apply bg-primary-900 py-7;
}
</style>
