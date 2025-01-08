<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import FormLayout from '../../FormLayout.vue'
import { NeCombobox, NeToggle, NeTooltip, type NeComboboxOption } from '@nethesis/vue-components'
import { NeButton, NeSkeleton, NeInlineNotification } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { onMounted } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import NeMultiTextInput from '../../NeMultiTextInput.vue'
import {
  MessageBag,
  validatePort,
  validateRequired,
  validateRequiredOption
} from '@/lib/validation'
import { useThreatShield } from '@/composables/useThreatShield'
import { useFirewallStore } from '@/stores/standalone/firewall'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const firewallConfig = useFirewallStore()
const {
  dnsSettings,
  loadingListDnsSettings,
  loadingEditDnsSettings,
  errorListDnsSettings,
  errorListDnsSettingsDetails,
  errorEditDnsSettings,
  errorEditDnsSettingsDetails,
  listDnsSettings,
  editDnsSettings
} = useThreatShield()

const isThreatShieldEnabled = ref(false)
const selectedZones = ref<NeComboboxOption[]>([])
const ports = ref([''])
const errorBag = ref(new MessageBag())
const portsErrors = ref<string[]>([])

const zonesOptions = computed(() => {
  return firewallConfig.zones.map((zone) => ({
    id: zone.name,
    label: zone.name
  }))
})

// update form when dns settings are loaded
watch(
  dnsSettings,
  () => {
    if (!dnsSettings.value) {
      return
    }
    isThreatShieldEnabled.value = dnsSettings.value.enabled
    ports.value = dnsSettings.value.ports
    selectedZones.value = dnsSettings.value.zones.map((zone) => {
      return zonesOptions.value.find((z) => z.id === zone)
    })
  },
  { immediate: true }
)

async function loadData() {
  firewallConfig.fetch()
  uciChangesStore.getChanges()
  listDnsSettings()
}

function validate() {
  errorEditDnsSettings.value = ''
  errorEditDnsSettingsDetails.value = ''
  errorBag.value.clear()

  portsErrors.value = []
  ports.value.forEach(() => {
    portsErrors.value.push('')
  })
  let isValidationOk = true

  // no validation if threat shield is disabled

  if (!isThreatShieldEnabled.value) {
    return true
  }

  // zones

  let zonesValidation = validateRequiredOption(selectedZones.value)
  if (!zonesValidation.valid) {
    errorBag.value.set('zones', [t(String(zonesValidation.errMessage))])
    isValidationOk = false
  }

  for (const [index, port] of ports.value.entries()) {
    // required

    const portRequiredValidation = validateRequired(port)
    if (!portRequiredValidation.valid) {
      portsErrors.value[index] = t(portRequiredValidation.errMessage as string)
      isValidationOk = false
      continue
    }

    // valid port number

    const portNumberValidation = validatePort(port)
    if (!portNumberValidation.valid) {
      portsErrors.value[index] = t(portNumberValidation.errMessage as string)
      isValidationOk = false
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
    await editDnsSettings({
      enabled: isThreatShieldEnabled.value,
      zones: selectedZones.value.map((zone: NeComboboxOption) => zone.id),
      ports: ports.value
    })
    loadData()
    uciChangesStore.getChanges()
  } catch (err: unknown) {
    // exception already handled in useThreatShield composable
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <div class="max-w-4xl">
      <div class="space-y-8">
        <!-- dns-list-settings error -->
        <NeInlineNotification
          v-if="errorListDnsSettings"
          kind="error"
          :title="t('error.cannot_retrieve_threat_shield_settings')"
          :description="errorListDnsSettings"
        >
          <template #details v-if="errorListDnsSettingsDetails">
            {{ errorListDnsSettingsDetails }}
          </template>
        </NeInlineNotification>
        <template v-else>
          <FormLayout
            :title="t('standalone.threat_shield_dns.threat_shield_settings')"
            :description="t('standalone.threat_shield_dns.threat_shield_settings_description')"
          >
            <div class="space-y-8">
              <NeSkeleton :lines="4" v-if="loadingListDnsSettings" size="lg" />
              <template v-else>
                <!-- status -->
                <NeToggle
                  :top-label="t('standalone.threat_shield_dns.status')"
                  :label="isThreatShieldEnabled ? t('common.enabled') : t('common.disabled')"
                  v-model="isThreatShieldEnabled"
                />
                <template v-if="isThreatShieldEnabled">
                  <!-- zones -->
                  <NeCombobox
                    :label="t('standalone.threat_shield_dns.zones')"
                    v-model="selectedZones"
                    :options="zonesOptions"
                    :placeholder="
                      firewallConfig.loading || loadingListDnsSettings
                        ? t('common.loading')
                        : t('ne_combobox.choose_multiple')
                    "
                    multiple
                    :disabled="loadingEditDnsSettings || firewallConfig.loading"
                    :invalidMessage="errorBag.getFirstFor('zones')"
                    :optionalLabel="t('common.optional')"
                    :noResultsLabel="t('ne_combobox.no_results')"
                    :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
                    :noOptionsLabel="t('ne_combobox.no_options_label')"
                    :selected-label="t('ne_combobox.selected')"
                    :user-input-label="t('ne_combobox.user_input_label')"
                  >
                    <template #tooltip>
                      <NeTooltip>
                        <template #content>
                          {{ t('standalone.threat_shield_dns.zones_tooltip') }}
                        </template>
                      </NeTooltip>
                    </template>
                  </NeCombobox>
                  <!-- ports -->
                  <NeMultiTextInput
                    v-model="ports"
                    :add-item-label="t('standalone.threat_shield_dns.add_port')"
                    :title="t('standalone.threat_shield_dns.redirected_ports')"
                    required
                    :disabledInputs="loadingEditDnsSettings"
                    :invalid-messages="portsErrors"
                  >
                    <template #tooltip>
                      <NeTooltip>
                        <template #content>
                          {{ t('standalone.threat_shield_dns.redirected_ports_tooltip') }}
                        </template>
                      </NeTooltip>
                    </template>
                  </NeMultiTextInput>
                </template>
              </template>
            </div>
          </FormLayout>
          <hr />
          <FormLayout>
            <div class="space-y-8">
              <!-- dns-edit-settings error -->
              <NeInlineNotification
                v-if="errorEditDnsSettings"
                kind="error"
                :title="t('error.cannot_save_threat_shield_settings')"
                :description="errorEditDnsSettings"
              >
                <template #details v-if="errorEditDnsSettingsDetails">
                  {{ errorEditDnsSettingsDetails }}
                </template>
              </NeInlineNotification>
              <!-- save button -->
              <NeButton
                kind="primary"
                :disabled="loadingEditDnsSettings || loadingListDnsSettings"
                :loading="loadingEditDnsSettings"
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
  </div>
</template>
