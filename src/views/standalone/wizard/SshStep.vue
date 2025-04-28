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
  NeTextInput,
  focusElement,
  getAxiosErrorMessage,
  NeToggle,
  NeInlineNotification
} from '@nethesis/vue-components'
import {
  faArrowRight,
  faArrowLeft,
  faCircleCheck,
  faCircleXmark
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ref } from 'vue'
import { MessageBag } from '@/lib/validation'
import { ubusCall } from '@/lib/standalone/ubus'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'

const emit = defineEmits<{
  nextStep: []
  previousStep: []
}>()

const { t } = useI18n()
const wizardStore = useSetupWizardStore()
const portRef = ref()
const validationErrors = ref(new MessageBag())
const loadingSaveSsh = ref(false)
const errorSaveSsh = ref('')
const errorSaveSshDetails = ref('')

function saveSshConfig() {
  errorSaveSsh.value = ''
  errorSaveSshDetails.value = ''

  if (!validate()) {
    return
  }
  loadingSaveSsh.value = true
  ubusCall('uci', 'set', {
    config: 'dropbear',
    section: '@dropbear[0]',
    values: {
      Port: wizardStore.sshPort,
      PasswordAuth: 'on',
      RootPasswordAuth: wizardStore.sshRootLoginWithPassword,
      GatewayPorts: 'off'
    }
  })
    .then(() => {
      emit('nextStep')
    })
    .catch((err: Error) => {
      errorSaveSsh.value = t(getAxiosErrorMessage(err))
      errorSaveSshDetails.value = String(err)
    })
    .finally(() => {
      loadingSaveSsh.value = false
    })
}

function validate() {
  validationErrors.value = new MessageBag()
  if (Number.isNaN(Number(wizardStore.sshPort))) {
    validationErrors.value.set('port', [t('standalone.ssh.ssh_access.tcp_port_invalid')])
    focusElement(portRef)
    return false
  }

  if (Number(wizardStore.sshPort) < 1) {
    validationErrors.value.set('port', [t('standalone.ssh.ssh_access.tcp_port_too_low')])
    focusElement(portRef)
    return false
  }

  if (Number(wizardStore.sshPort) > 65535) {
    validationErrors.value.set('port', [t('standalone.ssh.ssh_access.tcp_port_too_high')])
    focusElement(portRef)
    return false
  }
  return true
}
</script>

<template>
  <div class="space-y-2">
    <NeHeading tag="h2">
      {{ t('standalone.wizard.ssh_access') }}
    </NeHeading>
    <p>{{ t('standalone.wizard.ssh_access_description') }}</p>
  </div>
  <div class="space-y-6">
    <NeCard :title="t('standalone.wizard.default_access_configuration')">
      <div class="space-y-2">
        <p>
          {{ t('standalone.wizard.ssh_access_from_lan') }}:
          <FontAwesomeIcon
            :icon="faCircleCheck"
            class="mx-2 h-4 w-4 text-green-700 dark:text-green-500"
            aria-hidden="true"
          />
          <span>{{ t('common.enabled') }}</span>
        </p>
        <p>
          {{ t('standalone.wizard.ssh_access_from_wan') }}:
          <FontAwesomeIcon
            :icon="faCircleXmark"
            class="mx-2 h-4 w-4 text-gray-700 dark:text-gray-400"
            aria-hidden="true"
          />
          <span>{{ t('common.disabled') }}</span>
        </p>
      </div>
    </NeCard>
    <NeCard :title="t('standalone.wizard.settings')">
      <div class="space-y-8">
        <div class="max-w-sm">
          <NeTextInput
            ref="portRef"
            v-model="wizardStore.sshPort"
            :invalid-message="validationErrors.get('port')?.[0]"
            :label="t('standalone.wizard.tcp_port')"
            :disabled="loadingSaveSsh"
            max="65535"
            min="1"
            type="number"
          />
        </div>
        <NeToggle
          v-model="wizardStore.sshRootLoginWithPassword"
          :top-label="t('standalone.wizard.root_login_with_password')"
          :label="wizardStore.sshRootLoginWithPassword ? t('common.enabled') : t('common.disabled')"
          :disabled="loadingSaveSsh"
        />
        <NeInlineNotification
          v-if="!wizardStore.sshRootLoginWithPassword"
          kind="info"
          :title="t('standalone.wizard.ssh_key_required_for_access')"
          :description="t('standalone.wizard.ssh_key_required_for_access_description')"
          :close-aria-label="t('common.close')"
        />
      </div>
    </NeCard>
    <!-- save ssh error notification -->
    <NeInlineNotification
      v-if="errorSaveSsh"
      kind="error"
      :title="t('standalone.wizard.cannot_save_ssh_configuration')"
      :description="errorSaveSsh"
    >
      <template v-if="errorSaveSshDetails" #details>
        {{ errorSaveSshDetails }}
      </template>
    </NeInlineNotification>
    <!-- footer -->
    <hr />
    <div class="flex flex-row-reverse gap-6">
      <NeButton
        kind="primary"
        size="lg"
        type="submit"
        :disabled="loadingSaveSsh"
        :loading="loadingSaveSsh"
        @click.prevent="saveSshConfig"
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
