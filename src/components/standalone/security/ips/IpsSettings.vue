<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import {
  getAxiosErrorMessage,
  NeBadge,
  NeButton,
  NeInlineNotification,
  NeLink,
  NeRadioSelection,
  NeTextInput,
  NeToggle,
  NeTooltip,
  NeSkeleton
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faFloppyDisk } from '@fortawesome/free-solid-svg-icons'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { onMounted, ref } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import { useIpsStatusStore } from '@/stores/standalone/ipsStatus'

export type IpsSettings = {
  enabled: boolean
  ns_policy: Policy
  oinkcode: string
}

export type Policy = 'connectivity' | 'balanced' | 'security' | 'max-detect'

const ips = useIpsStatusStore()

const { t } = useI18n()
const options: Array<{
  id: Policy
  label: string
  description: string
}> = [
  {
    id: 'connectivity',
    label: t('standalone.ips.connectivity'),
    description: t('standalone.ips.connectivity_description')
  },
  {
    id: 'balanced',
    label: t('standalone.ips.balanced'),
    description: t('standalone.ips.balanced_description')
  },
  {
    id: 'security',
    label: t('standalone.ips.security'),
    description: t('standalone.ips.security_description')
  }
]

const uciChangesStore = useUciPendingChangesStore()

const loading = ref(true)
const error = ref<Error>()
const enabled = ref(false)
const policy = ref<Policy>('connectivity')
const oinkcode = ref('')

function fetch() {
  error.value = undefined
  ubusCall('ns.snort', 'settings', {})
    .then((response: AxiosResponse<IpsSettings>) => {
      enabled.value = response.data.enabled
      policy.value = response.data.ns_policy
      oinkcode.value = response.data.oinkcode
    })
    .catch((reason: Error) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

onMounted(() => {
  fetch()
})

const saving = ref(false)
const saveError = ref<Error>()

function save() {
  saving.value = true
  saveError.value = undefined
  ubusCall('ns.snort', 'save-settings', {
    enabled: enabled.value,
    ns_policy: policy.value,
    oinkcode: oinkcode.value
  })
    .then(() => {
      ips.enabled = enabled.value
      uciChangesStore.getChanges()
    })
    .catch((reason: Error) => {
      saveError.value = reason
    })
    .finally(() => {
      saving.value = false
    })
}

const checkingOinkcode = ref(false)
/*
  these variables are decoupled only for the sake of the UI and the different messages that
  needs to be shown to the user
   */
const validOinkcode = ref(false)
const invalidOinkcode = ref(false)

function checkOinkcode() {
  checkingOinkcode.value = true
  error.value = undefined
  validOinkcode.value = false
  invalidOinkcode.value = false
  ubusCall('ns.snort', 'check-oinkcode', {
    oinkcode: oinkcode.value
  })
    .then(() => {
      validOinkcode.value = true
      setTimeout(() => {
        validOinkcode.value = false
      }, 5000)
    })
    .catch((reason: Error) => {
      if (reason instanceof ValidationError) {
        invalidOinkcode.value = true
      } else {
        error.value = reason
      }
    })
    .finally(() => {
      checkingOinkcode.value = false
    })
}
</script>

<template>
  <div class="max-w-3xl">
    <FormLayout
      :description="t('standalone.ips.ips_settings_description')"
      :title="t('standalone.ips.ips_status')"
    >
      <NeSkeleton v-if="loading" :lines="10" />
      <form v-else class="space-y-8" @submit.prevent="save">
        <NeInlineNotification
          v-if="saveError"
          :description="t(getAxiosErrorMessage(saveError))"
          :title="t('error.cannot_open_unit')"
          kind="error"
        />
        <NeToggle
          v-model="enabled"
          :disabled="saving"
          :label="enabled ? t('common.enabled') : t('common.disabled')"
          :top-label="t('common.status')"
        />
        <template v-if="enabled">
          <!-- If the value is not max-detect, show the radio selection -->
          <NeRadioSelection
            v-if="policy != 'max-detect'"
            v-model="policy"
            :disabled="saving"
            :options="options"
          >
            <template #label>{{ t('standalone.ips.policy') }}</template>
          </NeRadioSelection>
          <NeInlineNotification
            v-else
            kind="info"
            :title="t('standalone.ips.max_detect_info')"
            :description="t('standalone.ips.max_detect_description')"
          />
          <div class="space-y-2">
            <NeTextInput
              v-model="oinkcode"
              :disabled="saving"
              :invalid-message="invalidOinkcode ? t('standalone.ips.oinkcode_invalid') : ''"
              :label="t('standalone.ips.oinkcode')"
              autocomplete="off"
              is-password
            >
              <template #tooltip>
                <NeTooltip>
                  <template #content>
                    <i18n-t keypath="standalone.ips.oinkcode_tooltip" tag="p">
                      <NeLink href="https://www.snort.org/" target="_blank" inverted-theme>
                        https://www.snort.org
                      </NeLink>
                    </i18n-t>
                  </template>
                </NeTooltip>
              </template>
            </NeTextInput>
            <div class="flex items-center gap-4">
              <NeButton
                :disabled="checkingOinkcode"
                :loading="checkingOinkcode"
                @click="checkOinkcode"
              >
                {{ t('standalone.ips.verify_oinkcode') }}
              </NeButton>
              <Transition name="fade">
                <NeBadge
                  v-if="validOinkcode"
                  :icon="faCheck"
                  :text="t('standalone.ips.oinkcode_verified')"
                  kind="success"
                />
              </Transition>
            </div>
          </div>
        </template>
        <hr />
        <NeButton :disabled="saving" :loading="saving" kind="primary" type="submit">
          <template #prefix>
            <FontAwesomeIcon :icon="faFloppyDisk" />
          </template>
          {{ t('common.save') }}
        </NeButton>
      </form>
    </FormLayout>
  </div>
</template>
