<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeBadge,
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeTextInput
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import DeleteModal from '@/components/DeleteModal.vue'
import { faCheck, faShield, faCirclePlus } from '@fortawesome/free-solid-svg-icons'
import { useThreatShieldStore, type DnsBlockedDomain } from '@/stores/standalone/threatShield'
import TsDisabledEmptyState from './TsDisabledEmptyState.vue'
import CreateOrEditBlockedDomainDrawer from './CreateOrEditBlockedDomainDrawer.vue'
import BlockedDomainsTable from './BlockedDomainsTable.vue'

const { t } = useI18n()
const tsStore = useThreatShieldStore()
const currentDomain = ref<DnsBlockedDomain | undefined>(undefined)
const isShownCreateOrEditDomainDrawer = ref(false)
const isShownDeleteDomainModal = ref(false)
const textFilter = ref('')

const filteredDomains = computed(() => {
  if (!textFilter.value) {
    return tsStore.dnsBlockedDomains
  }

  return tsStore.dnsBlockedDomains.filter((domain) => {
    return tsStore.searchStringInDnsBlockedDomain(domain, textFilter.value)
  })
})

onMounted(() => {
  loadData()
})

function loadData() {
  tsStore.listDnsBlockedDomains()
}

function showCreateOrEditBlockedDomainDrawer() {
  currentDomain.value = undefined
  isShownCreateOrEditDomainDrawer.value = true
}

function showEditBlockedDomainDrawer(domain: DnsBlockedDomain) {
  currentDomain.value = domain
  isShownCreateOrEditDomainDrawer.value = true
}

function showDeleteBlockedDomainModal(domain: DnsBlockedDomain) {
  currentDomain.value = domain
  isShownDeleteDomainModal.value = true
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
            {{ t('standalone.threat_shield_dns.local_blocklist_description') }}
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
      <!-- dns-list-blocked error notification -->
      <NeInlineNotification
        v-if="tsStore.errorListDnsBlockedDomains"
        kind="error"
        :title="t('error.cannot_retrieve_blocked_domains')"
        :description="tsStore.errorListDnsBlockedDomains"
      >
        <template #details v-if="tsStore.errorListDnsBlockedDomainsDetails">
          {{ tsStore.errorListDnsBlockedDomainsDetails }}
        </template>
      </NeInlineNotification>
      <template v-else>
        <!-- threat shield is disabled -->
        <TsDisabledEmptyState
          v-if="!tsStore.loadingListDnsSettings && !tsStore.dnsSettings?.enabled"
        />
        <template v-else>
          <div
            v-if="tsStore.dnsBlockedDomains.length && !tsStore.loadingListDnsBlockedDomains"
            class="flex flex-col-reverse items-start justify-between gap-6 sm:flex-row sm:items-center"
          >
            <NeTextInput
              :placeholder="t('common.filter')"
              v-model.trim="textFilter"
              is-search
              :disabled="
                tsStore.loadingListDnsBlockedDomains || tsStore.loadingListDnsBlockedDomains
              "
              class="max-w-xs sm:max-w-sm"
            />
            <NeButton kind="secondary" size="lg" @click="showCreateOrEditBlockedDomainDrawer">
              <template #prefix>
                <font-awesome-icon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('standalone.threat_shield_dns.add_domain') }}
            </NeButton>
          </div>
          <!-- empty state -->
          <NeEmptyState
            v-if="!tsStore.dnsBlockedDomains.length && !tsStore.loadingListDnsBlockedDomains"
            :title="t('standalone.threat_shield_dns.local_blocklist_is_empty')"
            :icon="faShield"
            class="mt-4"
          >
            <NeButton kind="primary" size="lg" @click="showCreateOrEditBlockedDomainDrawer">
              <template #prefix>
                <font-awesome-icon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('standalone.threat_shield_dns.add_domain') }}
            </NeButton>
          </NeEmptyState>
          <!-- blocked domains table -->
          <BlockedDomainsTable
            v-else
            :filteredDomains="filteredDomains"
            :loading="tsStore.loadingListDnsBlockedDomains"
            @editDomain="showEditBlockedDomainDrawer"
            @deleteDomain="showDeleteBlockedDomainModal"
            @reloadData="loadData"
            @clearFilters="clearFilter"
          />
        </template>
      </template>
    </div>
    <!-- create blocked domain -->
    <CreateOrEditBlockedDomainDrawer
      :isShown="isShownCreateOrEditDomainDrawer"
      :currentDomain="currentDomain"
      @close="isShownCreateOrEditDomainDrawer = false"
      @reloadData="loadData"
    />
    <!-- delete blocked domain modal -->
    <DeleteModal
      :visible="isShownDeleteDomainModal"
      :title="t('standalone.threat_shield_dns.delete_domain')"
      :deleteButtonLabel="t('standalone.threat_shield_dns.delete_domain')"
      :errorNotificationTitle="t('error.cannot_delete_blocked_domain')"
      :deleteFunction="() => tsStore.deleteDnsBlockedDomain(currentDomain?.address || '')"
      @close="isShownDeleteDomainModal = false"
      @reloadData="loadData"
    >
      {{
        t('standalone.threat_shield_dns.confirm_delete_domain', { name: currentDomain?.address })
      }}
    </DeleteModal>
  </div>
</template>
