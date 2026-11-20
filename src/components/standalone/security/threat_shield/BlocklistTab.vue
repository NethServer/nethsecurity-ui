<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  getAxiosErrorMessage,
  NeTextInput,
  NeEmptyState,
  NeModal
} from '@nethesis/vue-components'
import { onMounted } from 'vue'
import { computed } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BlocklistTable from './BlocklistTable.vue'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import SearchBannedIp from '@/components/standalone/security/threat_shield/SearchBannedIp.vue'
import CreateOrEditCustomBlocklistDrawer from './CreateOrEditCustomBlocklistDrawer.vue'
import { getMutationErrorKey } from '@/composables/useThreatShieldCustomLists'
import { useMutation } from '@tanstack/vue-query'
import { useNotificationsStore } from '@/stores/notifications'
import { useSubscriptionStore } from '@/stores/standalone/subscription'
import {
  faArrowRight,
  faCircleInfo,
  faCirclePlus,
  faShield
} from '@fortawesome/free-solid-svg-icons'

export type BlocklistDirection = 'in' | 'out' | 'inout'

export type Blocklist = {
  name: string
  type: 'community' | 'enterprise' | 'unknown'
  enabled: boolean
  confidence: number
  description: string
  custom?: boolean
  url_4?: string
  url_6?: string
  direction?: BlocklistDirection
  ports?: string[]
  protocols?: string[]
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
const notificationsStore = useNotificationsStore()
const subscription = useSubscriptionStore()
const selectedCustomBlocklist = ref<Blocklist>()
const showCustomBlocklistDrawer = ref(false)
const showDeleteCustomBlocklistModal = ref(false)

const deleteCustomBlocklistMutation = useMutation({
  mutationFn: (name: string) => ubusCall('ns.threatshield', 'delete-custom-blocklist', { name }),
  onSuccess: () => refreshAfterCustomChange()
})

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
    // @deprecated fetch via useThreatShieldSettings() composable
    // (@/composables/useThreatShieldSettings) — adds abort-on-unmount signaling
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

    const blocklistToRevert =
      blocklists.value[blocklists.value.findIndex((x) => x.name === blocklist.name)]!
    blocklistToRevert.enabled = !blocklistToRevert.enabled
  } finally {
    isTogglingBlocklistEnabled.value = false
  }
}

function openCustomBlocklistDrawer(item?: Blocklist) {
  selectedCustomBlocklist.value = item
  showCustomBlocklistDrawer.value = true
}

function openDeleteCustomBlocklistModal(item: Blocklist) {
  selectedCustomBlocklist.value = item
  deleteCustomBlocklistMutation.reset()
  showDeleteCustomBlocklistModal.value = true
}

function deleteCustomBlocklist() {
  if (selectedCustomBlocklist.value) {
    deleteCustomBlocklistMutation.mutate(selectedCustomBlocklist.value.name, {
      onSuccess: () => {
        showDeleteCustomBlocklistModal.value = false
        notificationsStore.createNotification({
          kind: 'success',
          title: t('standalone.threat_shield.custom_feed_deleted')
        })
      }
    })
  }
}

function refreshAfterCustomChange() {
  uciChangesStore.getChanges()
  fetchBlocklists()
}

onMounted(() => {
  fetchBlocklists()
})
</script>

<template>
  <NeSkeleton v-if="loading" :lines="8" size="lg" />
  <div v-else class="flex flex-col gap-y-6">
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="my-2"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <template v-if="!fetchError">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-sm font-normal text-tertiary-neutral">
            {{ t('standalone.threat_shield.blocklist_feeds_description') }}
          </p>
          <p
            v-if="subscription.isActive && !isEnterprise"
            class="mt-3 flex items-center gap-2 text-sm font-medium text-primary-neutral"
          >
            <FontAwesomeIcon
              :icon="faCircleInfo"
              class="size-4 shrink-0 text-indigo-500 dark:text-indigo-300"
              aria-hidden="true"
            />
            {{ t('standalone.threat_shield.blocklist_feeds_addon_info') }}
          </p>
        </div>
        <div v-if="isThreatShieldEnabled" class="flex shrink-0 flex-wrap gap-4">
          <NeButton kind="secondary" @click="openCustomBlocklistDrawer()">
            <template #prefix>
              <FontAwesomeIcon :icon="faCirclePlus" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('standalone.threat_shield.create_custom_feed') }}
          </NeButton>
          <SearchBannedIp />
        </div>
      </div>

      <NeEmptyState
        v-if="!isThreatShieldEnabled"
        :title="t('standalone.threat_shield.threat_shield_disabled')"
        :description="t('standalone.threat_shield.threat_shield_disabled_description')"
        :icon="faShield"
        class="pb-8"
        ><NeButton
          kind="primary"
          @click="
            () => {
              router.push(`${getStandaloneRoutePrefix()}/security/threat-shield-ip?tab=settings`)
            }
          "
          ><template #prefix>
            <font-awesome-icon :icon="faArrowRight" class="h-4 w-4" aria-hidden="true" /> </template
          >{{ t('standalone.threat_shield.go_to_settings') }}</NeButton
        ></NeEmptyState
      >
      <template v-else>
        <NeTextInput
          v-model="filter"
          class="sm:max-w-sm"
          :placeholder="t('standalone.threat_shield.filter_blocklists')"
          is-search
          :clear-search-label="t('ne_dropdown_filter.clear_search')" />
        <BlocklistTable
          v-if="filteredBlocklists.length > 0"
          :blocklists="filteredBlocklists"
          :disable-toggles="isTogglingBlocklistEnabled"
          kind="ip"
          @toggle-blocklist="toggleBlocklistEnable"
          @edit="openCustomBlocklistDrawer"
          @delete="openDeleteCustomBlocklistModal" />
        <NeEmptyState
          v-else
          :title="t('standalone.threat_shield.no_blacklists_found')"
          :icon="faShield"
      /></template>
    </template>
  </div>
  <CreateOrEditCustomBlocklistDrawer
    :is-shown="showCustomBlocklistDrawer"
    :item-to-edit="selectedCustomBlocklist"
    @close="showCustomBlocklistDrawer = false"
    @saved="
      () => {
        notificationsStore.createNotification({
          kind: 'success',
          title: selectedCustomBlocklist
            ? t('standalone.threat_shield.custom_feed_updated')
            : t('standalone.threat_shield.custom_feed_created')
        })
        fetchBlocklists()
      }
    "
  />
  <NeModal
    :visible="showDeleteCustomBlocklistModal"
    kind="warning"
    primary-button-kind="danger"
    :title="t('standalone.threat_shield.delete_custom_feed')"
    :primary-label="t('common.delete')"
    :cancel-label="t('common.cancel')"
    :primary-button-disabled="deleteCustomBlocklistMutation.isPending.value"
    :primary-button-loading="deleteCustomBlocklistMutation.isPending.value"
    :close-aria-label="t('common.close')"
    @primary-click="deleteCustomBlocklist()"
    @close="showDeleteCustomBlocklistModal = false"
  >
    {{
      t('standalone.threat_shield.delete_custom_feed_message', {
        name: selectedCustomBlocklist?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="deleteCustomBlocklistMutation.error.value"
      kind="error"
      :title="t('error.cannot_delete_custom_feed')"
      :description="t(getMutationErrorKey(deleteCustomBlocklistMutation.error.value, 'name'))"
      class="mt-4"
    />
  </NeModal>
</template>
