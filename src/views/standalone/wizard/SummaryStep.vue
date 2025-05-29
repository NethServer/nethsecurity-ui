<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeHeading,
  getAxiosErrorMessage,
  NeInlineNotification
} from '@nethesis/vue-components'
import {
  faArrowLeft,
  faCircleCheck,
  faCircleXmark,
  faCircleExclamation,
  faCheck
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ref } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'

const emit = defineEmits<{
  nextStep: []
  previousStep: []
}>()

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const wizardStore = useSetupWizardStore()
const loadingFinishSetup = ref(false)
const errorFinishSetup = ref('')
const errorFinishSetupDetails = ref('')

async function finishSetup() {
  errorFinishSetup.value = ''
  errorFinishSetupDetails.value = ''
  loadingFinishSetup.value = true

  try {
    await wizardStore.setCompleted(true)
    await uciChangesStore.getChanges()
    await uciChangesStore.commitChanges(false)

    // show finish animation

    wizardStore.showFinishAnimation = true
    setTimeout(() => {
      // reload the page
      location.reload()
    }, 2500)
  } catch (err: unknown) {
    console.error(err)
    errorFinishSetup.value = t(getAxiosErrorMessage(err))
    errorFinishSetupDetails.value = String(err)
  } finally {
    loadingFinishSetup.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <NeHeading tag="h2">
      {{ t('standalone.wizard.summary_title') }}
    </NeHeading>
    <p>{{ t('standalone.wizard.summary_description') }}</p>
  </div>
  <div class="space-y-8">
    <!-- change root password -->
    <div class="space-y-1">
      <NeHeading tag="h6"> 1. {{ t('standalone.wizard.change_root_password') }} </NeHeading>
      <p class="flex items-center gap-2">
        {{ t('standalone.wizard.root_password_saved_successfully') }}
        <FontAwesomeIcon
          :icon="faCircleCheck"
          class="h-4 w-4 text-green-700 dark:text-green-500"
          aria-hidden="true"
        />
      </p>
    </div>
    <!-- ssh access -->
    <div class="space-y-1">
      <NeHeading tag="h6"> 2. {{ t('standalone.wizard.ssh_access') }} </NeHeading>
      <div>{{ t('standalone.wizard.tcp_port') }}: {{ wizardStore.sshPort }}</div>
      <div>
        {{ t('standalone.wizard.root_login_with_password') }}:
        <template v-if="wizardStore.sshRootLoginWithPassword">
          <FontAwesomeIcon
            :icon="faCircleCheck"
            class="mx-2 h-4 w-4 text-green-700 dark:text-green-500"
            aria-hidden="true"
          />
          <span>{{ t('common.enabled') }}</span>
        </template>
        <template v-else>
          <FontAwesomeIcon
            :icon="faCircleXmark"
            class="mx-2 h-4 w-4 text-gray-700 dark:text-gray-400"
            aria-hidden="true"
          />
          <span>{{ t('common.disabled') }}</span>
        </template>
      </div>
    </div>
    <!-- port 9090 -->
    <div class="space-y-1">
      <NeHeading tag="h6"> 3. {{ t('standalone.wizard.web_access_9090_title') }} </NeHeading>
      <div>
        {{ t('standalone.wizard.access_from_wan') }}:
        <template v-if="wizardStore.port9090WanAccess === 'enabled'">
          <FontAwesomeIcon
            :icon="faCircleCheck"
            class="mx-2 h-4 w-4 text-green-700 dark:text-green-500"
            aria-hidden="true"
          />
          <span>{{ t('common.enabled') }}</span>
        </template>
        <template v-else-if="wizardStore.port9090WanAccess === 'disabled'">
          <FontAwesomeIcon
            :icon="faCircleXmark"
            class="mx-2 h-4 w-4 text-gray-700 dark:text-gray-400"
            aria-hidden="true"
          />
          <span>{{ t('common.disabled') }}</span>
        </template>
        <template v-else>
          <FontAwesomeIcon
            :icon="faCircleExclamation"
            class="mx-2 h-4 w-4 text-amber-700 dark:text-amber-500"
            aria-hidden="true"
          />
          <span>{{ t('standalone.wizard.limited') }}</span>
        </template>
      </div>
      <div v-if="wizardStore.port9090WanAccess === 'limited'">
        {{ t('standalone.wizard.allowed_addresses') }}:
        <span class="ml-2">
          {{ wizardStore.port9090AllowedAddresses.join(', ') }}
        </span>
      </div>
    </div>
    <!-- port 443 -->
    <div class="space-y-1">
      <NeHeading tag="h6"> 4. {{ t('standalone.wizard.web_access_443_title') }} </NeHeading>
      <div>
        {{ t('standalone.wizard.web_interface_service_on_tcp_port_443') }}:
        <template v-if="wizardStore.port443WebInterfaceEnabled">
          <FontAwesomeIcon
            :icon="faCircleCheck"
            class="mx-2 h-4 w-4 text-green-700 dark:text-green-500"
            aria-hidden="true"
          />
          <span>{{ t('common.enabled') }}</span>
        </template>
        <template v-else>
          <FontAwesomeIcon
            :icon="faCircleXmark"
            class="mx-2 h-4 w-4 text-gray-700 dark:text-gray-400"
            aria-hidden="true"
          />
          <span>{{ t('common.disabled') }}</span>
        </template>
      </div>
      <div>
        {{ t('standalone.wizard.wan_access_on_tcp_port_443') }}:
        <template v-if="wizardStore.port443WanAccessEnabled">
          <FontAwesomeIcon
            :icon="faCircleCheck"
            class="mx-2 h-4 w-4 text-green-700 dark:text-green-500"
            aria-hidden="true"
          />
          <span>{{ t('common.enabled') }}</span>
        </template>
        <template v-else>
          <FontAwesomeIcon
            :icon="faCircleXmark"
            class="mx-2 h-4 w-4 text-gray-700 dark:text-gray-400"
            aria-hidden="true"
          />
          <span>{{ t('common.disabled') }}</span>
        </template>
      </div>
    </div>
    <NeInlineNotification
      v-if="!wizardStore.port443WanAccessEnabled"
      kind="warning"
      :title="t('standalone.wizard.wan_access_port_443_warning_title')"
      :description="t('standalone.wizard.wan_access_port_443_warning_description')"
    />
    <NeInlineNotification
      v-if="
        wizardStore.port9090WanAccess !== 'enabled' ||
        !wizardStore.port443WebInterfaceEnabled ||
        !wizardStore.port443WanAccessEnabled
      "
      kind="warning"
      :title="t('standalone.wizard.web_access_form_wan_limited')"
      :description="t('standalone.wizard.web_access_form_wan_limited_description')"
    />
    <!-- commit changes error notification -->
    <NeInlineNotification
      v-if="errorFinishSetup"
      kind="error"
      :title="t('error.cannot_apply_configuration_changes')"
      :description="errorFinishSetup"
    >
      <template v-if="errorFinishSetupDetails" #details>
        {{ errorFinishSetupDetails }}
      </template>
    </NeInlineNotification>
    <!-- footer -->
    <hr />
    <div class="flex flex-row-reverse gap-6">
      <NeButton
        kind="primary"
        size="lg"
        type="submit"
        :disabled="loadingFinishSetup"
        :loading="loadingFinishSetup"
        @click.prevent="finishSetup"
      >
        <template #suffix>
          <FontAwesomeIcon :icon="faCheck" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('standalone.wizard.finish_setup') }}
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
