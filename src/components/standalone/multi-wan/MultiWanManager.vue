<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { reactive, ref } from 'vue'
import type { Rule } from '@/composables/useMwanConfig'
import { useMwanConfig } from '@/composables/useMwanConfig'
import { NeButton, NeSideDrawer, NeSkeleton } from '@nethserver/vue-tailwind-lib'
import PolicyManager from '@/components/standalone/multi-wan/PolicyManager.vue'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons'
import RuleManager from '@/components/standalone/multi-wan/RuleManager.vue'
import PolicyCreator from '@/components/standalone/multi-wan/PolicyCreator.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import RuleCreator from '@/components/standalone/multi-wan/RuleCreator.vue'
import RuleEditor from '@/components/standalone/multi-wan/RuleEditor.vue'

const { t } = useI18n()

const mwanConfig = reactive(useMwanConfig())
const uciPendingChangesStore = useUciPendingChangesStore()

const createPolicy = ref(false)
const createRule = ref(false)
const editRule = ref<Rule>()

/**
 * Due to the component nature of the RuleManager, there's no way to notify the component of a change unless refactoring
 * the component. This variable is keyed to RuleManager so, when it gets updated, triggers a redraw of the component.
 */
const ruleTimestamp = ref(Date.now())

/**
 * Handler for policyCreated event.
 */
function policyCreatedHandler() {
  createPolicy.value = false
  reloadConfig()
}

/**
 * Handler for the ruleCreated event.
 */
function ruleCreatedHandler() {
  createRule.value = false
  reloadConfig()
}

/**
 * Rule Created Handler
 */
function ruleEditedHandler() {
  editRule.value = undefined
  reloadConfig()
}

function reloadConfig() {
  mwanConfig.fetch()
  ruleTimestamp.value = Date.now()
  uciPendingChangesStore.getChanges()
}
</script>

<template>
  <NeSkeleton v-if="mwanConfig.loading" :lines="10" />
  <div v-else class="space-y-16">
    <div class="space-y-8">
      <div class="flex">
        <div>
          <h6 class="mb-2 text-xl font-medium text-gray-900 dark:text-gray-50">
            {{ t('standalone.multi_wan.policy') }}
          </h6>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('standalone.multi_wan.policy_description') }}
          </p>
        </div>
        <NeButton
          v-if="mwanConfig.policies.length >= 1"
          :kind="'secondary'"
          class="ml-auto self-start"
          @click="createPolicy = true"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" />
          </template>
          {{ t('standalone.multi_wan.create_policy') }}
        </NeButton>
      </div>
      <div class="space-y-6">
        <NeSkeleton v-if="mwanConfig.loading" :lines="3" :size="'sm'" />
        <template v-else-if="mwanConfig.policies.length > 0">
          <PolicyManager
            v-for="(policy, index) in mwanConfig.policies"
            :key="index"
            :policy="policy"
          />
        </template>
        <HorizontalCard v-else class="space-y-4 text-center">
          <p>{{ t('standalone.multi_wan.no_policy_found') }}</p>
          <NeButton :kind="'primary'" @click="createPolicy = true">
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" />
            </template>
            {{ t('standalone.multi_wan.create_default_policy') }}
          </NeButton>
        </HorizontalCard>
      </div>
    </div>
    <div v-if="mwanConfig.policies.length > 0">
      <div class="space-y-6">
        <div class="flex">
          <div>
            <h6 class="mb-2 text-xl font-medium text-gray-900 dark:text-gray-50">
              {{ t('standalone.multi_wan.rules') }}
            </h6>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('standalone.multi_wan.rules_description') }}
            </p>
          </div>
          <NeButton :kind="'secondary'" class="ml-auto self-start" @click="createRule = true">
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" />
            </template>
            {{ t('standalone.multi_wan.create_rule') }}
          </NeButton>
        </div>
        <div>
          <RuleManager :key="ruleTimestamp" @edit-rule="(toEditRule) => (editRule = toEditRule)" />
        </div>
      </div>
    </div>
  </div>
  <PolicyCreator
    :create-default="mwanConfig.policies.length < 1"
    :is-shown="createPolicy"
    @close="createPolicy = false"
    @policy-created="policyCreatedHandler()"
  />
  <NeSideDrawer
    :is-shown="createRule"
    :title="t('standalone.multi_wan.create_new_rule')"
    @close="createRule = false"
  >
    <RuleCreator @cancel-creation="createRule = false" @rule-created="ruleCreatedHandler()" />
  </NeSideDrawer>
  <NeSideDrawer
    :is-shown="editRule != undefined"
    :title="t('standalone.multi_wan.edit_rule', { name: editRule?.name })"
    @close="editRule = undefined"
  >
    <template v-if="editRule != undefined">
      <RuleEditor :rule="editRule" @cancel="editRule = undefined" @success="ruleEditedHandler()" />
    </template>
  </NeSideDrawer>
</template>
