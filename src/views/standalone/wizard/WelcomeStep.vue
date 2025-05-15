<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeHeading,
  NeInlineNotification,
  NeRadioSelection
} from '@nethesis/vue-components'
import { ref } from 'vue'
import {
  faArrowRotateLeft,
  faArrowsRotate,
  faWandMagicSparkles,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

export type WelcomeSelection = 'newConfiguration' | 'restoreBackup' | 'factoryReset'

const emit = defineEmits<{
  nextStep: []
}>()

const { t } = useI18n()
const router = useRouter()
const wizardStore = useSetupWizardStore()
const selection = ref<WelcomeSelection>('newConfiguration')
const options = [
  {
    id: 'newConfiguration',
    label: t('standalone.wizard.new_configuration'),
    description: t('standalone.wizard.new_configuration_description'),
    icon: faWandMagicSparkles
  },
  {
    id: 'restoreBackup',
    label: t('standalone.wizard.restore_backup'),
    description: t('standalone.wizard.restore_backup_description'),
    icon: faArrowsRotate
  },
  {
    id: 'factoryReset',
    label: t('standalone.wizard.factory_reset'),
    description: t('standalone.wizard.factory_reset_description'),
    icon: faArrowRotateLeft
  }
]

async function goToNextStep() {
  switch (selection.value) {
    case 'newConfiguration':
      emit('nextStep')
      break
    case 'restoreBackup':
      await wizardStore.setCompleted(true)
      router.push({
        path: `${getStandaloneRoutePrefix()}/system/backup-and-restore`,
        query: {
          tab: 'tab-restore'
        }
      })
      break
    case 'factoryReset':
      await wizardStore.setCompleted(true)
      router.push(`${getStandaloneRoutePrefix()}/system/factory_reset`)
      break
  }
}
</script>

<template>
  <div class="space-y-2">
    <NeHeading tag="h2">
      {{ t('standalone.wizard.welcome_to_the_setup_wizard') }}
    </NeHeading>
    <p>{{ t('standalone.wizard.welcome_description') }}</p>
  </div>
  <div class="space-y-6">
    <NeRadioSelection
      v-model="selection"
      :label="t('standalone.wizard.select_option')"
      card
      grid-style="grid-cols-1 gap-4"
      :options="options"
    />
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
        :loading="wizardStore.loadingGetWizardConfig || wizardStore.loadingSetWizardConfig"
        @click.prevent="goToNextStep"
      >
        <template #suffix>
          <FontAwesomeIcon :icon="faArrowRight" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{
          selection === 'newConfiguration' ? t('common.next') : t('standalone.wizard.skip_wizard')
        }}
      </NeButton>
    </div>
  </div>
</template>
