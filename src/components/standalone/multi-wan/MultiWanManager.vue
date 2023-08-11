<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { reactive, ref } from 'vue'
import { useMwanConfig } from '@/composables/useMwanConfig'
import { NeButton, NeSkeleton } from '@nethserver/vue-tailwind-lib'
import PolicyManager from '@/components/standalone/multi-wan/PolicyManager.vue'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons'
import RuleManager from '@/components/standalone/multi-wan/RuleManager.vue'
import PolicyCreator from '@/components/standalone/multi-wan/PolicyCreator.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()

const mwanConfig = reactive(useMwanConfig())
const uciPendingChangesStore = useUciPendingChangesStore()

const createPolicy = ref(false)

/**
 * Handler for policyCreated event.
 */
function policyCreatedHandler() {
  createPolicy.value = false
  mwanConfig.fetch()
  uciPendingChangesStore.getChanges()
}
</script>

<template>
  <div class="space-y-16">
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
          class="ml-auto self-start"
          v-if="mwanConfig.policies.length >= 1"
          :kind="'secondary'"
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
        <div>
          <h6 class="mb-2 text-xl font-medium text-gray-900 dark:text-gray-50">
            {{ t('standalone.multi_wan.rules') }}
          </h6>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('standalone.multi_wan.rules_description') }}
          </p>
        </div>
        <div>
          <RuleManager />
        </div>
      </div>
    </div>
  </div>
  <PolicyCreator
    :is-shown="createPolicy"
    @close="createPolicy = false"
    :create-default="mwanConfig.policies.length < 1"
    @policy-created="policyCreatedHandler()"
  />
</template>
