<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeButton, NeHeading, NeInlineNotification } from '@nethesis/vue-components'
import { faArrowRight, faGear, faRocket, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { getProductName } from '@/lib/config'

export type WelcomeSelection = 'newConfiguration' | 'restoreBackup' | 'factoryReset'

const emit = defineEmits<{
  nextStep: []
}>()

const { t } = useI18n()
const router = useRouter()
const wizardStore = useSetupWizardStore()
const uciChangesStore = useUciPendingChangesStore()

async function skipWizard() {
  await wizardStore.setCompleted(true)
  await uciChangesStore.getChanges()
  await uciChangesStore.commitChanges(false)
  router.push({
    path: `${getStandaloneRoutePrefix()}/dashboard`
  })
}
</script>

<template>
  <div class="space-y-6">
    <NeHeading tag="h2">
      {{ t('standalone.wizard.welcome_to_the_setup_wizard') }}
    </NeHeading>
    <p>
      {{ t('standalone.wizard.welcome_description', { product: getProductName() }) }}
    </p>
  </div>
  <div class="space-y-8 py-10">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faShieldHalved" aria-hidden="true" class="h-6 w-6" />
        <p class="text-lg uppercase">
          {{ t('standalone.wizard.secure_by_default') }}
        </p>
      </div>
      <p>{{ t('standalone.wizard.secure_by_default_description') }}</p>
    </div>
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faGear" aria-hidden="true" class="h-6 w-6" />
        <p class="text-lg uppercase">
          {{ t('standalone.wizard.tailored_configuration') }}
        </p>
      </div>
      <p>{{ t('standalone.wizard.tailored_configuration_description') }}</p>
    </div>
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <FontAwesomeIcon :icon="faRocket" aria-hidden="true" class="h-6 w-6" />
        <p class="text-lg uppercase">
          {{ t('standalone.wizard.quick_setup') }}
        </p>
      </div>
      <p>{{ t('standalone.wizard.quick_setup_description') }}</p>
    </div>
  </div>
  <div class="space-y-6">
    <!-- get wizard error notification -->
    <NeInlineNotification
      v-if="wizardStore.errorGetWizardConfig"
      kind="error"
      :title="t('standalone.wizard.cannot_retrieve_wizard_configuration')"
      :description="wizardStore.errorGetWizardConfig"
    >
      <template v-if="wizardStore.errorGetWizardConfigDetails" #details>
        {{ wizardStore.errorGetWizardConfigDetails }}
      </template>
    </NeInlineNotification>
    <!-- set wizard error notification -->
    <NeInlineNotification
      v-if="wizardStore.errorSetWizardConfig"
      kind="error"
      :title="t('standalone.wizard.cannot_save_wizard_configuration')"
      :description="wizardStore.errorSetWizardConfig"
    >
      <template v-if="wizardStore.errorSetWizardConfigDetails" #details>
        {{ wizardStore.errorSetWizardConfigDetails }}
      </template>
    </NeInlineNotification>
    <!-- footer -->
    <hr />
    <div class="flex flex-row-reverse gap-6">
      <NeButton
        kind="primary"
        size="lg"
        type="submit"
        :disabled="wizardStore.loadingGetWizardConfig || wizardStore.loadingSetWizardConfig"
        @click.prevent="emit('nextStep')"
      >
        <template #suffix>
          <FontAwesomeIcon :icon="faArrowRight" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('standalone.wizard.start_setup') }}
      </NeButton>
      <NeButton
        kind="tertiary"
        size="lg"
        :disabled="wizardStore.loadingGetWizardConfig || wizardStore.loadingSetWizardConfig"
        @click.prevent="skipWizard"
      >
        {{ t('standalone.wizard.skip_wizard') }}
      </NeButton>
    </div>
  </div>
</template>
