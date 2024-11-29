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
import { ubusCall } from '@/lib/standalone/ubus'
import FlashstartContent from '@/components/standalone/security/FlashstartContent.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

const { t } = useI18n()
const router = useRouter()
const activeSubscription = ref(false)
const loading = ref({
  getSubscriptionInfo: true
})
const error = ref({
  getSubscriptionInfo: '',
  getSubscriptionInfoDetails: ''
})

async function fetchSubscriptionInfo() {
  loading.value.getSubscriptionInfo = true

  try {
    const res = await ubusCall('ns.subscription', 'info')

    activeSubscription.value = (res.data?.systemd_id && res.data?.active) || false
  } catch (err: any) {
    error.value.getSubscriptionInfo = t(getAxiosErrorMessage(err))
    error.value.getSubscriptionInfoDetails = err.toString()
  } finally {
    loading.value.getSubscriptionInfo = false
  }
}
onMounted(() => {
  fetchSubscriptionInfo()
})
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.flashstart.title') }}</NeHeading>
    <NeInlineNotification
      v-if="error.getSubscriptionInfo"
      :title="t('error.cannot_retrieve_subscription_info')"
      :description="error.getSubscriptionInfo"
      class="mb-6"
      kind="error"
    />
    <NeSkeleton v-if="loading.getSubscriptionInfo" :lines="7" />
    <template v-else>
      <div v-if="activeSubscription">
        <FlashstartContent />
      </div>
      <div v-else>
        <NeEmptyState
          :title="t('standalone.flashstart.flashstart_disabled')"
          :description="t('standalone.flashstart.flashstart_disabled_description')"
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
            >{{ t('standalone.flashstart.go_to_subscription') }}</NeButton
          ></NeEmptyState
        >
      </div>
    </template>
  </div>
</template>
