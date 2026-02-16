<script lang="ts" setup>
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import FlowsTable from '@/components/standalone/monitoring/FlowsTable.vue'
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput,
  NeToggle
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'
import { MessageBag } from '@/lib/validation.ts'

const { t } = useI18n()
const uci = useUciPendingChangesStore()

type FlowDaemonResponse = {
  data: {
    configuration: {
      enabled: boolean
      expired_persistence: string
    }
    status: boolean
  }
}

const { data, error, status } = useQuery({
  queryKey: ['flow', 'daemon'],
  queryFn: async () => ubusCall<FlowDaemonResponse>('ns.flows', 'get-configuration'),
  select: (data) => data.data
})

const enabled = ref(false)
const expiredPersistence = ref('')
watch(
  data,
  (val) => {
    if (val != undefined) {
      enabled.value = val.configuration.enabled
      expiredPersistence.value = val.configuration.expired_persistence
    }
  },
  { immediate: true }
)

const configuringDaemon = ref(false)

type SetConfigPayload = {
  enabled: boolean
  expired_persistence: string
}

const validationBag = ref(new MessageBag())
const queryClient = useQueryClient()
const {
  mutate,
  isPending,
  error: mutationError
} = useMutation({
  mutationFn: (payload: SetConfigPayload) => ubusCall('ns.flows', 'set-configuration', payload),
  onSuccess: async () => {
    await Promise.all([
      uci.getChanges(),
      queryClient.invalidateQueries({ queryKey: ['flow', 'daemon'] })
    ])
    configuringDaemon.value = false
  },
  onError: (err) => {
    if (err instanceof ValidationError) {
      validationBag.value = err.errorBag
    }
  },
  onMutate: () => {
    validationBag.value = new MessageBag()
  }
})

function submit() {
  mutate({
    enabled: enabled.value,
    expired_persistence: expiredPersistence.value
  })
}
</script>

<template>
  <NeSkeleton v-if="status == 'pending'" :lines="10" />
  <NeInlineNotification
    v-else-if="status == 'error'"
    :description="t(getAxiosErrorMessage(error))"
    :title="t('standalone.flows.unable_to_get_flows_configuration')"
    kind="error"
  />
  <div v-else class="space-y-4">
    <div class="flex flex-wrap items-start gap-4">
      <p class="mr-auto max-w-xl text-secondary-neutral">{{ t('standalone.flows.subtitle') }}</p>
      <NeButton kind="secondary" size="lg" @click="configuringDaemon = true">
        {{ t('standalone.flows.configure_flows_daemon') }}
      </NeButton>
    </div>
    <NeInlineNotification
      v-if="!data!.configuration.enabled"
      :description="t('standalone.flows.daemon_disabled_description')"
      :title="t('standalone.flows.daemon_disabled')"
      kind="info"
    />
    <FlowsTable v-else />
  </div>
  <NeSideDrawer
    :is-shown="configuringDaemon"
    :title="t('standalone.flows.configure_flows_daemon')"
    @close="configuringDaemon = false"
  >
    <form v-if="status == 'success'" class="space-y-8" @submit.prevent="submit">
      <NeInlineNotification
        v-if="mutationError != null && validationBag.size < 1"
        :description="t(getAxiosErrorMessage(mutationError))"
        :title="t('standalone.flows.unable_to_configure_flows_daemon')"
        kind="error"
      />
      <NeToggle
        v-model="enabled"
        :disabled="isPending"
        :label="enabled ? t('common.enabled') : t('common.disabled')"
        :top-label="t('standalone.flows.daemon_enabled')"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('enabled'))"
      />
      <NeTextInput
        v-model="expiredPersistence"
        :disabled="isPending"
        :label="t('standalone.flows.persistence_after_expiration')"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('expired_persistence'))"
      />
      <hr />
      <div class="flex flex-wrap justify-end gap-6">
        <NeButton :disabled="isPending" kind="tertiary" @click="configuringDaemon = false">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="isPending" :loading="isPending" kind="primary" type="submit">
          {{ t('common.configure') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
