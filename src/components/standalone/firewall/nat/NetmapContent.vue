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
import { computed, onMounted, ref } from 'vue'
import { isEmpty } from 'lodash-es'
import { type NetmapRule, type NetmapType } from '@/stores/standalone/firewall'
import { ubusCall } from '@/lib/standalone/ubus'
import NetmapTable from './NetmapTable.vue'
import CreateOrEditNetmapRuleDrawer from './CreateOrEditNetmapRuleDrawer.vue'
import DeleteNetmapModal from './DeleteNetmapModal.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const netmapRules = ref<NetmapRule[]>([])
const currentRule = ref<NetmapRule | undefined>(undefined)
const netmapType = ref<NetmapType>('src')
const isShownCreateOrEditRuleDrawer = ref(false)
const isShownDeleteRuleModal = ref(false)

const loading = ref({
  listRules: false
})

const error = ref({
  listRules: '',
  listRulesDetails: ''
})

const sourceNetmaps = computed(() => {
  return netmapRules.value.filter((rule) => rule.dest)
})

const destinationNetmaps = computed(() => {
  return netmapRules.value.filter((rule) => rule.src)
})

onMounted(() => {
  loadData()
})

async function loadData() {
  listNetmaps()
  uciChangesStore.getChanges()
}

async function listNetmaps() {
  loading.value.listRules = true
  error.value.listRules = ''
  error.value.listRulesDetails = ''
  netmapRules.value = []

  try {
    const res = await ubusCall('ns.netmap', 'list-rules')
    netmapRules.value = res.data.rules
  } catch (err: any) {
    console.error(err)
    error.value.listRules = t(getAxiosErrorMessage(err))
    error.value.listRulesDetails = err.toString()
  } finally {
    loading.value.listRules = false
  }
}

function showCreateRuleDrawer(type: 'src' | 'dest') {
  currentRule.value = undefined
  netmapType.value = type
  isShownCreateOrEditRuleDrawer.value = true
}

function showEditRuleDrawer(rule: NetmapRule) {
  currentRule.value = rule
  netmapType.value = rule.dest ? 'src' : 'dest'
  isShownCreateOrEditRuleDrawer.value = true
}

function showDeleteRuleModal(rule: NetmapRule) {
  currentRule.value = rule
  isShownDeleteRuleModal.value = true
}

function hideCreateOrEditRuleDrawer() {
  isShownCreateOrEditRuleDrawer.value = false
}
</script>

<template>
  <div>
    <NeHeading tag="h5" class="mb-2">{{ t('standalone.netmap.title') }}</NeHeading>
    <div class="mb-8 flex flex-col items-start justify-between gap-6 xl:flex-row">
      <div class="max-w-2xl text-gray-500 dark:text-gray-400">
        {{ t('standalone.netmap.netmap_rules_description') }}
      </div>
      <div v-if="loading.listRules || netmapRules.length" class="shrink-0">
        <NeButton kind="secondary" size="lg" @click="showCreateRuleDrawer('src')">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('standalone.netmap.add_source_netmap') }}
        </NeButton>
        <NeButton kind="secondary" size="lg" @click="showCreateRuleDrawer('dest')" class="ml-4">
          <template #prefix>
            <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
          </template>
          {{ t('standalone.netmap.add_destination_netmap') }}
        </NeButton>
      </div>
    </div>
    <!-- listRules error notification -->
    <NeInlineNotification
      v-if="error.listRules"
      kind="error"
      :title="t('error.cannot_retrieve_netmap_rules')"
      :description="error.listRules"
      class="mb-5"
    >
      <template #details v-if="error.listRulesDetails">
        {{ error.listRulesDetails }}
      </template>
    </NeInlineNotification>
    <template v-else>
      <!-- no error -->
      <NeSkeleton v-if="loading.listRules" :lines="6" size="lg" />
      <template v-else>
        <template v-if="isEmpty(netmapRules)">
          <!-- empty state -->
          <NeEmptyState
            :title="t('standalone.netmap.no_netmap_found')"
            :icon="['fas', 'network-wired']"
            class="mt-4"
          >
            <div class="flex flex-col">
              <NeButton kind="secondary" size="lg" @click="showCreateRuleDrawer('src')">
                <template #prefix>
                  <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
                </template>
                {{ t('standalone.netmap.add_source_netmap') }}
              </NeButton>
              <NeButton
                kind="secondary"
                size="lg"
                @click="showCreateRuleDrawer('dest')"
                class="mt-4"
              >
                <template #prefix>
                  <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
                </template>
                {{ t('standalone.netmap.add_destination_netmap') }}
              </NeButton>
            </div>
          </NeEmptyState>
        </template>
        <!-- netmap tables -->
        <template v-else>
          <NetmapTable
            v-if="sourceNetmaps.length"
            netmap-type="src"
            :rules="sourceNetmaps"
            :loading="loading.listRules"
            @reloadRules="loadData"
            @editRule="showEditRuleDrawer"
            @deleteRule="showDeleteRuleModal"
          />
          <NetmapTable
            v-if="destinationNetmaps.length"
            netmap-type="dest"
            :rules="destinationNetmaps"
            :loading="loading.listRules"
            @reloadRules="loadData"
            @editRule="showEditRuleDrawer"
            @deleteRule="showDeleteRuleModal"
            class="mt-8"
          />
        </template>
      </template>
    </template>
    <!-- create/edit rule drawer -->
    <CreateOrEditNetmapRuleDrawer
      :currentRule="currentRule"
      :netmapType="netmapType"
      :isShown="isShownCreateOrEditRuleDrawer"
      @close="hideCreateOrEditRuleDrawer"
      @reloadData="loadData"
    />
    <!-- delete rule modal -->
    <DeleteNetmapModal
      :visible="isShownDeleteRuleModal"
      :rule="currentRule"
      @close="isShownDeleteRuleModal = false"
      @reloadData="loadData"
    />
  </div>
</template>
