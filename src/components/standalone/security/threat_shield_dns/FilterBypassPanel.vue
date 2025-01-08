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
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import DeleteModal from '@/components/DeleteModal.vue'
import { useThreatShield } from '@/composables/useThreatShield'
import { faCheck, faShield, faArrowRight, faCirclePlus } from '@fortawesome/free-solid-svg-icons'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useRouter } from 'vue-router'
import BypassCard from './BypassCard.vue'
import CreateBypassDrawer from './CreateBypassDrawer.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const {
  dnsBypasses,
  dnsSettings,
  loadingListDnsSettings,
  loadingListDnsBypass,
  errorListDnsBypass,
  errorListDnsBypassDetails,
  errorListDnsSettings,
  errorListDnsSettingsDetails,
  listDnsBypass,
  listDnsSettings
} = useThreatShield()
const router = useRouter()
const currentBypass = ref('')
const isShownCreateBypassDrawer = ref(false)
const isShownDeleteBypassModal = ref(false)
const textFilter = ref('')

const filteredBypasses = computed(() => {
  if (!textFilter.value) {
    return dnsBypasses.value
  }

  const queryText = textFilter.value.trim()
  return dnsBypasses.value.filter((dnsBypass) => {
    return dnsBypass.includes(queryText)
  })
})

onMounted(() => {
  loadData()
})

function loadData() {
  listDnsSettings()
  listDnsBypass()
  uciChangesStore.getChanges()
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
          v-if="dnsSettings?.enabled"
          :icon="faCheck"
          :text="t('standalone.threat_shield_dns.threat_shield_dns_enabled')"
          kind="success"
        />
      </div>
    </div>
    <div class="space-y-6">
      <!-- dns-list-settings error notification -->
      <NeInlineNotification
        v-if="errorListDnsSettings"
        kind="error"
        :title="t('error.cannot_retrieve_threat_shield_settings')"
        :description="errorListDnsSettings"
        class="mb-5"
      >
        <template #details v-if="errorListDnsSettingsDetails">
          {{ errorListDnsSettingsDetails }}
        </template>
      </NeInlineNotification>
      <!-- dns-list-bypass error notification -->
      <NeInlineNotification
        v-if="errorListDnsBypass"
        kind="error"
        :title="t('error.cannot_retrieve_bypasses')"
        :description="errorListDnsBypass"
        class="mb-5"
      >
        <template #details v-if="errorListDnsBypassDetails">
          {{ errorListDnsBypassDetails }}
        </template>
      </NeInlineNotification>
      <template v-else>
        <!-- threat shield is disabled -->
        <NeEmptyState
          v-if="!loadingListDnsSettings && !dnsSettings?.enabled"
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
          <div
            v-if="dnsBypasses.length && !loadingListDnsBypass"
            class="flex flex-col-reverse items-start justify-between gap-6 sm:flex-row sm:items-center"
          >
            <NeTextInput
              :placeholder="t('common.filter')"
              v-model.trim="textFilter"
              is-search
              :disabled="loadingListDnsBypass || loadingListDnsSettings"
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
            v-if="!dnsBypasses.length && !loadingListDnsBypass"
            :title="t('standalone.threat_shield_dns.no_filter_bypasses_configured')"
            :icon="['fas', 'circle-info']"
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
            v-else-if="!filteredBypasses.length && !loadingListDnsBypass"
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
            v-if="dnsBypasses.length || loadingListDnsBypass"
            class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 4xl:grid-cols-5 6xl:grid-cols-6"
          >
            <!-- skeleton -->
            <template v-if="loadingListDnsBypass">
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
      :deleteFunction="
        () =>
          ubusCall('ns.threatshield', 'dns-delete-bypass', {
            address: currentBypass
          })
      "
      @close="isShownDeleteBypassModal = false"
      @reloadData="loadData"
    >
      {{ t('standalone.threat_shield_dns.confirm_delete_bypass', { name: currentBypass }) }}
    </DeleteModal>
  </div>
</template>
