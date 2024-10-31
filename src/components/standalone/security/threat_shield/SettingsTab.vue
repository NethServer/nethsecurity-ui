<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import FormLayout from '../../FormLayout.vue'
import {
  NeCombobox,
  NeTextInput,
  NeToggle,
  NeTooltip,
  type NeComboboxOption
} from '@nethesis/vue-components'
import {
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { onMounted } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import NeMultiTextInput from '../../NeMultiTextInput.vue'
import { MessageBag } from '@/lib/validation'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const isThreatShieldEnabled = ref(false)
const isLogPreroutingEnabled = ref(false)
const isLogInputEnabled = ref(false)
const isLogForwardEnabled = ref(false)
const isLogForwardLanEnabled = ref(false)
const isBlockBruteForceEnabled = ref(false)
const banTime = ref('')
const maxFailedAccesses = ref('')
const attackPatterns = ref([''])
const isBlockIcmpDosEnabled = ref(false)
const isBlockSynDosEnabled = ref(false)
const isBlockUdpDosEnabled = ref(false)
const errorBag = ref(new MessageBag())

const loading = ref({
  listSettings: false,
  editSettings: false
})

const error = ref({
  listSettings: '',
  listSettingsDetails: '',
  editSettings: '',
  editSettingsDetails: ''
})

const banTimeOptions = ref<NeComboboxOption[]>([
  { id: '10m', label: t('standalone.threat_shield.ten_minutes') },
  { id: '30m', label: t('standalone.threat_shield.thirty_minutes') },
  { id: '1h', label: t('standalone.threat_shield.one_hour') },
  { id: '6h', label: t('standalone.threat_shield.six_hours') },
  { id: '12h', label: t('standalone.threat_shield.twelve_hours') },
  { id: '1d', label: t('standalone.threat_shield.one_day') },
  { id: '3d', label: t('standalone.threat_shield.three_days') }
])

async function fetchSettings() {
  try {
    loading.value.listSettings = true
    const res = await ubusCall('ns.threatshield', 'list-settings')
    const threatShieldConfig = res.data.data
    isThreatShieldEnabled.value = threatShieldConfig.enabled
    isLogPreroutingEnabled.value = threatShieldConfig.ban_logprerouting
    isLogInputEnabled.value = threatShieldConfig.ban_loginput
    isLogForwardEnabled.value = threatShieldConfig.ban_logforwardwan
    isLogForwardLanEnabled.value = threatShieldConfig.ban_logforwardlan
    isBlockBruteForceEnabled.value = threatShieldConfig.ban_loglimit
    banTime.value = threatShieldConfig.ban_nftexpiry
    maxFailedAccesses.value = threatShieldConfig.ban_logcount.toString()
    attackPatterns.value = threatShieldConfig.ban_logterm
    isBlockIcmpDosEnabled.value = threatShieldConfig.ban_icmplimit
    isBlockSynDosEnabled.value = threatShieldConfig.ban_synlimit
    isBlockUdpDosEnabled.value = threatShieldConfig.ban_udplimit
  } catch (err: any) {
    error.value.listSettings = t(getAxiosErrorMessage(err))
    error.value.listSettingsDetails = err.toString()
  } finally {
    loading.value.listSettings = false
  }
}

async function reloadSettings() {
  await uciChangesStore.getChanges()
  await fetchSettings()
}

function clearErrors() {
  error.value.listSettings = ''
  error.value.listSettingsDetails = ''
  error.value.editSettings = ''
  error.value.editSettingsDetails = ''
}

function validate() {
  clearErrors()
  errorBag.value.clear()
  let isValidationOk = true

  if (isBlockBruteForceEnabled.value) {
    // max failed accesses

    if (isNaN(Number(maxFailedAccesses.value)) || Number(maxFailedAccesses.value) < 1) {
      errorBag.value.set('maxFailedAccess', [
        t('standalone.threat_shield.enter_a_number_greater_than_0')
      ])
      if (isValidationOk) {
        isValidationOk = false
      }
    }

    // attack patterns

    if (attackPatterns.value.length === 0 || !attackPatterns.value[0]) {
      errorBag.value.set('attackPatterns', [t('error.required')])
      if (isValidationOk) {
        isValidationOk = false
      }
    }
  }

  return isValidationOk
}

async function saveSettings() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  try {
    loading.value.editSettings = true

    // remove empty string patterns
    const patterns = attackPatterns.value.filter((pattern) => pattern)

    await ubusCall('ns.threatshield', 'edit-settings', {
      enabled: isThreatShieldEnabled.value,
      ban_logprerouting: isLogPreroutingEnabled.value,
      ban_loginput: isLogInputEnabled.value,
      ban_logforwardwan: isLogForwardEnabled.value,
      ban_logforwardlan: isLogForwardLanEnabled.value,
      ban_loglimit: isBlockBruteForceEnabled.value,
      ban_nftexpiry: banTime.value,
      ban_logcount: Number(maxFailedAccesses.value),
      ban_logterm: patterns,
      ban_icmplimit: isBlockIcmpDosEnabled.value,
      ban_synlimit: isBlockSynDosEnabled.value,
      ban_udplimit: isBlockUdpDosEnabled.value
    })
    reloadSettings()
  } catch (err: any) {
    error.value.editSettings = t(getAxiosErrorMessage(err))
    error.value.editSettingsDetails = err.toString()
  } finally {
    loading.value.editSettings = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <NeSkeleton :lines="6" v-if="loading.listSettings" size="lg" />
  <div class="max-w-4xl" v-else>
    <div class="space-y-8">
      <!-- list-settings error -->
      <NeInlineNotification
        v-if="error.listSettings"
        kind="error"
        :title="t('error.cannot_retrieve_threat_shield_settings')"
        :description="error.listSettings"
      >
        <template #details v-if="error.listSettingsDetails">
          {{ error.listSettingsDetails }}
        </template>
      </NeInlineNotification>
      <template v-else>
        <!-- status -->
        <div>
          <FormLayout
            :title="t('standalone.threat_shield.threat_shield_status')"
            :description="t('standalone.threat_shield.threat_shield_status_description')"
          >
            <NeToggle
              :top-label="t('standalone.threat_shield.status')"
              :label="isThreatShieldEnabled ? t('common.enabled') : t('common.disabled')"
              v-model="isThreatShieldEnabled"
              :disabled="loading.editSettings"
            />
          </FormLayout>
          <hr />
        </div>
        <template v-if="isThreatShieldEnabled">
          <!-- logging -->
          <div>
            <FormLayout
              :title="t('standalone.threat_shield.logging')"
              :description="t('standalone.threat_shield.logging_description')"
            >
              <div class="mb-8 space-y-6">
                <!-- monitoring not working warning -->
                <NeInlineNotification
                  v-if="
                    !isLogPreroutingEnabled &&
                    !isLogInputEnabled &&
                    !isLogForwardEnabled &&
                    !isLogForwardLanEnabled
                  "
                  kind="warning"
                  :title="t('standalone.threat_shield.threats_monitoring_disabled')"
                  :description="t('standalone.threat_shield.threats_monitoring_disabled_message')"
                  :closeAriaLabel="t('common.close')"
                />
                <NeToggle
                  :top-label="t('standalone.threat_shield.log_prerouting_chain')"
                  :label="isLogPreroutingEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isLogPreroutingEnabled"
                  :disabled="loading.editSettings"
                />
                <NeToggle
                  :top-label="t('standalone.threat_shield.log_input_chain')"
                  :label="isLogInputEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isLogInputEnabled"
                  :disabled="loading.editSettings"
                />
                <NeToggle
                  :top-label="t('standalone.threat_shield.log_forward_chain')"
                  :label="isLogForwardEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isLogForwardEnabled"
                  :disabled="loading.editSettings"
                />
                <NeToggle
                  :top-label="t('standalone.threat_shield.log_forward_lan_chain')"
                  :label="isLogForwardLanEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isLogForwardLanEnabled"
                  :disabled="loading.editSettings"
                />
              </div>
            </FormLayout>
            <hr />
          </div>
          <!-- block brute force -->
          <div>
            <FormLayout
              :title="t('standalone.threat_shield.block_brute_force')"
              :description="t('standalone.threat_shield.block_brute_force_description')"
            >
              <div class="mb-8 space-y-6">
                <!-- block brute force attacks -->
                <NeToggle
                  :top-label="t('standalone.threat_shield.block_brute_force')"
                  :label="isBlockBruteForceEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isBlockBruteForceEnabled"
                  :disabled="loading.editSettings"
                >
                  <template #topTooltip>
                    <NeTooltip>
                      <template #content>
                        {{ t('standalone.threat_shield.block_brute_force_tooltip') }}
                      </template>
                    </NeTooltip>
                  </template>
                </NeToggle>
                <template v-if="isBlockBruteForceEnabled">
                  <!-- ban after N failed accesses -->
                  <NeTextInput
                    :label="t('standalone.threat_shield.ban_after_n_attempts')"
                    v-model.number="maxFailedAccesses"
                    type="number"
                    min="1"
                    max="100"
                    :disabled="loading.editSettings"
                    :invalidMessage="errorBag.getFirstFor('maxFailedAccess')"
                  >
                    <template #tooltip>
                      <NeTooltip>
                        <template #content>
                          {{ t('standalone.threat_shield.ban_after_n_attempts_tooltip') }}
                        </template>
                      </NeTooltip>
                    </template>
                  </NeTextInput>
                  <!-- ban time -->
                  <NeCombobox
                    v-model="banTime"
                    :disabled="loading.editSettings"
                    :label="t('standalone.threat_shield.ban_time')"
                    :options="banTimeOptions"
                    :placeholder="t('ne_combobox.choose')"
                    :optionalLabel="t('common.optional')"
                    :noResultsLabel="t('ne_combobox.no_results')"
                    :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
                    :noOptionsLabel="t('ne_combobox.no_options_label')"
                    :selected-label="t('ne_combobox.selected')"
                    :userInputLabel="t('ne_combobox.user_input_label')"
                  >
                    <template #tooltip>
                      <NeTooltip>
                        <template #content>{{
                          t('standalone.threat_shield.ban_time_tooltip')
                        }}</template>
                      </NeTooltip>
                    </template>
                  </NeCombobox>
                  <!-- patterns to detect attacks -->
                  <NeMultiTextInput
                    v-model="attackPatterns"
                    :add-item-label="t('standalone.threat_shield.add_pattern')"
                    :title="t('standalone.threat_shield.attack_patterns')"
                    required
                    :disabledInputs="loading.editSettings"
                    :generalInvalidMessage="errorBag.getFirstFor('attackPatterns')"
                  >
                    <template #tooltip>
                      <NeTooltip>
                        <template #content>{{
                          t('standalone.threat_shield.attack_patterns_tooltip')
                        }}</template>
                      </NeTooltip>
                    </template>
                  </NeMultiTextInput>
                </template>
              </div>
            </FormLayout>
            <hr />
          </div>
          <!-- block dos -->
          <div>
            <FormLayout
              :title="t('standalone.threat_shield.block_dos')"
              :description="t('standalone.threat_shield.block_dos_description')"
            >
              <div class="mb-8 space-y-6">
                <!-- block icmp dos -->
                <NeToggle
                  :top-label="t('standalone.threat_shield.block_icmp_dos')"
                  :label="isBlockIcmpDosEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isBlockIcmpDosEnabled"
                  :disabled="loading.editSettings"
                />
                <!-- block syn dos -->
                <NeToggle
                  :top-label="t('standalone.threat_shield.block_syn_dos')"
                  :label="isBlockSynDosEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isBlockSynDosEnabled"
                  :disabled="loading.editSettings"
                />
                <!-- block udp dos -->
                <NeToggle
                  :top-label="t('standalone.threat_shield.block_udp_dos')"
                  :label="isBlockUdpDosEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isBlockUdpDosEnabled"
                  :disabled="loading.editSettings"
                />
              </div>
            </FormLayout>
            <hr />
          </div>
        </template>
        <FormLayout>
          <div class="mb-8 space-y-6">
            <!-- edit-settings error -->
            <NeInlineNotification
              v-if="error.editSettings"
              kind="error"
              :title="t('error.cannot_save_threat_shield_settings')"
              :description="error.editSettings"
            >
              <template #details v-if="error.editSettingsDetails">
                {{ error.editSettingsDetails }}
              </template>
            </NeInlineNotification>
            <!-- save button -->
            <NeButton
              kind="primary"
              :disabled="loading.editSettings"
              :loading="loading.editSettings"
              @click="saveSettings()"
            >
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'floppy-disk']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('common.save') }}
            </NeButton>
          </div>
        </FormLayout>
      </template>
    </div>
  </div>
</template>
