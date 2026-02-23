<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSkeleton
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import FlowConfigureDrawer from '@/components/standalone/monitoring/flows/FlowConfigureDrawer.vue'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import FlowsTable from '@/components/standalone/monitoring/FlowsTable.vue'

const { t } = useI18n()

type FlowDaemonResponse = {
  data: {
    configuration: {
      enabled: boolean
      expired_persistence: string
    }
    status: boolean
  }
}

const configuringDaemon = ref(false)
const { isSuccess, isError, isPending, data, error } = useQuery({
  queryKey: ['flow', 'config'],
  queryFn: async () => ubusCall<FlowDaemonResponse>('ns.flows', 'get-configuration'),
  select: (data) => data.data,
  refetchInterval: () => {
    if (configuringDaemon.value) {
      return false
    } else {
      return 5000
    }
  }
})

const enabled = ref(false)
const expiredPersistence = ref('')
watch(data, (newData) => {
  if (newData != undefined) {
    enabled.value = newData.configuration.enabled
    expiredPersistence.value = newData.configuration.expired_persistence
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start gap-4">
      <p class="mr-auto max-w-xl text-secondary-neutral">{{ t('standalone.flows.subtitle') }}</p>
      <template v-if="isSuccess">
        <NeButton
          v-if="data!.configuration.enabled"
          kind="secondary"
          size="lg"
          @click="configuringDaemon = true"
        >
          {{ t('standalone.flows.configure_flows_daemon') }}
        </NeButton>
      </template>
    </div>
    <NeSkeleton v-if="isPending" :lines="10" />
    <NeInlineNotification
      v-else-if="isError"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('standalone.unable_to_get_flows_configuration')"
      kind="error"
    />
    <template v-else>
      <NeInlineNotification
        v-if="!data!.configuration.enabled"
        :description="t('standalone.flows.daemon_disabled_description')"
        :primary-button-label="t('standalone.flows.configure_flows_daemon')"
        :title="t('standalone.flows.daemon_disabled')"
        kind="info"
        @primary-click="configuringDaemon = true"
      />
      <NeInlineNotification
        v-else-if="!data!.status"
        :description="t('standalone.flows.daemon_not_running_description')"
        :title="t('standalone.flows.daemon_not_running')"
        kind="warning"
      />
      <FlowsTable v-else />
    </template>
    <FlowConfigureDrawer
      :enabled="enabled"
      :expired-persistence="expiredPersistence"
      :show="configuringDaemon"
      @close="configuringDaemon = false"
    />
  </div>
</template>
