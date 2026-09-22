<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeBadgeV2,
  NeButton,
  NeDropdown,
  NeLink,
  NeSkeleton,
  NeTooltip
} from '@nethesis/vue-components'
import NeTable from '@/components/standalone/NeTable.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faArrowRight,
  faBan,
  faCircleCheck,
  faClone,
  faCubes,
  faGlobe,
  faGripVertical,
  faPenToSquare,
  faSliders,
  faTrash,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import type { DpiRule, DpiRulePosition } from '@/composables/useDpiRules'
import { groupContentSummary, useApplicationGroups } from '@/composables/useApplicationGroups'

const {
  rules,
  loading = false,
  busy = false,
  canReorder = true
} = defineProps<{
  rules: DpiRule[]
  loading?: boolean
  busy?: boolean
  canReorder?: boolean
}>()

const emit = defineEmits<{
  edit: [rule: DpiRule]
  duplicate: [rule: DpiRule]
  delete: [rule: DpiRule]
  toggle: [rule: DpiRule]
  move: [rule: DpiRule, edge: DpiRulePosition]
  reorder: [movedId: string, targetIndex: number]
}>()

const { t } = useI18n()

const { data: applicationGroups } = useApplicationGroups()

const headers = [
  {
    key: 'grip'
  },
  {
    key: 'name',
    label: t('standalone.dpi.rule_name')
  },
  {
    key: 'source',
    label: t('standalone.dpi.source')
  },
  {
    key: 'match',
    label: t('standalone.dpi.match')
  },
  {
    key: 'action',
    label: t('standalone.dpi.action')
  },
  {
    key: 'actions'
  }
]

const disabledRuleClasses = 'bg-[#fcfdfd]! dark:bg-[#18212f]!'
const SKELETON_ROWS = 5

const draggedRule = ref<DpiRule>()
const indexOver = ref<number>()

const lastGapIndex = computed(() => {
  const last = rules[rules.length - 1]
  return last ? last.index + 1 : 0
})

function onDragEnd() {
  draggedRule.value = undefined
  indexOver.value = undefined
}

function drop(targetIndex: number) {
  const dragged = draggedRule.value
  onDragEnd()
  if (!dragged) {
    return
  }
  if (dragged.index === targetIndex || dragged.index + 1 === targetIndex) {
    return
  }
  emit('reorder', dragged.id, targetIndex)
}

function summaryOf(groupId: string): string | undefined {
  const group = applicationGroups.value?.find((candidate) => candidate.id === groupId)
  if (!group) {
    return undefined
  }
  return groupContentSummary(group)
    .map((part) => t(`standalone.dpi.${part.key}`, part.count))
    .join(', ')
}

function actionIcon(rule: DpiRule) {
  return rule.action === 'allow' ? faArrowRight : faBan
}

function actionColor(rule: DpiRule) {
  if (!rule.enabled) {
    return 'text-gray-500 dark:text-gray-400'
  }
  return rule.action === 'allow'
    ? 'text-green-700 dark:text-green-500'
    : 'text-rose-700 dark:text-rose-500'
}

function actionsOf(rule: DpiRule) {
  const items = [
    {
      id: 'toggle',
      label: rule.enabled ? t('common.disable') : t('common.enable'),
      icon: rule.enabled ? faBan : faCircleCheck,
      action: () => emit('toggle', rule)
    }
  ]

  if (rule.managed) {
    items.push({
      id: 'duplicate',
      label: t('common.duplicate'),
      icon: faClone,
      action: () => emit('duplicate', rule)
    })
  }

  return [
    ...items,
    {
      id: 'delete',
      label: t('common.delete'),
      icon: faTrash,
      danger: true,
      action: () => emit('delete', rule)
    }
  ]
}
</script>

