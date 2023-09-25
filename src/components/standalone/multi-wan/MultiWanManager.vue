<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { reactive, ref } from 'vue'
import type { Rule } from '@/composables/useMwanConfig'
import { useMwanConfig } from '@/composables/useMwanConfig'
import {
  getAxiosErrorMessage,
  NeBadge,
  NeButton,
  NeDropdown,
  NeInlineNotification,
  NeSkeleton
} from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
import type { Member, Policy } from '@/composables/useMwan'
import { useMwan } from '@/composables/useMwan'
import NeTable from '@/components/standalone/NeTable.vue'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import PolicyCreator from '@/components/standalone/multi-wan/PolicyCreator.vue'

const { t } = useI18n()

const mwan = ref(useMwan())

const mwanConfig = reactive(useMwanConfig())
const uciPendingChangesStore = useUciPendingChangesStore()

const createPolicy = ref(false)
const deletePolicy = ref<Policy>()
const deletingPolicy = ref(false)
const errorDeletingPolicy = ref<Error>()
const editPolicy = ref<Policy>()

const createRule = ref(false)
const editRule = ref<Rule>()
const deleteRule = ref<Rule>()
const deletingRule = ref(false)
const errorDeletingRule = ref<Error>()

/**
 * Due to the component nature of the RuleManager, there's no way to notify the component of a change unless refactoring
 * the component. This variable is keyed to RuleManager so, when it gets updated, triggers a redraw of the component.
 */
const ruleTimestamp = ref(Date.now())

/**
 * Handler for policyCreated event.
 */
function policyCreatedHandler() {
  reloadConfig()
  createPolicy.value = false
}

/**
 * Handler for policy edited with success event.
 */
function policyEditedHandler() {
  editPolicy.value = undefined
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
  mwan.value.fetch()
  uciPendingChangesStore.getChanges()
}

function deleteRuleHandler() {
  deletingRule.value = true
  ubusCall('uci', 'delete', {
    config: 'mwan3',
    section: deleteRule.value?.name
  })
    .then(() => {
      deleteRule.value = undefined
      reloadConfig()
    })
    .catch((error: AxiosError) => (errorDeletingRule.value = error))
    .finally(() => (deletingRule.value = false))
}

function deletePolicyHandler() {
  deletingPolicy.value = true
  ubusCall('uci', 'delete', {
    config: 'mwan3',
    section: deletePolicy.value?.name
  })
    .then(() => {
      deletePolicy.value = undefined
      reloadConfig()
    })
    .catch((error: AxiosError) => (errorDeletingPolicy.value = error))
    .finally(() => (deletingPolicy.value = false))
}

function badgeIcon(member: Member) {
  switch (member.status) {
    case 'online':
      return ['fas', 'circle-check']
    case 'offline':
      return ['fas', 'circle-xmark']
    case 'disconnecting':
    case 'connecting':
      return ['fas', 'warning']
    default:
      return ['fas', 'clock']
  }
}

function badgeType(member: Member) {
  switch (member.status) {
    case 'online':
      return 'success'
    case 'offline':
      return 'error'
    case 'disconnecting':
    case 'connecting':
      return 'warning'
    default:
      return undefined
  }
}

function policyIcon(policy: Policy) {
  switch (policy.type) {
    case 'balance':
      return ['fas', 'scale-balanced']
    case 'backup':
      return ['fas', 'layer-group']
    default:
      return ['fas', 'user-gear']
  }
}
</script>

