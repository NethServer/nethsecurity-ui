<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeCard,
  NeInlineNotification,
  NeSkeleton,
  NeButton,
  getAxiosErrorMessage,
  NeEmptyState
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { isEmpty } from 'lodash-es'
import type { DpiRule } from '@/lib/standalone/dpi'
import DpiRuleCard from '@/components/standalone/dpi/DpiRuleCard.vue'
import ManageDpiRuleModal from '@/components/standalone/dpi/ManageDpiRuleModal.vue'
import DeleteDpiRuleModal from '@/components/standalone/dpi/DeleteDpiRuleModal.vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { useFirewallStore } from '@/stores/standalone/firewall'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const firewallConfig = useFirewallStore()
const uciChangesStore = useUciPendingChangesStore()
const rules = ref<DpiRule[]>([])
const isShownManageRuleModal = ref(false)
const currentRule = ref<DpiRule>()
const isShownDeleteRuleModal = ref(false)

const loading = ref({
  listRules: true
})

const error = ref({
  listRules: '',
  listRulesDetails: ''
})

onMounted(() => {
  loadData()
})

function loadData() {
  listRules()
  firewallConfig.fetch()
  uciChangesStore.getChanges()
}

async function listRules() {
  loading.value.listRules = true
  error.value.listRules = ''
  error.value.listRulesDetails = ''

  try {
    const res = await ubusCall('ns.dpi', 'list-rules')
    rules.value = res.data.values
  } catch (err: any) {
    console.error(err)
    error.value.listRules = t(getAxiosErrorMessage(err))
    error.value.listRulesDetails = err.toString()
  } finally {
    loading.value.listRules = false
  }
}

function showCreateRuleModal() {
  currentRule.value = undefined
  isShownManageRuleModal.value = true
}

function showEditRuleModal(rule: DpiRule) {
  currentRule.value = rule
  isShownManageRuleModal.value = true
}

function showDeleteRuleModal(rule: DpiRule) {
  currentRule.value = rule
  isShownDeleteRuleModal.value = true
}
</script>

<template>
  <div>
    <div class="mb-8 flex items-start justify-between">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('standalone.dpi.rules_description') }}
      </div>
      <NeButton
        v-if="rules.length"
        kind="secondary"
        size="lg"
        class="ml-6 shrink-0"
        @click="showCreateRuleModal"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
        </template>
        {{ t('standalone.dpi.create_rule') }}</NeButton
      >
    </div>
    <NeInlineNotification
      v-if="error.listRules"
      kind="error"
      :title="t('error.cannot_retrieve_dpi_rules')"
      :description="error.listRules"
      class="mb-5"
    >
      <template v-if="error.listRulesDetails" #details>
        {{ error.listRulesDetails }}
      </template>
    </NeInlineNotification>
    <!-- skeleton -->
    <template v-else-if="loading.listRules">
      <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 2xl:grid-cols-3">
        <NeCard v-for="index in 3" :key="index">
          <NeSkeleton size="lg" :lines="5" />
        </NeCard>
      </div>
    </template>
    <template v-else>
      <NeEmptyState
        v-if="isEmpty(rules)"
        :title="t('standalone.dpi.no_rules_found')"
        :icon="['fas', 'circle-info']"
      >
        <NeButton kind="primary" size="lg" @click="showCreateRuleModal">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('standalone.dpi.create_rule') }}</NeButton
        >
      </NeEmptyState>
      <!-- rules -->
      <div v-else class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 2xl:grid-cols-3">
        <DpiRuleCard
          v-for="(rule, index) in rules"
          :key="index"
          :rule="rule"
          :zones="firewallConfig.zones"
          @edit-rule="showEditRuleModal"
          @delete-rule="showDeleteRuleModal"
          @reload-data="loadData"
        />
      </div>
    </template>
    <!-- manage dpi rule modal -->
    <ManageDpiRuleModal
      :visible="isShownManageRuleModal"
      :rule-to-edit="currentRule"
      :all-rules="rules"
      @close="isShownManageRuleModal = false"
      @reload-data="loadData"
    />
    <!-- delete rule modal -->
    <DeleteDpiRuleModal
      :visible="isShownDeleteRuleModal"
      :rule="currentRule"
      @close="isShownDeleteRuleModal = false"
      @reload-data="loadData"
    />
  </div>
</template>
