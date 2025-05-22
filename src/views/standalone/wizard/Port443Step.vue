<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeHeading,
  NeCard,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeToggle
} from '@nethesis/vue-components'
import { faArrowRight, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, ref, watchEffect } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { FirewallRule } from '@/stores/standalone/firewall'
import { cloneDeep } from 'lodash-es'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'

const props = defineProps<{
  inputRules: FirewallRule[]
}>()

const emit = defineEmits<{
  nextStep: []
  previousStep: []
}>()

const { t } = useI18n()
const wizardStore = useSetupWizardStore()
const isSetWebInterfaceCompleted = ref(false)
const isSaveRuleCompleted = ref(false)
const loadingSetWebInterface = ref(false)
const loadingSaveRule = ref(false)
const errorSetWebInterface = ref('')
const errorSetWebInterfaceDetails = ref('')
const errorSaveRule = ref('')
const errorSaveRuleDetails = ref('')

const tcp443rule = computed(() => {
  return props.inputRules.find((rule) => rule.id === 'ns_allow_https')
})

watchEffect(() => {
  if (isSaveRuleCompleted.value && isSetWebInterfaceCompleted.value) {
    emit('nextStep')
  }
})

function saveSettings() {
  saveRule()
  setWebInterface()
}

async function saveRule() {
  errorSaveRule.value = ''
  errorSaveRuleDetails.value = ''
  loadingSaveRule.value = true
  const ruleData = cloneDeep(tcp443rule.value)

  if (ruleData) {
    if (wizardStore.port443WanAccessEnabled) {
      ruleData.enabled = true
    } else {
      ruleData.enabled = false
    }

    // edit-rule api needs this field
    ruleData.dest = ''

    try {
      await ubusCall('ns.firewall', 'edit-rule', ruleData)
      isSaveRuleCompleted.value = true
    } catch (err: unknown) {
      console.error(err)
      errorSaveRule.value = t(getAxiosErrorMessage(err))
      errorSaveRuleDetails.value = String(err)
    } finally {
      loadingSaveRule.value = false
    }
  }
}

async function setWebInterface() {
  errorSetWebInterface.value = ''
  errorSetWebInterfaceDetails.value = ''
  loadingSetWebInterface.value = true
  const nsuiEnableValue = wizardStore.port443WebInterfaceEnabled ? '1' : '0'

  try {
    await ubusCall('uci', 'set', {
      config: 'ns-ui',
      section: 'config',
      values: { nsui_enable: nsuiEnableValue }
    })
    isSetWebInterfaceCompleted.value = true
  } catch (err: unknown) {
    console.error(err)
    errorSetWebInterface.value = t(getAxiosErrorMessage(err))
    errorSetWebInterfaceDetails.value = String(err)
  } finally {
    loadingSetWebInterface.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <NeHeading tag="h2">
      {{ t('standalone.wizard.web_access_443_title') }}
    </NeHeading>
    <p>{{ t('standalone.wizard.web_access_443_description') }}</p>
  </div>
  <div class="space-y-6">
    <NeCard :title="t('standalone.wizard.settings')">
      <div class="space-y-6">
        <NeToggle
          v-model="wizardStore.port443WebInterfaceEnabled"
          :top-label="t('standalone.wizard.web_interface_service_on_tcp_port_443')"
          :label="
            wizardStore.port443WebInterfaceEnabled ? t('common.enabled') : t('common.disabled')
          "
          :disabled="loadingSetWebInterface || loadingSaveRule"
        />
        <NeToggle
          v-model="wizardStore.port443WanAccessEnabled"
          :top-label="t('standalone.wizard.wan_access_on_tcp_port_443')"
          :label="wizardStore.port443WanAccessEnabled ? t('common.enabled') : t('common.disabled')"
          :disabled="loadingSetWebInterface || loadingSaveRule"
        />
      </div>
    </NeCard>
    <!-- set web interface error notification -->
    <NeInlineNotification
      v-if="errorSetWebInterface"
      kind="error"
      :title="t('error.cannot_set_uci_configuration')"
      :description="errorSetWebInterface"
    >
      <template v-if="errorSetWebInterfaceDetails" #details>
        {{ errorSetWebInterfaceDetails }}
      </template>
    </NeInlineNotification>
    <!-- save rule error notification -->
    <NeInlineNotification
      v-if="errorSetWebInterface"
      kind="error"
      :title="t('error.cannot_save_firewall_rule')"
      :description="errorSetWebInterface"
    >
      <template v-if="errorSetWebInterfaceDetails" #details>
        {{ errorSetWebInterfaceDetails }}
      </template>
    </NeInlineNotification>
    <!-- footer -->
    <hr />
    <div class="flex flex-row-reverse gap-6">
      <NeButton
        kind="primary"
        size="lg"
        type="submit"
        :disabled="loadingSetWebInterface || loadingSaveRule"
        :loading="loadingSetWebInterface || loadingSaveRule"
        @click.prevent="saveSettings"
      >
        <template #suffix>
          <FontAwesomeIcon :icon="faArrowRight" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('common.next') }}
      </NeButton>
      <NeButton kind="tertiary" size="lg" @click.prevent="emit('previousStep')">
        <template #prefix>
          <FontAwesomeIcon :icon="faArrowLeft" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('common.previous') }}
      </NeButton>
    </div>
  </div>
</template>
