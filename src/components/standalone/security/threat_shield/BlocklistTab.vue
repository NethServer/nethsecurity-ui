<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeBadge,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  getAxiosErrorMessage,
  NeTextInput,
  NeEmptyState
} from '@nethesis/vue-components'
import { onMounted } from 'vue'
import { computed } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BlocklistTable from './BlocklistTable.vue'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

export type Blocklist = {
  name: string
  type: 'community' | 'enterprise' | 'unknown'
  enabled: boolean
  confidence: number
  description: string
}

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const router = useRouter()

const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const fetchError = ref(false)
const loading = ref(true)
const isTogglingBlocklistEnabled = ref(false)
const blocklists = ref<Blocklist[]>([])
const filter = ref('')
const isThreatShieldEnabled = ref(false)

const filteredBlocklists = computed(() => {
  return filter.value
    ? blocklists.value.filter(
        (x) =>
          x.name.includes(filter.value) ||
          x.description.includes(filter.value) ||
          x.type.includes(filter.value)
      )
    : blocklists.value
})

const isEnterprise = computed(() => {
  return blocklists.value.some((x) => x.type === 'enterprise')
})

function cleanError() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
}

async function fetchBlocklists() {
  cleanError()
  fetchError.value = false

  try {
    loading.value = true
    blocklists.value = (await ubusCall('ns.threatshield', 'list-blocklist')).data.data
    isThreatShieldEnabled.value = (
      await ubusCall('ns.threatshield', 'list-settings')
    ).data.data.enabled
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_blocklists')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

async function toggleBlocklistEnable(blocklist: Blocklist) {
  cleanError()
  try {
    isTogglingBlocklistEnabled.value = true
    await ubusCall('ns.threatshield', 'edit-blocklist', {
      blocklist: blocklist.name,
      enabled: blocklist.enabled
    })
    await uciChangesStore.getChanges()
  } catch (err: any) {
    error.value.notificationTitle = blocklist.enabled
      ? t('error.cannot_enable_blocklist')
      : t('error.cannot_disable_blocklist')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()

    let blocklistToRevert =
      blocklists.value[blocklists.value.findIndex((x) => x.name === blocklist.name)]
    blocklistToRevert.enabled = !blocklistToRevert.enabled
  } finally {
    isTogglingBlocklistEnabled.value = false
  }
}

onMounted(() => {
  fetchBlocklists()
})
</script>

<template>
  <NeSkeleton v-if="loading" :lines="8" size="lg" />
  <div class="flex flex-col gap-y-6" v-else>
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="my-2"
      ><template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <template v-if="!fetchError">
      <div class="flex flex-row items-start justify-between">
        <div>
          <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.threat_shield.blocklist_description') }}
          </p>
          <div class="mt-2 flex flex-row gap-x-2" v-if="isEnterprise">
            <FontAwesomeIcon
              :icon="['fas', 'circle-info']"
              class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
            />
            <p>
              {{ t('standalone.threat_shield.blocklist_subscription_description') }}
            </p>
          </div>
        </div>
        <NeBadge
          v-if="isThreatShieldEnabled"
          :icon="['fas', 'check']"
          :text="t('standalone.threat_shield.threat_shield_enabled')"
          kind="success"
        />
      </div>

      <NeEmptyState
        v-if="!isThreatShieldEnabled"
        :title="t('standalone.threat_shield.threat_shield_disabled')"
        :icon="['fas', 'shield']"
        class="pb-8"
        ><NeButton
          kind="primary"
          @click="
            () => {
              router.push(`${getStandaloneRoutePrefix()}/security/threat-shield-ip?tab=settings`)
            }
          "
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'arrow-right']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('standalone.threat_shield.go_to_settings') }}</NeButton
        ></NeEmptyState
      >
      <template v-else>
        <NeTextInput
          class="max-w-xs sm:max-w-sm"
          :placeholder="t('standalone.threat_shield.filter_blocklists')"
          v-model="filter"
          is-search />
        <BlocklistTable
          :blocklists="filteredBlocklists"
          v-if="filteredBlocklists.length > 0"
          :disable-toggles="isTogglingBlocklistEnabled"
          kind="ip"
          @toggle-blocklist="toggleBlocklistEnable" />
        <NeEmptyState
          v-else
          :title="t('standalone.threat_shield.no_blacklists_found')"
          :icon="['fas', 'shield']"
      /></template>
    </template>
  </div>
</template>
