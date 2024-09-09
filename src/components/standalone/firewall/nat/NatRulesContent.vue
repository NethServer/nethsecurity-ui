<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeHeading,
  NeSkeleton,
  NeEmptyState,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { isEmpty } from 'lodash-es'
import { type NatRule } from '@/stores/standalone/firewall'
import CreateOrEditNatRuleDrawer from './CreateOrEditNatRuleDrawer.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import NatRulesTable from './NatRulesTable.vue'
import DeleteNatRuleModal from './DeleteNatRuleModal.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const natRules = ref<NatRule[]>([])
const currentRule = ref<NatRule | undefined>(undefined)
const isShownCreateOrEditRuleDrawer = ref(false)
const isShownDeleteRuleModal = ref(false)

const loading = ref({
  listRules: false
})

const error = ref({
  listRules: '',
  listRulesDetails: ''
})

onMounted(() => {
  loadData()
})

async function loadData() {
  listRules()
  uciChangesStore.getChanges()
}

async function listRules() {
  loading.value.listRules = true
  error.value.listRules = ''
  error.value.listRulesDetails = ''
  natRules.value = []

  try {
    const res = await ubusCall('ns.nat', 'list-rules')
    natRules.value = res.data.rules
  } catch (err: any) {
    console.error(err)
    error.value.listRules = t(getAxiosErrorMessage(err))
    error.value.listRulesDetails = err.toString()
  } finally {
    loading.value.listRules = false
  }
}

function showCreateRuleDrawer() {
  currentRule.value = undefined
  isShownCreateOrEditRuleDrawer.value = true
}

function showEditRuleDrawer(rule: NatRule) {
  currentRule.value = rule
  isShownCreateOrEditRuleDrawer.value = true
}

function showDeleteRuleModal(rule: NatRule) {
  currentRule.value = rule
  isShownDeleteRuleModal.value = true
}

function hideCreateOrEditRuleDrawer() {
  isShownCreateOrEditRuleDrawer.value = false
}
</script>

<template>
  <div>
    <NeHeading tag="h5" class="mb-2">{{ t('standalone.nat.nat_rules') }}</NeHeading>
    <div class="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('standalone.nat.nat_rules_description') }}
      </div>
      <NeButton
        v-if="loading.listRules || natRules.length"
        kind="secondary"
        size="lg"
        @click="showCreateRuleDrawer"
        class="shrink-0"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
        </template>
        {{ t('standalone.nat.add_nat_rule') }}</NeButton
      >
    </div>
    <!-- listRules error notification -->
    <NeInlineNotification
      v-if="error.listRules"
      kind="error"
      :title="t('error.cannot_retrieve_nat_rules')"
      :description="error.listRules"
      class="mb-5"
    >
      <template #details v-if="error.listRulesDetails">
        {{ error.listRulesDetails }}
      </template>
    </NeInlineNotification>
    <template v-else>
      <!-- no error -->
      <NeSkeleton v-if="loading.listRules" :lines="5" size="lg" />
      <template v-else>
        <template v-if="isEmpty(natRules)">
          <!-- empty state -->
          <NeEmptyState
            :title="t('standalone.nat.no_rules_found')"
            :icon="['fas', 'network-wired']"
            class="mt-4"
          >
            <NeButton kind="secondary" size="lg" @click="showCreateRuleDrawer">
              <template #prefix>
                <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
              </template>
              {{ t('standalone.nat.add_nat_rule') }}</NeButton
            >
          </NeEmptyState>
        </template>
        <!-- nat rules table -->
        <NatRulesTable
          v-else
          :rules="natRules"
          :loading="loading.listRules"
          @reloadRules="loadData"
          @editRule="showEditRuleDrawer"
          @deleteRule="showDeleteRuleModal"
        />
      </template>
    </template>
    <!-- create/edit rule drawer -->
    <CreateOrEditNatRuleDrawer
      :currentRule="currentRule"
      :isShown="isShownCreateOrEditRuleDrawer"
      @close="hideCreateOrEditRuleDrawer"
      @reloadData="loadData"
    />
    <!-- delete rule modal -->
    <DeleteNatRuleModal
      :visible="isShownDeleteRuleModal"
      :rule="currentRule"
      @close="isShownDeleteRuleModal = false"
      @reloadData="loadData"
    />
  </div>
</template>
