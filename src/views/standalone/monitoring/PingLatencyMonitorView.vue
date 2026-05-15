<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage,
  NeHeading
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { MessageBag } from '@/lib/validation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()
const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()

const hosts = ref<string[]>([''])
const validationBag = ref(new MessageBag())

const { data, isPending, isError, error } = useQuery({
  queryKey: ['telegraf', 'config'],
  queryFn: () => ubusCall('ns.telegraf', 'get-configuration', {}),
  select: (res) => res.data
})

watch(
  data,
  (newData) => {
    if (newData?.hosts?.length) {
      hosts.value = newData.hosts
    }
  },
  { immediate: true }
)

const hostErrors = computed(() =>
  hosts.value.map((_, i) => t(validationBag.value.getFirstI18nKeyFor(`hosts.${i}`)))
)

const {
  mutate,
  status: mutateStatus,
  error: mutateError,
  isPending: isSaving
} = useMutation({
  mutationFn: () => ubusCall('ns.telegraf', 'set-hosts', { hosts: hosts.value.filter((h) => h) }),
  onMutate: () => validationBag.value.clear(),
  onSuccess: async () => {
    await Promise.all([
      uci.getChanges(),
      queryClient.invalidateQueries({ queryKey: ['telegraf', 'config'] })
    ])
  },
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      validationBag.value = e.errorBag
    }
  }
})
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">
      {{ t('standalone.ping_latency_monitor.title') }}
    </NeHeading>
    <p class="mb-6 max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
      {{ t('standalone.ping_latency_monitor.description') }}
    </p>
    <NeSkeleton v-if="isPending" :lines="5" />
    <NeInlineNotification
      v-else-if="isError"
      class="my-4"
      kind="error"
      :title="t('error.cannot_retrieve_telegraf_configuration')"
      :description="t(getAxiosErrorMessage(error))"
    />
    <template v-else>
      <form class="max-w-md space-y-6" @submit.prevent="mutate()">
        <NeMultiTextInput
          v-model="hosts"
          :title="t('standalone.ping_latency_monitor.host_to_monitor')"
          :add-item-label="t('standalone.ping_latency_monitor.add_host')"
          :invalid-messages="hostErrors"
          :disable-inputs="isSaving"
          :disable-add-button="isSaving"
          optional
          :optional-label="t('common.optional')"
        />
        <NeInlineNotification
          v-if="mutateStatus === 'error' && validationBag.size < 1"
          class="my-4"
          kind="error"
          :title="t('error.cannot_save_configuration')"
          :description="t(getAxiosErrorMessage(mutateError))"
        />
        <hr />
        <div class="flex justify-end">
          <NeButton :disabled="isSaving" kind="primary" :loading="isSaving" type="submit">
            <template #prefix>
              <FontAwesomeIcon :icon="faFloppyDisk" class="h-4 w-4" aria-hidden="true" />
            </template>
            {{ t('common.save') }}
          </NeButton>
        </div>
      </form>
    </template>
  </div>
</template>