<template>
  <div>
    <NeTable
      v-if="loading || rules.length"
      :data="rules"
      :headers="headers"
      :style="'card'"
      :aria-label="t('standalone.dpi.rules')"
      :class="['border-spacing-y-1!', busy ? 'pointer-events-none opacity-60' : '']"
    >
      <template #thead>
        <thead>
          <tr>
            <th
              v-for="header in headers"
              :key="header.key"
              scope="col"
              :class="{ 'w-px': header.key === 'grip' }"
              class="text-primary-neutral"
            >
              {{ header.label }}
            </th>
          </tr>
        </thead>
      </template>
      <template #tbody>
        <tbody>
          <template v-if="loading">
            <tr v-for="n in SKELETON_ROWS" :key="`skeleton-${n}`">
              <td :colspan="headers.length">
                <NeSkeleton :lines="1" size="lg" />
              </td>
            </tr>
          </template>
          <template v-else>
            <template v-for="rule in rules" :key="rule.id">
              <tr
                v-if="canReorder"
                :class="indexOver === rule.index ? 'drop-over' : ''"
                class="drop-target"
                @dragenter="indexOver = rule.index"
                @dragleave="indexOver = undefined"
                @dragover.prevent
                @drop.prevent="drop(rule.index)"
              >
                <td :colspan="headers.length"></td>
              </tr>
              <tr v-else class="drop-target">
                <td :colspan="headers.length"></td>
              </tr>
              <tr
                :class="{ 'opacity-30': draggedRule?.id === rule.id }"
                :draggable="canReorder"
                @dragstart="draggedRule = rule"
                @dragend="onDragEnd"
              >
                <td
                  :class="[
                    canReorder ? 'cursor-move' : '',
                    rule.enabled ? '' : disabledRuleClasses
                  ]"
                >
                  <div class="flex h-8 items-center">
                    <NeTooltip
                      v-if="!canReorder"
                      trigger-event="mouseenter focus"
                      placement="top-start"
                    >
                      <template #trigger>
                        <FontAwesomeIcon
                          :icon="faGripVertical"
                          class="cursor-not-allowed opacity-50"
                          aria-hidden="true"
                        />
                      </template>
                      <template #content>
                        {{ t('standalone.dpi.clear_filters_to_sort_rules') }}
                      </template>
                    </NeTooltip>
                    <FontAwesomeIcon v-else :icon="faGripVertical" aria-hidden="true" />
                  </div>
                </td>
                <td :class="[rule.enabled ? '' : disabledRuleClasses]">
                  <div
                    class="flex w-full flex-col gap-2 border-r border-gray-200 pr-4 dark:border-gray-600"
                  >
                    <span :class="{ 'opacity-50': !rule.enabled }" class="text-secondary-neutral">{{
                      rule.name
                    }}</span>
                    <div
                      v-if="!rule.enabled || !rule.managed"
                      class="flex flex-wrap items-start gap-2"
                    >
                      <NeBadgeV2 v-if="!rule.enabled" kind="gray" size="xs">
                        <FontAwesomeIcon :icon="faXmark" class="mr-1" aria-hidden="true" />
                        {{ t('common.disabled') }}
                      </NeBadgeV2>
                      <NeBadgeV2 v-if="!rule.managed" kind="indigo" size="xs">
                        <FontAwesomeIcon :icon="faSliders" class="mr-1" aria-hidden="true" />
                        {{ t('standalone.dpi.custom') }}
                      </NeBadgeV2>
                    </div>
                  </div>
                </td>
                <td :class="rule.enabled ? '' : disabledRuleClasses">
                  <NeTooltip
                    v-if="!rule.managed"
                    trigger-event="mouseenter focus"
                    placement="top-start"
                  >
                    <template #trigger>
                      <span
                        :class="[
                          'block max-w-xs truncate text-xs',
                          { 'opacity-50': !rule.enabled }
                        ]"
                      >
                        {{ rule.criteria }}
                      </span>
                    </template>
                    <template #content>
                      <span class="text-xs break-all">{{ rule.criteria }}</span>
                    </template>
                  </NeTooltip>
                  <template v-else>
                    <div v-if="rule.source.length" class="flex flex-col gap-1">
                      <span :class="{ 'opacity-50': !rule.enabled }" class="text-secondary-neutral">
                        {{ rule.source.slice(0, 2).join(', ') }}
                      </span>
                      <div v-if="rule.source.length > 2" class="flex items-center gap-2">
                        <span
                          :class="{ 'opacity-50': !rule.enabled }"
                          class="text-secondary-neutral"
                        >
                          {{ rule.source[2] }}
                        </span>
                        <NeTooltip
                          v-if="rule.source.length > 3"
                          trigger-event="mouseenter focus"
                          placement="top-start"
                        >
                          <template #trigger>
                            <span
                              class="text-sm font-medium text-primary-700 dark:text-primary-500"
                            >
                              {{
                                t('standalone.dpi.n_other_rules', { count: rule.source.length - 3 })
                              }}
                            </span>
                          </template>
                          <template #content>
                            <div class="flex flex-col gap-1">
                              <div v-for="source in rule.source.slice(3)" :key="source">
                                {{ source }}
                              </div>
                            </div>
                          </template>
                        </NeTooltip>
                      </div>
                    </div>
                    <span
                      v-else
                      :class="{ 'opacity-50': !rule.enabled }"
                      class="text-secondary-neutral"
                    >
                      {{ t('common.any') }}
                    </span>
                  </template>
                </td>
                <td :class="rule.enabled ? '' : disabledRuleClasses">
                  <NeTooltip
                    v-if="!rule.managed"
                    trigger-event="mouseenter focus"
                    placement="top-start"
                  >
                    <template #trigger>
                      <span
                        :class="[
                          'block max-w-xs truncate text-xs',
                          { 'opacity-50': !rule.enabled }
                        ]"
                      >
                        {{ rule.criteria }}
                      </span>
                    </template>
                    <template #content>
                      <span class="text-xs break-all">{{ rule.criteria }}</span>
                    </template>
                  </NeTooltip>
                  <div
                    v-else
                    :class="[
                      'flex flex-wrap items-center gap-x-4 gap-y-2',
                      { 'opacity-50': !rule.enabled }
                    ]"
                  >
                    <span v-if="rule.match_all" class="inline-flex items-center gap-2">
                      <FontAwesomeIcon :icon="faGlobe" class="h-4 w-4" aria-hidden="true" />
                      {{ t('standalone.dpi.match_type_all') }}
                    </span>
                    <template v-for="appgroup in rule.appgroups" v-else :key="appgroup.id">
                      <NeTooltip
                        v-if="summaryOf(appgroup.id)"
                        trigger-event="mouseenter focus"
                        placement="top-start"
                      >
                        <template #trigger>
                          <NeLink class="inline-flex items-center gap-2">
                            <FontAwesomeIcon :icon="faCubes" class="h-4 w-4" aria-hidden="true" />
                            {{ appgroup.name }}
                          </NeLink>
                        </template>
                        <template #content>
                          {{ summaryOf(appgroup.id) }}
                        </template>
                      </NeTooltip>
                      <span v-else class="inline-flex items-center gap-2">
                        <FontAwesomeIcon :icon="faCubes" class="h-4 w-4" aria-hidden="true" />
                        {{ appgroup.name }}
                      </span>
                    </template>
                    <span v-if="!rule.match_all && !rule.appgroups.length">-</span>
                  </div>
                </td>
                <td :class="rule.enabled ? '' : disabledRuleClasses">
                  <span
                    :class="[
                      'flex items-center gap-2 text-secondary-neutral',
                      { 'opacity-50': !rule.enabled }
                    ]"
                  >
                    <FontAwesomeIcon
                      :icon="actionIcon(rule)"
                      :class="actionColor(rule)"
                      aria-hidden="true"
                    />
                    {{
                      rule.action === 'allow'
                        ? t('standalone.dpi.allow')
                        : t('standalone.dpi.block')
                    }}
                  </span>
                </td>
                <td :class="rule.enabled ? '' : disabledRuleClasses">
                  <div class="flex items-center justify-end gap-2">
                    <NeButton kind="tertiary" @click="emit('edit', rule)">
                      <template #prefix>
                        <FontAwesomeIcon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
                      </template>
                      {{ t('common.edit') }}
                    </NeButton>
                    <NeDropdown :items="actionsOf(rule)" :align-to-right="true" />
                  </div>
                </td>
              </tr>
            </template>
            <tr
              v-if="canReorder"
              :class="indexOver === lastGapIndex ? 'drop-over' : ''"
              class="drop-target"
              @dragenter="indexOver = lastGapIndex"
              @dragleave="indexOver = undefined"
              @dragover.prevent
              @drop.prevent="drop(lastGapIndex)"
            >
              <td :colspan="headers.length"></td>
            </tr>
          </template>
        </tbody>
      </template>
    </NeTable>
  </div>
</template>

<style scoped>
@reference "@/assets/main.css";

tr.drop-target > td {
  @apply bg-transparent py-1;
}

tr.drop-over > td {
  @apply bg-cyan-100 py-7 dark:bg-cyan-900;
}
</style>
