<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeHeading,
  NeButton,
  NeProgressBar,
  NeInlineNotification
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { getCompanyName } from '@/lib/config'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { useSetupWizardStore } from '@/stores/standalone/setupWizard'
import WelcomeStep from './WelcomeStep.vue'
import ChangePasswordStep from './ChangePasswordStep.vue'
import SshStep from './SshStep.vue'
import Port9090Step from './Port9090Step.vue'
import Port443Step from './Port443Step.vue'
import type { FirewallRule } from '@/stores/standalone/firewall'
import { ubusCall } from '@/lib/standalone/ubus'
import SummaryStep from './SummaryStep.vue'
import wizardLoaderUrl from '@/assets/wizard-loader.svg'

type Step = 'welcome' | 'password' | 'ssh' | 'port9090' | 'port443' | 'summary'

const { t } = useI18n()
const themeStore = useThemeStore()
const wizardStore = useSetupWizardStore()
const currentStep = ref<Step>('welcome')
const steps: Step[] = ['password', 'ssh', 'port9090', 'port443', 'summary']
const inputRules = ref<FirewallRule[]>([])
const loadingListInputRules = ref(false)
const errorListInputRules = ref('')
const errorListInputRulesDetails = ref('')

const logoFilename = computed(() => {
  if (themeStore.isLight) {
    return 'logo_light.svg'
  } else {
    return 'logo_dark.svg'
  }
})

const currentStepNum = computed(() => {
  return steps.indexOf(currentStep.value) + 1
})

const wizardProgress = computed(() => {
  switch (currentStep.value) {
    case 'welcome':
      return 0
    case 'password':
      return 100 / steps.length
    case 'ssh':
      return (100 / steps.length) * 2
    case 'port9090':
      return (100 / steps.length) * 3
    case 'port443':
      return (100 / steps.length) * 4
    case 'summary':
      return 100
    default:
      return 0
  }
})

onMounted(() => {
  listInputRules()
})

async function listInputRules() {
  loadingListInputRules.value = true
  errorListInputRules.value = ''
  errorListInputRulesDetails.value = ''

  try {
    const res = await ubusCall('ns.firewall', 'list-input-rules')
    inputRules.value = res.data.rules
  } catch (err: unknown) {
    console.error(err)
    errorListInputRules.value = t(getAxiosErrorMessage(err))
    errorListInputRulesDetails.value = String(err)
  } finally {
    loadingListInputRules.value = false
  }
}

async function goToNextStep() {
  switch (currentStep.value) {
    case 'welcome':
      if (wizardStore.isPasswordChanged) {
        currentStep.value = 'ssh'
      } else {
        currentStep.value = 'password'
      }
      break
    case 'password':
      currentStep.value = 'ssh'
      break
    case 'ssh':
      currentStep.value = 'port9090'
      break
    case 'port9090':
      currentStep.value = 'port443'
      break
    case 'port443':
      currentStep.value = 'summary'
      break
  }
}

function goToPreviousStep() {
  switch (currentStep.value) {
    case 'password':
      currentStep.value = 'welcome'
      break
    case 'ssh':
      if (wizardStore.isPasswordChanged) {
        currentStep.value = 'welcome'
      } else {
        currentStep.value = 'password'
      }
      break
    case 'port9090':
      currentStep.value = 'ssh'
      break
    case 'port443':
      currentStep.value = 'port9090'
      break
    case 'summary':
      currentStep.value = 'port443'
      break
  }
}
</script>

<template>
  <!-- finish animation -->
  <div
    v-if="wizardStore.showFinishAnimation"
    class="fixed left-0 top-0 z-[9999] h-[100vh] w-[100vw] bg-white dark:bg-gray-950"
  >
    <div class="flex h-full flex-col items-center justify-center">
      <!-- loader -->
      <img
        class="mb-14 h-16 w-16 animate-spin-relaxed"
        :src="wizardLoaderUrl"
        :alt="`${getCompanyName()} logo`"
        aria-hidden="true"
      />
      <!-- logo -->
      <img
        :src="`/${logoFilename}`"
        :alt="`${getCompanyName()} logo`"
        aria-hidden="true"
        class="mb-14 h-14"
      />
      <p>{{ t('standalone.wizard.finish_message') }}</p>
    </div>
  </div>
  <!-- wizard -->
  <div v-else class="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-gray-700">
    <div
      class="flex h-full max-w-7xl grow shadow-xl lg:h-[90%] lg:w-[90%] lg:grow-0 lg:rounded-3xl"
    >
      <!-- side panel -->
      <div
        class="hidden h-full w-96 shrink-0 flex-col justify-center border-r border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-950 lg:flex lg:rounded-l-3xl"
      >
        <div class="space-y-6">
          <!-- logo -->
          <img
            class="h-10"
            :src="`/${logoFilename}`"
            :alt="`${getCompanyName()} logo`"
            aria-hidden="true"
          />
          <NeHeading tag="h4">
            {{ t('standalone.wizard.setup_wizard') }}
          </NeHeading>
          <p>
            {{ t('standalone.wizard.setup_wizard_description') }}
          </p>
          <a
            href="https://docs.nethsecurity.org/en/latest/setup_wizard.html"
            target="_blank"
            class="inline-block"
          >
            <NeButton kind="tertiary" size="lg">
              <template #prefix>
                <FontAwesomeIcon
                  :icon="faArrowUpRightFromSquare"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('standalone.wizard.need_help') }}
            </NeButton>
          </a>
        </div>
      </div>
      <!-- main content -->
      <div
        class="flex w-full flex-col space-y-6 bg-gray-50 p-12 pr-8 dark:bg-gray-900 lg:rounded-r-3xl"
      >
        <!-- steps progress -->
        <div v-if="currentStep !== 'welcome'" class="mb-4 w-full pr-4">
          <NeProgressBar
            class="mb-2"
            :progress="wizardProgress"
            color="custom"
            custom-color-classes="bg-gradient-to-r from-cyan-500 to-indigo-500"
          />
          <p class="text-center text-xs text-gray-700 dark:text-gray-200">
            {{
              t('standalone.wizard.step_num_of_total', { num: currentStepNum, total: steps.length })
            }}
          </p>
        </div>
        <div class="h-full flex-1 space-y-6 overflow-y-auto pr-4">
          <!-- list-input-rules error notification -->
          <NeInlineNotification
            v-if="errorListInputRules"
            kind="error"
            :title="t('error.cannot_retrieve_firewall_rules')"
            :description="errorListInputRules"
          >
            <template v-if="errorListInputRulesDetails" #details>
              {{ errorListInputRulesDetails }}
            </template>
          </NeInlineNotification>
          <template v-if="currentStep === 'welcome'">
            <WelcomeStep @next-step="goToNextStep" />
          </template>
          <template v-else-if="currentStep === 'password'">
            <ChangePasswordStep @next-step="goToNextStep" @previous-step="goToPreviousStep" />
          </template>
          <template v-else-if="currentStep === 'ssh'">
            <SshStep @next-step="goToNextStep" @previous-step="goToPreviousStep" />
          </template>
          <template v-else-if="currentStep === 'port9090'">
            <Port9090Step
              :input-rules="inputRules"
              @next-step="goToNextStep"
              @previous-step="goToPreviousStep"
            />
          </template>
          <template v-else-if="currentStep === 'port443'">
            <Port443Step
              :input-rules="inputRules"
              @next-step="goToNextStep"
              @previous-step="goToPreviousStep"
            />
          </template>
          <template v-else-if="currentStep === 'summary'">
            <SummaryStep @previous-step="goToPreviousStep" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
