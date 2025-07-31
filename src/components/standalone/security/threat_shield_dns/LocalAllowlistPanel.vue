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
import { useThreatShieldStore, type DnsAllowedDomain } from '@/stores/standalone/threatShield'
import TsDisabledEmptyState from './TsDisabledEmptyState.vue'
import CreateOrEditAllowedDomainDrawer from './CreateOrEditAllowedDomainDrawer.vue'
import AllowedDomainsTable from './AllowedDomainsTable.vue'

const { t } = useI18n()
const tsStore = useThreatShieldStore()
const currentDomain = ref<DnsAllowedDomain | undefined>(undefined)
const isShownCreateOrEditDomainDrawer = ref(false)
const isShownDeleteDomainModal = ref(false)
const textFilter = ref('')

const filteredDomains = computed(() => {
  if (!textFilter.value) {
    return tsStore.dnsAllowedDomains
  }

  return tsStore.dnsAllowedDomains.filter((domain) => {
    return tsStore.searchStringInDnsAllowedDomain(domain, textFilter.value)
  })
})

onMounted(() => {
  loadData()
})

function loadData() {
  tsStore.listDnsAllowedDomains()
}

function showCreateOrEditAllowedDomainDrawer() {
  currentDomain.value = undefined
  isShownCreateOrEditDomainDrawer.value = true
}

function showEditAllowedDomainDrawer(domain: DnsAllowedDomain) {
  currentDomain.value = domain
  isShownCreateOrEditDomainDrawer.value = true
}

function showDeleteAllowedDomainModal(domain: DnsAllowedDomain) {
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
            {{ t('standalone.threat_shield_dns.local_allowlist_description') }}
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
      <!-- dns-list-allowed error notification -->
      <NeInlineNotification
        v-if="tsStore.errorListDnsAllowedDomains"
        kind="error"
        :title="t('error.cannot_retrieve_allowed_domains')"
        :description="tsStore.errorListDnsAllowedDomains"
      >
        <template v-if="tsStore.errorListDnsAllowedDomainsDetails" #details>
          {{ tsStore.errorListDnsAllowedDomainsDetails }}
        </template>
      </NeInlineNotification>
      <template v-else>
        <!-- threat shield is disabled -->
        <TsDisabledEmptyState
          v-if="!tsStore.loadingListDnsSettings && !tsStore.dnsSettings?.enabled"
        />
        <template v-else>
          <div
            v-if="tsStore.dnsAllowedDomains.length && !tsStore.loadingListDnsAllowedDomains"
            class="flex flex-col-reverse items-start justify-between gap-6 sm:flex-row sm:items-center"
          >
            <NeTextInput
              v-model.trim="textFilter"
              :placeholder="t('common.filter')"
              is-search
              :disabled="
                tsStore.loadingListDnsAllowedDomains || tsStore.loadingListDnsAllowedDomains
              "
              class="max-w-xs sm:max-w-sm"
            />
            <NeButton kind="secondary" size="lg" @click="showCreateOrEditAllowedDomainDrawer">
              <template #prefix>
                <font-awesome-icon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('standalone.threat_shield_dns.add_domain') }}
            </NeButton>
          </div>
          <!-- empty state -->
          <NeEmptyState
            v-if="!tsStore.dnsAllowedDomains.length && !tsStore.loadingListDnsAllowedDomains"
            :title="t('standalone.threat_shield_dns.local_allowlist_is_empty')"
            :icon="faShield"
            class="mt-4"
          >
            <NeButton kind="primary" size="lg" @click="showCreateOrEditAllowedDomainDrawer">
              <template #prefix>
                <font-awesome-icon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('standalone.threat_shield_dns.add_domain') }}
            </NeButton>
          </NeEmptyState>
          <!-- allowed domains table -->
          <AllowedDomainsTable
            v-else
            :filtered-domains="filteredDomains"
            :loading="tsStore.loadingListDnsAllowedDomains"
            @edit-domain="showEditAllowedDomainDrawer"
            @delete-domain="showDeleteAllowedDomainModal"
            @reload-data="loadData"
            @clear-filters="clearFilter"
          />
        </template>
      </template>
    </div>
    <!-- create allowed domain -->
    <CreateOrEditAllowedDomainDrawer
      :is-shown="isShownCreateOrEditDomainDrawer"
      :current-domain="currentDomain"
      @close="isShownCreateOrEditDomainDrawer = false"
      @reload-data="loadData"
    />
    <!-- delete allowed domain modal -->
    <DeleteModal
      :visible="isShownDeleteDomainModal"
      :title="t('standalone.threat_shield_dns.delete_domain')"
      :delete-button-label="t('common.delete')"
      :error-notification-title="t('error.cannot_delete_allowed_domain')"
      :delete-function="() => tsStore.deleteDnsAllowedDomain(currentDomain?.address || '')"
      @close="isShownDeleteDomainModal = false"
      @reload-data="loadData"
    >
      {{
        t('standalone.threat_shield_dns.confirm_delete_allowed_domain', {
          name: currentDomain?.address
        })
      }}
    </DeleteModal>
  </div>
</template>
