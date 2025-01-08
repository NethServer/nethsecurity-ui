<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeButton, NeInlineNotification, NeLink } from '@nethesis/vue-components'
import { NeSkeleton, NeTooltip, NeDropdown, NeBadge } from '@nethesis/vue-components'
import { ref, type PropType, watch, computed, onMounted } from 'vue'
import NeTable from '@/components/standalone/NeTable.vue'
import { isEmpty } from 'lodash-es'
import { type FirewallRule, type RuleType } from '@/stores/standalone/firewall'
import SourceOrDestinationRuleColumn from './SourceOrDestinationRuleColumn.vue'
import { faGripVertical } from '@fortawesome/free-solid-svg-icons'
import { useHostSets } from '@/composables/useHostSets'
import { useDomainSets } from '@/composables/useDomainSets'

const props = defineProps({
  rules: {
    type: Array as PropType<FirewallRule[]>,
    required: true
  },
  rulesType: {
    type: String as PropType<RuleType>,
    required: true
  },
  textFilter: {
    type: String,
    required: true
  },
  loadingRules: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits([
  'reloadRules',
  'editRule',
  'duplicateRule',
  'deleteRule',
  'orderRules',
  'toggleRule'
])

const { t } = useI18n()
const { hostSets, listHostSets, loadingListHostSets, errorListHostSets, errorListHostSetsDetails } =
  useHostSets()
const {
  domainSets,
  listDomainSets,
  loadingListDomainSets,
  errorListDomainSets,
  errorListDomainSetsDetails
} = useDomainSets()

const internalRules = ref<FirewallRule[]>([])

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
const disabledRuleClasses = '!bg-[#fcfdfd] dark:!bg-[#18212f]'

const filteredRules = computed(() => {
  if (!props.textFilter) {
    // no filter
    return internalRules.value
  } else {
    // filter rules
    return internalRules.value.filter((rule) => searchStringInRule(rule, props.textFilter))
  }
})

// isEnable follows rule.enabled and rule.active_zone
function isEnabled(rule: FirewallRule): boolean {
  return !!rule.enabled && !!rule.active_zone
}

watch(
  () => props.rules,
  () => {
    internalRules.value = props.rules
  }
)

onMounted(() => {
  listHostSets()
  listDomainSets()
})

function drop(index: number): void {
  indexOver.value = undefined
  if (ruleDragged.value != undefined && ruleDragged.value != index) {
    if (ruleDragged.value - index < 0) {
      internalRules.value.splice(index - 1, 0, ...internalRules.value.splice(ruleDragged.value, 1))
    } else {
      internalRules.value.splice(index, 0, ...internalRules.value.splice(ruleDragged.value, 1))
    }
    emit('orderRules', internalRules.value)
  }
}

function getServiceText(rule: FirewallRule) {
  switch (rule.ns_service) {
    case '*':
      return t('common.any')
    case 'custom':
      return t(
        'standalone.firewall_rules.service_ports',
        {
          protocols: rule.proto.join('/').toUpperCase(),
          ports: rule.dest_port.join(', ')
        },
        rule.dest_port.length
      )
    default:
      return rule.ns_service
  }
}

function getRuleKebabMenuItems(rule: FirewallRule) {
  return [
    {
      id: 'enableOrDisable',
      label: rule.enabled ? t('common.disable') : t('common.enable'),
      iconStyle: 'fas',
      icon: rule.enabled ? 'circle-xmark' : 'circle-check',
      action: () => emit('toggleRule', rule)
    },
    {
      id: 'duplicate',
      label: t('standalone.firewall_rules.duplicate'),
      icon: 'copy',
      iconStyle: 'fas',
      action: () => emit('duplicateRule', rule)
    },
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
  if (!isEnabled(rule)) {
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
  <div>
    <!-- list host sets error notification -->
    <NeInlineNotification
      v-if="errorListHostSets"
      kind="error"
      :title="t('error.cannot_retrieve_host_sets')"
      :description="errorListHostSets"
      class="mb-5"
    >
      <template #details v-if="errorListHostSetsDetails">
        {{ errorListHostSetsDetails }}
      </template>
    </NeInlineNotification>
    <!-- list domain sets error notification -->
    <NeInlineNotification
      v-if="errorListDomainSets"
      kind="error"
      :title="t('error.cannot_retrieve_domain_sets')"
      :description="errorListDomainSets"
      class="mb-5"
    >
      <template #details v-if="errorListDomainSetsDetails">
        {{ errorListDomainSetsDetails }}
      </template>
    </NeInlineNotification>
    <!-- rules table -->
    <NeTable
      v-if="loadingRules || !isEmpty(filteredRules)"
      :data="filteredRules"
      :headers="headers"
      :style="'card'"
      class="!border-spacing-y-1"
    >
      <template #tbody>
        <tbody>
          <template v-if="loadingRules">
            <tr>
              <td :colspan="headers.length">
                <NeSkeleton :lines="8" size="lg" />
              </td>
            </tr>
          </template>
          <template v-else>
            <template v-for="(rule, index) in filteredRules" :key="rule.id">
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
              <!-- drop target disabled beacause of filter -->
              <tr v-else class="drop-target">
                <td :colspan="headers.length + 1"></td>
              </tr>
              <!-- rule -->
              <tr
                :class="{ 'opacity-30': ruleDragged == index }"
                :draggable="!textFilter"
                @dragend="ruleDragged = undefined"
                @dragstart="ruleDragged = index"
              >
                <!-- vertical grip -->
                <td
                  v-if="!textFilter"
                  :class="[
                    'cursor-move text-center hover:bg-opacity-50 hover:dark:bg-opacity-70',
                    !isEnabled(rule) ? disabledRuleClasses : ''
                  ]"
                >
                  <FontAwesomeIcon :icon="faGripVertical" />
                </td>
                <!-- cannot drag & drop rules with active text filter -->
                <td v-else :class="!isEnabled(rule) ? disabledRuleClasses : ''">
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
                <td :class="!isEnabled(rule) ? disabledRuleClasses : ''">
                  <div
                    class="flex items-center justify-between gap-2 border-r border-gray-200 pr-4 dark:border-gray-600"
                  >
                    <div>
                      <div :class="{ 'opacity-50': !isEnabled(rule) }">
                        {{ rule.name }}
                      </div>
                      <div v-if="!rule.active_zone">
                        <NeTooltip triggerEvent="mouseenter focus" placement="top-start">
                          <template #trigger>
                            <NeBadge
                              kind="warning"
                              size="xs"
                              class="mt-2"
                              :icon="['fas', 'triangle-exclamation']"
                              :text="t('standalone.firewall_rules.inactive')"
                            />
                          </template>
                          <template #content>
                            {{ t('standalone.firewall_rules.zone_no_longer_exists') }}
                          </template>
                        </NeTooltip>
                      </div>
                      <div v-else-if="!rule.enabled">
                        <NeTooltip triggerEvent="mouseenter focus" placement="top-start">
                          <template #trigger>
                            <NeBadge
                              kind="secondary"
                              size="xs"
                              class="mt-2"
                              :icon="['fas', 'circle-xmark']"
                              :text="t('common.disabled')"
                            />
                          </template>
                          <template #content>
                            {{ t('standalone.firewall_rules.disabled_rule') }}
                          </template>
                        </NeTooltip>
                      </div>
                    </div>
                    <!-- show details icon -->
                    <NeTooltip>
                      <template #trigger>
                        <NeLink>
                          <FontAwesomeIcon :icon="['fas', 'magnifying-glass-plus']" />
                        </NeLink>
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
                <td :class="!isEnabled(rule) ? disabledRuleClasses : ''">
                  <SourceOrDestinationRuleColumn
                    :rule="rule"
                    columnType="source"
                    :rulesType="rulesType"
                    :enabled="isEnabled(rule)"
                    :hostSets="hostSets"
                    :domainSets="domainSets"
                    :loadingObjects="loadingListHostSets || loadingListDomainSets"
                  />
                </td>
                <!-- destination -->
                <td :class="!isEnabled(rule) ? disabledRuleClasses : ''">
                  <SourceOrDestinationRuleColumn
                    :rule="rule"
                    columnType="destination"
                    :rulesType="rulesType"
                    :enabled="isEnabled(rule)"
                    :hostSets="hostSets"
                    :domainSets="domainSets"
                    :loadingObjects="loadingListHostSets || loadingListDomainSets"
                  />
                </td>
                <!-- service -->
                <td :class="!isEnabled(rule) ? disabledRuleClasses : ''">
                  <span :class="{ 'opacity-50': !isEnabled(rule) }">
                    {{ getServiceText(rule) }}
                  </span>
                </td>
                <!-- action -->
                <td :class="!isEnabled(rule) ? disabledRuleClasses : ''">
                  <span :class="['flex items-center gap-x-2', { 'opacity-50': !isEnabled(rule) }]">
                    <font-awesome-icon
                      :icon="['fas', getRuleActionIcon(rule.target)]"
                      :class="getRuleActionColor(rule)"
                    />
                    {{ rule.target }}
                  </span>
                </td>
                <td :class="!isEnabled(rule) ? disabledRuleClasses : ''">
                  <!-- edit and kebab menu -->
                  <div class="flex justify-end gap-2">
                    <NeButton kind="tertiary" @click="emit('editRule', rule)">
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
              indexOver == internalRules.length ? 'drop-over' : '',
              ruleDragged != undefined ? 'drop-active' : ''
            ]"
            class="drop-target"
            @dragenter="indexOver = internalRules.length"
            @dragleave="indexOver = undefined"
            @drop.prevent="drop(internalRules.length)"
            @dragover.prevent
          >
            <td :colspan="headers.length"></td>
          </tr>
        </tbody>
      </template>
    </NeTable>
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
