<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeBadge,
  NeButton,
  NeInlineNotification,
  NeTextInput,
  NeEmptyState
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { faCircleInfo, faCheck, faShield, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import BlocklistTable from '../threat_shield/BlocklistTable.vue'
import { useThreatShieldStore, type Blocklist } from '@/stores/standalone/threatShield'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const tsStore = useThreatShieldStore()
const router = useRouter()
const textFilter = ref('')
// show table skeleton only on first load
const firstLoadingListDnsBlocklists = ref(true)

const filteredBlocklists = computed(() => {
  if (!textFilter.value) {
    return tsStore.dnsBlocklists
  }

  return tsStore.dnsBlocklists.filter((blocklist) => {
    return tsStore.searchStringInDnsBlocklist(blocklist, textFilter.value)
  })
})

onMounted(() => {
  loadData()
})

async function loadData() {
  try {
    await tsStore.listDnsBlocklist()
  } finally {
    firstLoadingListDnsBlocklists.value = false
  }
}

async function toggleBlocklist(blocklist: Blocklist) {
  try {
    await tsStore.editDnsBlocklist(blocklist.name, blocklist.enabled)
    tsStore.listDnsBlocklist()
    uciChangesStore.getChanges()
  } catch (err: unknown) {
    // exception already handled in threat shield store
  }
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
            {{ t('standalone.threat_shield_dns.blocklist_sources_description') }}
          </p>
          <div class="mt-2 flex flex-row gap-x-2" v-if="tsStore.isEnterprise">
            <FontAwesomeIcon
              :icon="faCircleInfo"
              class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
            />
            <p>
              {{ t('standalone.threat_shield_dns.blocklist_subscription_description') }}
            </p>
          </div>
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
      <!-- dns-list-blocklist error notification -->
      <NeInlineNotification
        v-if="tsStore.errorListDnsBlocklists"
        kind="error"
        :title="t('error.cannot_retrieve_blocklists')"
        :description="tsStore.errorListDnsBlocklists"
        class="mb-5"
      >
        <template #details v-if="tsStore.errorListDnsBlocklistsDetails">
          {{ tsStore.errorListDnsBlocklistsDetails }}
        </template>
      </NeInlineNotification>
      <!-- dns-edit-blocklist error notification -->
      <NeInlineNotification
        v-if="tsStore.errorEditDnsBlocklist"
        kind="error"
        :title="t('error.cannot_edit_blocklist')"
        :description="tsStore.errorEditDnsBlocklist"
        class="mb-5"
      >
        <template #details v-if="tsStore.errorEditDnsBlocklistDetails">
          {{ tsStore.errorEditDnsBlocklistDetails }}
        </template>
      </NeInlineNotification>
      <template v-else>
        <!-- threat shield is disabled -->
        <NeEmptyState
          v-if="!tsStore.loadingListDnsSettings && !tsStore.dnsSettings?.enabled"
          :title="t('standalone.threat_shield_dns.threat_shield_dns_disabled')"
          :icon="faShield"
          class="pb-8"
        >
          <NeButton
            kind="primary"
            @click="
              () => {
                router.push(`${getStandaloneRoutePrefix()}/security/threat-shield-dns?tab=settings`)
              }
            "
          >
            <template #prefix>
              <font-awesome-icon :icon="faArrowRight" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('standalone.threat_shield_dns.go_to_settings') }}
          </NeButton>
        </NeEmptyState>
        <template v-else>
          <NeTextInput
            :placeholder="t('standalone.threat_shield.filter_blocklists')"
            v-model.trim="textFilter"
            is-search
            :disabled="firstLoadingListDnsBlocklists || tsStore.loadingListDnsSettings"
            class="max-w-xs sm:max-w-sm"
          />
          <!-- empty state -->
          <NeEmptyState
            v-if="!tsStore.dnsBlocklists.length && !tsStore.loadingListDnsBlocklists"
            :title="t('standalone.threat_shield_dns.no_blocklists')"
            :icon="['fas', 'circle-info']"
            class="mt-4"
          />
          <!-- no blocklists matching filter -->
          <NeEmptyState
            v-else-if="!filteredBlocklists.length && !tsStore.loadingListDnsBlocklists"
            :title="t('standalone.threat_shield_dns.no_blocklists_found')"
            :description="t('common.try_changing_search_filters')"
            :icon="['fas', 'circle-info']"
            class="mt-4"
          >
            <NeButton kind="tertiary" @click="clearFilter">
              {{ t('common.clear_filter') }}
            </NeButton>
          </NeEmptyState>
          <!-- blocklists table -->
          <BlocklistTable
            v-else
            :blocklists="filteredBlocklists"
            :disable-toggles="tsStore.loadingEditDnsBlocklist"
            kind="dns"
            :loading="firstLoadingListDnsBlocklists || tsStore.loadingListDnsSettings"
            @toggle-blocklist="toggleBlocklist"
          />
        </template>
      </template>
    </div>
  </div>
</template>
