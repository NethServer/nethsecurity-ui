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
import NeMultiTextInput from '../../NeMultiTextInput.vue'
import {
  MessageBag,
  validatePort,
  validateRequired,
  validateRequiredOption
} from '@/lib/validation'
import { useThreatShieldStore } from '@/stores/standalone/threatShield'

const { t } = useI18n()
const tsStore = useThreatShieldStore()
const isThreatShieldEnabled = ref(false)
const selectedZones = ref<NeComboboxOption[]>([])
const ports = ref([''])
const errorBag = ref(new MessageBag())
const portsErrors = ref<string[]>([])

const zonesOptions = computed(() => {
  return tsStore.dnsZones.map((zone) => ({
    id: zone,
    label: zone
  }))
})

// update form when dns settings are loaded
watch(
  () => tsStore.dnsSettings,
  () => {
    if (!tsStore.dnsSettings) {
      return
    }
    isThreatShieldEnabled.value = tsStore.dnsSettings.enabled
    ports.value = tsStore.dnsSettings.ports

    // set selected zones if dns zones have been loaded
    if (tsStore.dnsZones.length) {
      selectedZones.value = tsStore.dnsSettings.zones.map((zone) => {
        return zonesOptions.value.find((z) => z.id === zone)
      })
    }
  },
  { immediate: true }
)

// set selected zones when dns zones are loaded
watch(
  () => tsStore.dnsZones,
  () => {
    if (tsStore.dnsSettings) {
      selectedZones.value = tsStore.dnsSettings.zones.map((zone) => {
        return zonesOptions.value.find((z) => z.id === zone)
      })
    }
  },
  { immediate: true }
)

async function loadData() {
  tsStore.listDnsSettings()
  tsStore.listDnsZones()
}

function validate() {
  tsStore.errorEditDnsSettings = ''
  tsStore.errorEditDnsSettingsDetails = ''
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
    await tsStore.editDnsSettings({
      enabled: isThreatShieldEnabled.value,
      zones: selectedZones.value.map((zone: NeComboboxOption) => zone.id),
      ports: ports.value
    })
    loadData()
  } catch (err: unknown) {
    // exception already handled in threat shield store
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
          v-if="tsStore.errorListDnsSettings"
          kind="error"
          :title="t('error.cannot_retrieve_threat_shield_settings')"
          :description="tsStore.errorListDnsSettings"
        >
          <template #details v-if="tsStore.errorListDnsSettingsDetails">
            {{ tsStore.errorListDnsSettingsDetails }}
          </template>
        </NeInlineNotification>
        <template v-else>
          <FormLayout
            :title="t('standalone.threat_shield_dns.threat_shield_settings')"
            :description="t('standalone.threat_shield_dns.threat_shield_settings_description')"
          >
            <div class="space-y-8">
              <NeSkeleton :lines="11" v-if="tsStore.loadingListDnsSettings" size="lg" />
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
                      tsStore.loadingListDnsZones || tsStore.loadingListDnsSettings
                        ? t('common.loading')
                        : t('ne_combobox.choose_multiple')
                    "
                    multiple
                    :disabled="tsStore.loadingEditDnsSettings || tsStore.loadingListDnsZones"
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
                    :disabledInputs="tsStore.loadingEditDnsSettings"
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
                v-if="tsStore.errorEditDnsSettings"
                kind="error"
                :title="t('error.cannot_save_threat_shield_settings')"
                :description="tsStore.errorEditDnsSettings"
              >
                <template #details v-if="tsStore.errorEditDnsSettingsDetails">
                  {{ tsStore.errorEditDnsSettingsDetails }}
                </template>
              </NeInlineNotification>
              <!-- save button -->
              <NeButton
                kind="primary"
                :disabled="tsStore.loadingEditDnsSettings || tsStore.loadingListDnsSettings"
                :loading="tsStore.loadingEditDnsSettings"
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
