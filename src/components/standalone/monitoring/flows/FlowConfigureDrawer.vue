<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSideDrawer,
  NeTextInput,
  NeToggle
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import { MessageBag } from '@/lib/validation.ts'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'

const { t } = useI18n()

type SetConfigPayload = {
  enabled: boolean
  expired_persistence: string
}

const props = defineProps<{
  show: boolean
  enabled: boolean
  expiredPersistence: string
}>()

const emit = defineEmits<{
  close: []
}>()

const uci = useUciPendingChangesStore()
const queryClient = useQueryClient()

const _enabled = ref(false)
const _expiredPersistence = ref('')

watch(
  () => props.show,
  (isShown) => {
    if (isShown) {
      _enabled.value = props.enabled
      _expiredPersistence.value = props.expiredPersistence
    }
  }
)

const validationBag = ref(new MessageBag())

const { mutate, error, status, isPending } = useMutation({
  mutationFn: (payload: SetConfigPayload) => ubusCall('ns.flows', 'set-configuration', payload),
  onMutate: () => validationBag.value.clear(),
  onSuccess: async () => {
    await Promise.all([
      uci.getChanges(),
      queryClient.invalidateQueries({ queryKey: ['flow', 'config'] })
    ])
    emit('close')
  },
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      validationBag.value = e.errorBag
    }
  }
})

function submit() {
  mutate({
    enabled: _enabled.value,
    expired_persistence: _expiredPersistence.value
  })
}
</script>

<template>
  <NeSideDrawer
    :is-shown="show"
    :title="t('standalone.flows.configure_flows_daemon')"
    @close="emit('close')"
  >
    <form class="space-y-8" @submit.prevent="submit">
      <NeInlineNotification
        v-if="status == 'error' && validationBag.size < 1"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('standalone.flows.unable_to_configure_flows_daemon')"
        kind="error"
      />
      <NeToggle
        v-model="_enabled"
        :disabled="isPending"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('enabled'))"
        :label="_enabled ? t('common.enabled') : t('common.disabled')"
        :top-label="t('standalone.flows.daemon_enabled')"
      />
      <NeTextInput
        v-model="_expiredPersistence"
        :disabled="isPending"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('expired_persistence'))"
        :label="t('standalone.flows.persistence_after_expiration')"
      />
      <hr />
      <div class="flex flex-wrap justify-end gap-6">
        <NeButton :disabled="isPending" kind="tertiary" @click="emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="isPending" :loading="isPending" kind="primary" type="submit">
          {{ t('common.configure') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
