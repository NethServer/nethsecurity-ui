<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeHeading,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeEmptyState,
  NeButton,
  NeSkeleton
} from '@nethesis/vue-components'
import { getProductName } from '@/lib/config'
import FlashstartContent from '@/components/standalone/security/FlashstartContent.vue'
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useThreatShieldStore } from '@/stores/standalone/threatShield'
import { useSubscriptionStore } from '@/stores/standalone/subscription.ts'

const { t } = useI18n()
const tsStore = useThreatShieldStore()
const subscription = useSubscriptionStore()
const router = useRouter()

watch(
  () => subscription.isActive,
  (isActive) => {
    if (isActive) {
      tsStore.listDnsSettings()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.flashstart.title') }}</NeHeading>
    <NeInlineNotification
      v-if="subscription.error"
      :title="t('error.cannot_retrieve_subscription_info')"
      :description="t(getAxiosErrorMessage(subscription.error))"
      class="mb-6"
      kind="error"
    />
    <NeSkeleton
      v-if="subscription.loading || tsStore.loadingListDnsSettings"
      :lines="7"
      size="lg"
    />
    <template v-else>
      <!-- no active subscription -->
      <NeEmptyState
        v-if="!subscription.isActive"
        :title="t('standalone.flashstart.flashstart_disabled')"
        :description="
          t('standalone.flashstart.flashstart_disabled_description', {
            product: getProductName()
          })
        "
        :icon="['fas', 'shield']"
        class="pb-8"
        ><NeButton
          kind="primary"
          @click="
            () => {
              router.push(`${getStandaloneRoutePrefix()}/system/subscription`)
            }
          "
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'arrow-right']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('common.go_to_page', { page: t('standalone.subscription.title') }) }}</NeButton
        ></NeEmptyState
      >
      <!-- threat shield dns is enabled -->
      <NeEmptyState
        v-else-if="tsStore.dnsSettings?.enabled"
        :title="t('standalone.flashstart.flashstart_disabled')"
        :description="t('standalone.flashstart.flashstart_disabled_threat_shield_enabled')"
        :icon="['fas', 'shield']"
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
            <font-awesome-icon :icon="['fas', 'arrow-right']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('common.go_to_page', { page: t('standalone.threat_shield_dns.title') }) }}
        </NeButton>
      </NeEmptyState>
      <!-- flash start UI -->
      <FlashstartContent v-else />
    </template>
  </div>
</template>