<template>
  <div class="space-y-16">
    <div class="space-y-8">
      <div class="flex flex-wrap gap-y-4">
        <div class="mr-auto">
          <h6 class="mb-2 text-xl font-medium text-gray-900 dark:text-gray-50">
            {{ t('standalone.multi_wan.policy') }}
          </h6>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('standalone.multi_wan.policy_description') }}
          </p>
        </div>
        <NeButton
          v-if="mwan.policies.length > 0"
          kind="secondary"
          class="self-start"
          @click="createPolicy = true"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" />
          </template>
          {{ t('standalone.multi_wan.create_policy') }}
        </NeButton>
      </div>
      <NeInlineNotification
        v-if="mwan.error"
        :title="t(getAxiosErrorMessage(mwan.error))"
        kind="error"
      />
      <NeSkeleton :lines="10" v-else-if="mwan.loading" />
      <HorizontalCard v-else-if="mwan.policies.length < 1" class="space-y-4 text-center">
        <p>{{ t('standalone.multi_wan.no_policy_found') }}</p>
        <NeButton :kind="'primary'" @click="createPolicy = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" />
          </template>
          {{ t('standalone.multi_wan.create_default_policy') }}
        </NeButton>
      </HorizontalCard>
      <NeTable
        v-else
        :data="mwan.policies"
        :headers="[
          {
            key: 'label',
            label: 'Policy Name'
          },
          {
            key: 'type'
          },
          {
            key: 'gateways',
            label: 'Gateways'
          },
          {
            key: 'actions'
          }
        ]"
        :style="'card'"
      >
        <template #label="{ item }: { item: Policy }">
          <div class="flex items-center gap-4 border-r pr-8 dark:border-gray-600">
            <div
              v-if="item.name == 'ns_default'"
              class="flex h-8 w-8 items-center justify-center rounded-full dark:bg-gray-50 dark:text-gray-600"
            >
              <FontAwesomeIcon :icon="['fas', 'lock']" />
            </div>
            <p>{{ item.label ?? item.name }}</p>
          </div>
        </template>
        <template #type="{ item }: { item: Policy }">
          <div class="flex items-center">
            <FontAwesomeIcon :icon="policyIcon(item)" class="mr-2" />
            <p>{{ t(`standalone.multi_wan.modes.${item.type}`) }}</p>
          </div>
        </template>
        <template #gateways="{ item }: { item: Policy }">
          <div class="space-y-4">
            <div
              v-for="([metric, members], metricIndex) in Object.entries(item.members)"
              :key="metric"
              class="flex flex-wrap items-center gap-4"
            >
              <div v-if="Object.entries(item.members).length > 1">
                {{ t('standalone.multi_wan.priority', metricIndex + 1) }}
              </div>
              <div class="flex flex-wrap gap-4">
                <template v-for="(member, index) in members" :key="index">
                  <NeBadge
                    :icon="badgeIcon(member)"
                    :kind="badgeType(member)"
                    :label="members.length > 1 ? `weight: ${member.weight}` : ''"
                    :text="member.interface"
                  />
                </template>
              </div>
            </div>
          </div>
        </template>
        <!--        <template #actions="{ item }: { item: Policy }">
          <div class="flex items-center justify-end">
            <NeButton :kind="'tertiary'">
              <template #prefix>
                <FontAwesomeIcon :icon="['fas', 'edit']" />
              </template>
              {{ t('common.edit') }}
            </NeButton>
            <NeDropdown
              :items="[
                {
                  id: 'delete',
                  label: t('common.delete'),
                  disabled: item.name == 'ns_default',
                  action: () => $emit('delete', item),
                  danger: true
                }
              ]"
              align-to-right
            />
          </div>
        </template>-->
      </NeTable>
    </div>
  </div>
  <PolicyCreator
    :create-default="mwan.policies.length < 1"
    :is-shown="createPolicy"
    @close="createPolicy = false"
    @success="policyCreatedHandler()"
  />
  <NeSideDrawer
    :is-shown="editPolicy != undefined"
    :title="t('standalone.multi_wan.edit_policy')"
    @close="editPolicy = undefined"
  >
    <PolicyEditor
      v-if="editPolicy"
      :policy="editPolicy"
      @cancel="editPolicy = undefined"
      @success="policyEditedHandler()"
    />
  </NeSideDrawer>
  <NeSideDrawer
    :is-shown="createRule"
    :title="t('standalone.multi_wan.create_new_rule')"
    @close="createRule = false"
  >
    <RuleCreator @cancel="createRule = false" @success="ruleCreatedHandler()" />
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
  <!-- TODO: ask for labels for rule delete modal -->
  <NeModal
    :primary-button-disabled="deletingRule"
    :primary-button-loading="deletingRule"
    :primary-label="t('standalone.multi_wan.delete_rule_modal.button')"
    :title="t('standalone.multi_wan.delete_rule_modal.title', { name: deleteRule?.name ?? '' })"
    :visible="deleteRule != undefined"
    kind="warning"
    primary-button-kind="danger"
    @close="deleteRule = undefined"
    @primary-click="deleteRuleHandler()"
  >
    <NeInlineNotification
      v-if="errorDeletingRule"
      :title="t(getAxiosErrorMessage(errorDeletingRule.message))"
      kind="error"
    />
  </NeModal>
  <!-- TODO: ask for labels for policy delete modal -->
  <NeModal
    :primary-button-disabled="deletingPolicy"
    :primary-button-loading="deletingPolicy"
    :primary-label="t('standalone.multi_wan.delete_policy_modal.button')"
    :title="t('standalone.multi_wan.delete_policy_modal.title', { name: deletePolicy?.name ?? '' })"
    :visible="deletePolicy != undefined"
    kind="warning"
    primary-button-kind="danger"
    @close="deletePolicy = undefined"
    @primary-click="deletePolicyHandler()"
  >
    <NeInlineNotification
      v-if="errorDeletingPolicy"
      :title="t(getAxiosErrorMessage(errorDeletingPolicy.message))"
      kind="error"
    />
  </NeModal>
</template>
