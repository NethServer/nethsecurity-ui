<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import {
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeFormItemLabel,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import { AxiosError } from 'axios'
import { MessageBag, validateHost } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

interface DefaultsMwanResponse {
  values: {
    initial_state: string
    protocol: string
    track_ip: string[]
    tracking_method: string
    tracking_reliability: number
    ping_count: number
    ping_size: number
    ping_max_ttl: number
    ping_timeout: number
    ping_interval: number
    ping_failure_interval: number
    ping_recovery_interval: number
    interface_down_threshold: number
    interface_up_threshold: number
    link_quality: boolean
    quality_failure_latency: number
    quality_failure_packet_loss: number
    quality_recovery_latency: number
    quality_recovery_packet_loss: number
  }
}

interface MwanConfiguration {
  track_ip: string[]
  ping_timeout: string
  ping_interval: string
  ping_failure_interval: string
  interface_down_threshold: string
  interface_up_threshold: string
}

const data = ref<MwanConfiguration>({
  track_ip: [],
  ping_timeout: '',
  ping_interval: '',
  ping_failure_interval: '',
  interface_down_threshold: '',
  interface_up_threshold: ''
})

const networkError = ref<Error>()
const loading = ref(false)
const messageBag = ref<MessageBag>(new MessageBag())
const sending = ref(false)

function timeoutOptions(intervals: number[]): Array<NeComboboxOption> {
  return Array.from(intervals, (value) => {
    if (value >= 60 * 60) {
      return {
        id: value.toString(),
        label: `${t('standalone.multi_wan.hours', value / 60 / 60)}`
      }
    } else if (value >= 60) {
      return {
        id: value.toString(),
        label: `${t('standalone.multi_wan.minutes', value / 60)}`
      }
    } else {
      return {
        id: value.toString(),
        label: `${t('standalone.multi_wan.seconds', value)}`
      }
    }
  })
}

function pingsOptions(intervals: number[]): Array<NeComboboxOption> {
  return Array.from(intervals, (value) => {
    return {
      id: value.toString(),
      label: `${t('standalone.multi_wan.ping_test', value)}`
    }
  })
}

function fetchData() {
  loading.value = true
  networkError.value = undefined
  ubusCall('ns.mwan', 'get_default_config')
    .then((response: AxiosResponse<DefaultsMwanResponse>) => {
      data.value = {
        track_ip: response.data.values.track_ip,
        ping_timeout: String(response.data.values.ping_timeout),
        ping_interval: String(response.data.values.ping_interval),
        ping_failure_interval: String(response.data.values.ping_failure_interval),
        interface_down_threshold: String(response.data.values.interface_down_threshold),
        interface_up_threshold: String(response.data.values.interface_up_threshold)
      }
    })
    .catch((error: AxiosError) => {
      networkError.value = new Error(t(getAxiosErrorMessage(error)))
    })
    .then(() => {
      loading.value = false
    })
}

function validate(): boolean {
  messageBag.value.clear()
  if (data.value.track_ip.length == 0) {
    messageBag.value.set('track_ip', [t('standalone.validation.required')])
  }
  data.value.track_ip.forEach((value, index) => {
    const { valid, errMessage } = validateHost(value)
    if (!valid) {
      messageBag.value.set(`track_ip.${index}`, [t(errMessage as string)])
    }
  })
  return messageBag.value.size == 0
}

function sendData() {
  sending.value = true
  if (validate()) {
    ubusCall('ns.mwan', 'set_default_config', data.value)
      .then(() => {
        uciChangesStore.getChanges()
      })
      .catch((exception: AxiosError) => {
        networkError.value = new Error(t(getAxiosErrorMessage(exception)))
      })
      .finally(() => {
        sending.value = false
        fetchData()
      })
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <NeSkeleton v-if="loading" :lines="20" />
  <div v-else class="max-w-3xl space-y-8">
    <NeInlineNotification v-if="networkError" :kind="'error'" :title="networkError.message" />
    <FormLayout
      :description="t('standalone.multi_wan.tracking_hostnames_or_ips_description')"
      :title="t('standalone.multi_wan.tracking_hostnames_or_ips_title')"
    >
      <div class="space-y-4">
        <NeFormItemLabel class="mb-0">
          {{ t('standalone.multi_wan.tracking_hostnames_or_ips') }}
        </NeFormItemLabel>
        <template v-if="data.track_ip.length > 0">
          <div v-for="index in data.track_ip.keys()" :key="index" class="flex items-center">
            <div class="grow">
              <NeTextInput
                v-model.trim="data.track_ip[index]"
                :disabled="sending"
                :invalid-message="messageBag.get(`track_ip.${index}`)?.[0]"
              />
            </div>
            <NeButton
              :disabled="sending"
              class="ml-2 h-8 w-8"
              kind="tertiary"
              size="lg"
              @click="data.track_ip.splice(index, 1)"
            >
              <FontAwesomeIcon :icon="['fas', 'trash']" aria-hidden="true" />
            </NeButton>
          </div>
        </template>
        <template v-else>
          <p class="text-xs font-normal">{{ t('standalone.multi_wan.no_hostnames_or_ips') }}</p>
          <p v-if="messageBag.has('track_ip')" class="text-sm text-rose-700 dark:text-rose-400">
            {{ messageBag.get('track_ip')?.[0] }}
          </p>
        </template>
        <div class="flex">
          <NeButton :disabled="sending" class="ml-auto" @click="data.track_ip.push('')">
            <template #prefix>
              <FontAwesomeIcon icon="add" />
            </template>
            {{ t('standalone.multi_wan.add_hostname_or_ip') }}
          </NeButton>
        </div>
      </div>
    </FormLayout>
    <hr />
    <FormLayout
      :description="t('standalone.multi_wan.ping_settings_description')"
      :title="t('standalone.multi_wan.ping_settings_title')"
    >
      <div class="space-y-3">
        <NeCombobox
          v-model="data.ping_timeout"
          :disabled="sending"
          :invalid-message="messageBag.get('ping.timeout')?.[0]"
          :label="t('standalone.multi_wan.ping_timeout')"
          :options="timeoutOptions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model.number="data.ping_interval"
          :disabled="sending"
          :label="t('standalone.multi_wan.ping_interval')"
          :options="timeoutOptions([1, 3, 5, 10, 20, 30, 60, 300, 600, 900, 1800, 3600])"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model.number="data.ping_failure_interval"
          :disabled="sending"
          :label="t('standalone.multi_wan.ping_failure_interval')"
          :options="timeoutOptions([1, 3, 5, 10, 20, 30, 60, 300, 600, 900, 1800, 3600])"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
      </div>
    </FormLayout>
    <hr />
    <FormLayout
      :description="t('standalone.multi_wan.interface_recovery_description')"
      :title="t('standalone.multi_wan.interface_recovery_title')"
    >
      <div class="space-y-3">
        <NeCombobox
          v-model="data.interface_down_threshold"
          :disabled="sending"
          :label="t('standalone.multi_wan.interface_down')"
          :options="pingsOptions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
        <NeCombobox
          v-model="data.interface_up_threshold"
          :disabled="sending"
          :label="t('standalone.multi_wan.interface_up')"
          :options="pingsOptions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])"
          :noResultsLabel="t('ne_combobox.no_results')"
          :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
          :noOptionsLabel="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optionalLabel="t('common.optional')"
        />
      </div>
    </FormLayout>
    <hr />
    <NeButton :disabled="sending" :loading="sending" kind="primary" @click="sendData()">
      {{ t('common.save') }}
    </NeButton>
  </div>
</template>
