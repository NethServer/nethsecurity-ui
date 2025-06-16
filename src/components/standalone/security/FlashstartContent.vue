<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import {
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeLink,
  NeSkeleton,
  NeTextInput,
  NeToggle,
  NeTooltip,
  NeRadioSelection
} from '@nethesis/vue-components'
import NeMultiTextInput from '@/components/standalone/NeMultiTextInput.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { MessageBag } from '@/lib/validation'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { AxiosError, type AxiosResponse } from 'axios'
import { faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'

type ListZonesResponse = AxiosResponse<{
  values: {
    label: string
    id: string
  }[]
}>

type GetConfigResponse = AxiosResponse<{
  values: {
    enabled: boolean
    proplus: boolean
    username: string
    password: string
    bypass: string[]
    zones: string[]
    custom_servers: string[]
  }
}>

type ModeTypes = 'pro' | 'proplus'

type RadioSelection = Array<{
  id: ModeTypes
  label: string
}>

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const status = ref(false)
const mode = ref<ModeTypes>('pro')
const radioOptions: RadioSelection = [
  {
    label: t('standalone.flashstart.pro'),
    id: 'pro'
  },
  {
    label: t('standalone.flashstart.proplus') + ' (BETA)',
    id: 'proplus'
  }
]
const username = ref('')
const password = ref('')
const bypassSource = ref<Array<string>>([])
const customServers = ref<Array<string>>([])
const availableZones = ref<NeComboboxOption[]>([])
const zones = ref<NeComboboxOption[]>([])

const fetchError = ref<Error>()
const fetchLoading = ref(false)

function fetchConfig() {
  fetchError.value = undefined
  fetchLoading.value = true
  Promise.all([
    ubusCall('ns.flashstart', 'list-zones').then((response: ListZonesResponse) => {
      availableZones.value = response.data.values.map((item) => {
        return {
          label: item.label,
          id: item.label
        }
      })
    }),
    ubusCall('ns.flashstart', 'get-config').then((response: GetConfigResponse) => {
      status.value = response.data.values.enabled
      if (response.data.values.proplus) {
        mode.value = 'proplus'
      } else {
        mode.value = 'pro'
      }
      username.value = response.data.values.username
      password.value = response.data.values.password
      zones.value = response.data.values.zones.map((item) => {
        return {
          label: item,
          id: item
        }
      })
      if (response.data.values.bypass.length > 0) {
        bypassSource.value = response.data.values.bypass
      } else {
        bypassSource.value = ['']
      }
      if (response.data.values.custom_servers.length > 0) {
        customServers.value = response.data.values.custom_servers
      } else {
        customServers.value = ['']
      }
    })
  ])
    .catch((reason: AxiosError) => (fetchError.value = reason))
    .finally(() => (fetchLoading.value = false))
}

const statusLabel = computed(() => {
  if (status.value) {
    return t('standalone.flashstart.status_enabled')
  } else {
    return t('standalone.flashstart.status_disabled')
  }
})

onMounted(() => fetchConfig())

const saving = ref(false)
const saveError = ref<Error>()
const validationBag = ref(new MessageBag())

function save() {
  validationBag.value.clear()
  saveError.value = undefined
  saving.value = true
  ubusCall('ns.flashstart', 'set-config', {
    enabled: status.value,
    proplus: mode.value == 'proplus',
    username: username.value,
    password: password.value,
    zones: zones.value.map((zone: NeComboboxOption) => zone.label),
    bypass: bypassSource.value.filter((item) => item != ''),
    custom_servers: customServers.value.filter((item) => item != '')
  })
    .then(() => uciChangesStore.getChanges())
    .catch((reason) => {
      if (reason instanceof ValidationError) {
        validationBag.value = reason.errorBag
      } else {
        saveError.value = reason
      }
    })
    .finally(() => (saving.value = false))
}
</script>

<template>
  <div>
    <FormLayout :title="t('standalone.flashstart.content_title')" class="max-w-3xl">
      <template #description>
        <i18n-t keypath="standalone.flashstart.content_description" tag="p" scope="global">
          <template #createAccount>
            <NeLink href="https://flashstart.nethesis.it/" target="_blank">
              {{ t('standalone.flashstart.content_link') }}
            </NeLink>
          </template>
        </i18n-t>
      </template>
      <NeSkeleton v-if="fetchLoading" :lines="5" />
      <NeInlineNotification
        v-else-if="fetchError"
        kind="error"
        :description="t(getAxiosErrorMessage(fetchError))"
        :title="t('error.cannot_retrieve_flashstart_configuration')"
      />
      <form v-else class="space-y-6">
        <NeToggle
          v-model="status"
          :label="statusLabel"
          :top-label="t('standalone.flashstart.status')"
        />
        <template v-if="status">
          <NeRadioSelection
            v-model="mode"
            :label="t('standalone.flashstart.service_type')"
            :options="radioOptions"
          />
          <NeTextInput
            v-model="username"
            :invalid-message="t(validationBag.getFirstI18nKeyFor('username'))"
            :label="t('standalone.flashstart.username')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  <i18n-t keypath="standalone.flashstart.username_helper" tag="span" scope="global">
                    <template #flashstartUrl>
                      <NeLink inverted-theme href="https://flashstart.nethesis.it/" target="_blank">
                        https://flashstart.nethesis.it/
                      </NeLink>
                    </template>
                  </i18n-t>
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeTextInput
            v-model="password"
            is-password
            :label="t('standalone.flashstart.password')"
            :invalid-message="t(validationBag.getFirstI18nKeyFor('password'))"
          />
          <NeCombobox
            v-model="zones"
            :label="t('standalone.flashstart.zones')"
            :placeholder="t('standalone.flashstart.zones_placeholder')"
            :invalid-message="t(validationBag.getFirstI18nKeyFor('zones'))"
            multiple
            :options="availableZones"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :no-options-label="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optional-label="t('common.optional')"
          />
          <NeMultiTextInput
            v-model="bypassSource"
            :title="t('standalone.flashstart.sourcebypass')"
            :add-item-label="t('standalone.flashstart.add_sourcebypass')"
            :general-invalid-message="t(validationBag.getFirstI18nKeyFor('bypass'))"
            :disable-inputs="saving"
            :disable-add-button="saving"
            optional
            :optional-label="t('common.optional')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.flashstart.sourcebypass_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeMultiTextInput>
          <NeMultiTextInput
            v-model="customServers"
            :title="t('standalone.flashstart.custom_servers')"
            :add-item-label="t('standalone.flashstart.add_custom_servers')"
            :general-invalid-message="t(validationBag.getFirstI18nKeyFor('custom_servers'))"
            :disable-inputs="saving"
            :disable-add-button="saving"
            optional
            :optional-label="t('common.optional')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.flashstart.custom_server_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeMultiTextInput>
          <NeInlineNotification
            v-if="saveError"
            class="my-4"
            kind="error"
            :description="t(getAxiosErrorMessage(saveError))"
            :title="t('error.cannot_save_configuration')"
          />
        </template>
        <div class="mt-6">
          <NeButton :disabled="saving" :loading="saving" kind="primary" @click="save()">
            <template #prefix>
              <FontAwesomeIcon :icon="faFloppyDisk" aria-hidden="true" class="h-4 w-4" />
            </template>
            {{ t('common.save') }}
          </NeButton>
        </div>
      </form>
    </FormLayout>
  </div>
</template>
