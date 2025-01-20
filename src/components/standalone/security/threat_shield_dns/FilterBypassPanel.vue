<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeBadge,
  NeButton,
  NeCard,
  NeEmptyState,
  NeInlineNotification,
  NeTextInput
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import DeleteModal from '@/components/DeleteModal.vue'
import { faCheck, faShield, faCirclePlus } from '@fortawesome/free-solid-svg-icons'
import BypassCard from './BypassCard.vue'
import CreateBypassDrawer from './CreateBypassDrawer.vue'
import { useThreatShieldStore } from '@/stores/standalone/threatShield'
import TsDisabledEmptyState from './TsDisabledEmptyState.vue'

const { t } = useI18n()
const tsStore = useThreatShieldStore()
const currentBypass = ref('')
const isShownCreateBypassDrawer = ref(false)
const isShownDeleteBypassModal = ref(false)
const textFilter = ref('')

const filteredBypasses = computed(() => {
  if (!textFilter.value) {
    return tsStore.dnsBypasses
  }

  const queryText = textFilter.value.trim()
  return tsStore.dnsBypasses.filter((dnsBypass) => {
    return dnsBypass.includes(queryText)
  })
})

onMounted(() => {
  loadData()
})

function loadData() {
  tsStore.listDnsBypass()
}

function showCreateBypassDrawer() {
  currentBypass.value = ''
  isShownCreateBypassDrawer.value = true
}

function showDeleteBypassModal(bypass: string) {
  currentBypass.value = bypass
  isShownDeleteBypassModal.value = true
}

function clearFilter() {
  textFilter.value = ''
}
</script>

<template>
  <div>
    <div class="mb-8">
      <div class="flex flex-col items-start justify-between gap-6 xl:flex-row">
        <div class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          <p>
            {{ t('standalone.threat_shield_dns.filter_bypass_description') }}
          </p>
        </div>
        <NeBadge
          v-if="tsStore.dnsSettings?.enabled"
          :icon="faCheck"
          :text="t('standalone.threat_shield_dns.threat_shield_dns_enabled')"
          kind="success"
        />
      </div>
    </div>
    <div class="space-y-6">
      <!-- dns-list-bypass error notification -->
      <NeInlineNotification
        v-if="tsStore.errorListDnsBypass"
        kind="error"
        :title="t('error.cannot_retrieve_bypasses')"
        :description="tsStore.errorListDnsBypass"
        class="mb-5"
      >
        <template #details v-if="tsStore.errorListDnsBypassDetails">
          {{ tsStore.errorListDnsBypassDetails }}
        </template>
      </NeInlineNotification>
      <template v-else>
        <!-- threat shield is disabled -->
        <TsDisabledEmptyState
          v-if="!tsStore.loadingListDnsSettings && !tsStore.dnsSettings?.enabled"
        />
        <template v-else>
          <div
            v-if="tsStore.dnsBypasses.length && !tsStore.loadingListDnsBypass"
            class="flex flex-col-reverse items-start justify-between gap-6 sm:flex-row sm:items-center"
          >
            <NeTextInput
              :placeholder="t('common.filter')"
              v-model.trim="textFilter"
              is-search
              :disabled="tsStore.loadingListDnsBypass || tsStore.loadingListDnsSettings"
              class="max-w-xs sm:max-w-sm"
            />
            <NeButton kind="secondary" size="lg" @click="showCreateBypassDrawer">
              <template #prefix>
                <font-awesome-icon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('standalone.threat_shield_dns.add_bypass') }}
            </NeButton>
          </div>
          <!-- empty state -->
          <NeEmptyState
            v-if="!tsStore.dnsBypasses.length && !tsStore.loadingListDnsBypass"
            :title="t('standalone.threat_shield_dns.no_filter_bypasses_configured')"
            :icon="faShield"
            class="mt-4"
          >
            <NeButton kind="primary" size="lg" @click="showCreateBypassDrawer">
              <template #prefix>
                <font-awesome-icon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('standalone.threat_shield_dns.add_bypass') }}
            </NeButton>
          </NeEmptyState>
          <!-- no bypasses matching filter -->
          <NeEmptyState
            v-else-if="!filteredBypasses.length && !tsStore.loadingListDnsBypass"
            :title="t('standalone.threat_shield_dns.no_filter_bypasses_found')"
            :description="t('common.try_changing_search_filters')"
            :icon="['fas', 'circle-info']"
            class="mt-4"
          >
            <NeButton kind="tertiary" @click="clearFilter">
              {{ t('common.clear_filter') }}
            </NeButton>
          </NeEmptyState>
          <!-- bypasses card grid -->
          <div
            v-if="tsStore.dnsBypasses.length || tsStore.loadingListDnsBypass"
            class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 4xl:grid-cols-5 6xl:grid-cols-6"
          >
            <!-- skeleton -->
            <template v-if="tsStore.loadingListDnsBypass">
              <NeCard v-for="index in 8" :key="index" loading :skeletonLines="2" />
            </template>
            <BypassCard
              v-else
              v-for="(bypass, index) in filteredBypasses"
              :key="index"
              :bypass="bypass"
              @delete="showDeleteBypassModal"
            />
          </div>
        </template>
      </template>
    </div>
    <!-- create bypass -->
    <CreateBypassDrawer
      :isShown="isShownCreateBypassDrawer"
      @close="isShownCreateBypassDrawer = false"
      @reloadData="loadData"
    />
    <!-- delete bypass modal -->
    <DeleteModal
      :visible="isShownDeleteBypassModal"
      :title="t('standalone.threat_shield_dns.delete_bypass')"
      :deleteButtonLabel="t('standalone.threat_shield_dns.delete_bypass')"
      :errorNotificationTitle="t('error.cannot_delete_bypass')"
      :deleteFunction="() => tsStore.deleteDnsBypass(currentBypass)"
      @close="isShownDeleteBypassModal = false"
      @reloadData="loadData"
    >
      {{ t('standalone.threat_shield_dns.confirm_delete_bypass', { name: currentBypass }) }}
    </DeleteModal>
  </div>
</template>
