<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { onMounted, onUnmounted, ref } from 'vue'
import {
  NeBadge,
  NeDropdown,
  NeInlineNotification,
  NeButton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faCirclePlus,
  faCircleCheck,
  faCircleXmark,
  faWarning,
  faCircleStop,
  faClock
} from '@fortawesome/free-solid-svg-icons'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import type { Member, Policy, Rule } from '@/composables/useMwan'
import { useMwan } from '@/composables/useMwan'
import NeTable from '@/components/standalone/NeTable.vue'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import PolicyCreator from '@/components/standalone/multi-wan/PolicyCreator.vue'
import PolicyDeleter from '@/components/standalone/multi-wan/PolicyDeleter.vue'
import PolicyEditor from '@/components/standalone/multi-wan/PolicyEditor.vue'
import RuleManager from '@/components/standalone/multi-wan/RuleManager.vue'
import RuleCreator from '@/components/standalone/multi-wan/RuleCreator.vue'
import RuleDeleter from '@/components/standalone/multi-wan/RuleDeleter.vue'
import RuleEditor from '@/components/standalone/multi-wan/RuleEditor.vue'

const { t } = useI18n()

const mwan = ref(useMwan())

const uciPendingChangesStore = useUciPendingChangesStore()

const createPolicy = ref(false)
const toDeletePolicy = ref<Policy>()
const toEditPolicy = ref<Policy>()

const createRule = ref(false)
const toDeleteRule = ref<Rule>()
const toEditRule = ref<Rule>()

let intervalId: number

onMounted(() => {
  intervalId = setInterval(() => {
    mwan.value.fetch()
  }, 5000)
})

onUnmounted(() => {
  clearInterval(intervalId)
})

function policyCreated() {
  createPolicy.value = false
  reloadConfig()
}

function policyDeleted() {
  toDeletePolicy.value = undefined
  reloadConfig()
}

function policyEdited() {
  toEditPolicy.value = undefined
  reloadConfig()
}

function ruleCreated() {
  createRule.value = false
  reloadConfig()
}

function ruleDeleted() {
  toDeleteRule.value = undefined
  reloadConfig()
}

function ruleEdited() {
  toEditRule.value = undefined
  reloadConfig()
}

function reloadConfig() {
  mwan.value.fetch()
  uciPendingChangesStore.getChanges()
}

function badgeIcon(member: Member) {
  switch (member.status) {
    case 'online':
      return faCircleCheck
    case 'offline':
      return faCircleXmark
    case 'disconnecting':
    case 'connecting':
      return faWarning
    case 'disabled':
      return faCircleStop
    default:
      return faClock
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
          <p class="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {{ t('standalone.multi_wan.policy_description') }}
          </p>
        </div>
        <NeButton
          v-if="mwan.policies.length > 0"
          class="self-start"
          kind="secondary"
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
      <template v-else>
        <HorizontalCard
          v-if="!mwan.loading && mwan.policies.length < 1"
          class="space-y-4 text-center"
        >
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
          :loading="mwan.loading"
          :skeleton-lines="3"
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
          <template #actions="{ item }: { item: Policy }">
            <div class="flex items-center justify-end">
              <NeButton :kind="'tertiary'" @click="toEditPolicy = item">
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
                    disabled:
                      item.name == 'ns_default' ||
                      mwan.rules.some((rule) => rule.policy.name === item.name),
                    action: () => (toDeletePolicy = item),
                    danger: true
                  }
                ]"
                align-to-right
              />
            </div>
          </template>
        </NeTable>
      </template>
    </div>
    <div>
      <div class="space-y-6">
        <div class="flex flex-wrap gap-y-4">
          <div class="mr-auto">
            <h6 class="mb-2 text-xl font-medium text-gray-900 dark:text-gray-50">
              {{ t('standalone.multi_wan.rules') }}
            </h6>
            <p class="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {{ t('standalone.multi_wan.rules_description') }}
            </p>
          </div>
          <NeButton
            v-if="mwan.policies.length > 0"
            :kind="'secondary'"
            class="self-start"
            @click="createRule = true"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" />
            </template>
            {{ t('standalone.multi_wan.create_rule') }}
          </NeButton>
        </div>
        <div>
          <RuleManager
            :loading="mwan.loading"
            :policies-exist="mwan.policies.length > 0"
            :rules="mwan.rules"
            @delete="(rule) => (toDeleteRule = rule)"
            @edit="(rule) => (toEditRule = rule)"
          />
        </div>
      </div>
    </div>
  </div>
  <PolicyCreator
    :create-default="mwan.policies.length < 1"
    :is-shown="createPolicy"
    @close="createPolicy = false"
    @success="policyCreated()"
  />
  <PolicyDeleter
    :policy="toDeletePolicy"
    @close="toDeletePolicy = undefined"
    @success="policyDeleted()"
  />
  <PolicyEditor
    :policy="toEditPolicy"
    @close="toEditPolicy = undefined"
    @success="policyEdited()"
  />
  <RuleCreator
    :is-shown="createRule"
    :policies="mwan.policies"
    @cancel="createRule = false"
    @success="ruleCreated()"
  />
  <RuleDeleter :rule="toDeleteRule" @cancel="toDeleteRule = undefined" @success="ruleDeleted()" />
  <RuleEditor
    :policies="mwan.policies"
    :rule="toEditRule"
    @close="toEditRule = undefined"
    @success="ruleEdited()"
  />
</template>
