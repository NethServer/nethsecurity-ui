<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import { getTwoFaStatus } from '@/lib/twoFa'
import {
  getAxiosErrorMessage,
  getPreference,
  NeButton,
  NeFormItemLabel,
  NeInlineNotification,
  NeSkeleton,
  NeTextArea,
  NeTooltip,
  savePreference
} from '@nethesis/vue-components'
import ConfigureTwoFaDrawer from '@/components/two_fa/ConfigureTwoFaDrawer.vue'
import RevokeTwoFaModal from '@/components/two_fa/RevokeTwoFaModal.vue'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { isStandaloneMode } from '@/lib/config'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'

const { t } = useI18n()
const loginStore = isStandaloneMode() ? useStandaloneLoginStore() : useControllerLoginStore()
const isTwoFaEnabled = ref(false)
const isShownConfigureTwoFaDrawer = ref(false)
const isShownRevokeTwoFaModal = ref(false)
const isShownRecoveryCodes = ref(false)
const recoveryCodes = ref<string[]>([])
const recoveryCodesStored = ref(false)
const recoveryCodesJustCopied = ref(false)

let loading = ref({
  getTwoFaStatus: false
})

const error = ref({
  getTwoFaStatus: '',
  getTwoFaStatusDetails: ''
})

const recoveryCodesText = computed(() => {
  return recoveryCodes.value.join('\n')
})

onMounted(() => {
  loadData()
})

function loadData() {
  loadTwoFaStatus()
  loadRecoveryCodesStored()
}

function loadRecoveryCodesStored() {
  recoveryCodesStored.value = getPreference('twoFaRecoveryCodesStored', loginStore.username)
}

function showConfigureTwoFaDrawer() {
  isShownConfigureTwoFaDrawer.value = true
}

function hideConfigureTwoFaDrawer() {
  isShownConfigureTwoFaDrawer.value = false
}

function showRevokeTwoFaModal() {
  isShownRevokeTwoFaModal.value = true
}

async function loadTwoFaStatus() {
  loading.value.getTwoFaStatus = true
  error.value.getTwoFaStatus = ''
  error.value.getTwoFaStatusDetails = ''

  try {
    const res = await getTwoFaStatus()
    isTwoFaEnabled.value = res.data.status
    recoveryCodes.value = res.data.recovery_codes
  } catch (err: any) {
    console.error(err)
    error.value.getTwoFaStatus = t(getAxiosErrorMessage(err))
    error.value.getTwoFaStatusDetails = err.toString()
  } finally {
    loading.value.getTwoFaStatus = false
  }
}

function copyRecoveryCodes() {
  navigator.clipboard.writeText(recoveryCodesText.value)

  recoveryCodesJustCopied.value = true

  setTimeout(() => {
    recoveryCodesJustCopied.value = false
  }, 3000)
}

function hideStoreRecoveryCodesReminder() {
  savePreference('twoFaRecoveryCodesStored', true, loginStore.username)
  loadRecoveryCodesStored()
}
</script>

<template>
  <div class="space-y-8">
    <!-- getTwoFaStatus error notification -->
    <NeInlineNotification
      v-if="error.getTwoFaStatus"
      kind="error"
      :title="t('error.cannot_retrieve_two_fa_status')"
      :description="error.getTwoFaStatus"
    >
      <template #details v-if="error.getTwoFaStatusDetails">
        {{ error.getTwoFaStatusDetails }}
      </template>
    </NeInlineNotification>
    <!-- skeleton -->
    <NeSkeleton v-if="loading.getTwoFaStatus" :lines="4" size="lg" />
    <!-- 2fa status -->
    <template v-else>
      <div class="flex items-center">
        <font-awesome-icon
          :icon="['fas', isTwoFaEnabled ? 'circle-check' : 'circle-info']"
          :class="[
            'mr-2',
            'h-4',
            'w-4',
            isTwoFaEnabled
              ? 'text-green-600 dark:text-green-400'
              : 'text-indigo-500 dark:text-indigo-300'
          ]"
          aria-hidden="true"
        />
        <div>
          {{
            isTwoFaEnabled
              ? t('standalone.two_fa.two_fa_enabled')
              : t('standalone.two_fa.two_fa_disabled')
          }}
        </div>
      </div>
      <!-- buttons -->
      <template v-if="isTwoFaEnabled">
        <div class="flex gap-6">
          <NeButton kind="secondary" size="lg" @click="showConfigureTwoFaDrawer">
            <template #prefix>
              <font-awesome-icon :icon="['fas', 'wrench']" aria-hidden="true" />
            </template>
            {{ t('standalone.two_fa.reconfigure_two_fa') }}
          </NeButton>
          <NeButton kind="tertiary" size="lg" @click="showRevokeTwoFaModal">
            {{ t('standalone.two_fa.revoke_two_fa') }}
          </NeButton>
        </div>
        <!-- reminder to store recovery codes in a safe place -->
        <NeInlineNotification
          v-if="!recoveryCodesStored"
          kind="warning"
          :title="t('standalone.two_fa.store_recovery_codes_title')"
          :description="t('standalone.two_fa.store_recovery_codes_description')"
          :primaryButtonLabel="t('standalone.two_fa.i_have_stored_recovery_codes')"
          @primaryClick="hideStoreRecoveryCodesReminder"
        />
        <!-- few recovery codes warning -->
        <NeInlineNotification
          v-if="recoveryCodes.length < 3"
          kind="warning"
          :title="t('standalone.two_fa.few_recovery_codes_title')"
          :description="t('standalone.two_fa.few_recovery_codes_description')"
        />
        <!-- show recovery codes -->
        <div>
          <div class="flex gap-2">
            <NeFormItemLabel>
              {{ t('standalone.two_fa.recovery_otp_codes') }}
            </NeFormItemLabel>
            <NeTooltip>
              <template #content>
                {{ t('standalone.two_fa.recovery_otp_codes_tooltip') }}
              </template>
            </NeTooltip>
          </div>
          <NeButton
            kind="tertiary"
            @click="isShownRecoveryCodes = !isShownRecoveryCodes"
            class="-ml-2.5"
          >
            {{ t('standalone.two_fa.show_codes') }}
            <template #suffix>
              <font-awesome-icon
                :icon="['fas', isShownRecoveryCodes ? 'chevron-up' : 'chevron-down']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
          </NeButton>
          <Transition name="slide-down">
            <div v-show="isShownRecoveryCodes">
              <!-- recovery codes -->
              <NeTextArea
                v-show="isShownRecoveryCodes"
                :rows="6"
                v-model="recoveryCodesText"
                disabled
                class="mt-2"
              />
              <!-- copy all codes -->
              <NeButton kind="tertiary" size="lg" @click="copyRecoveryCodes" class="-ml-2.5 mt-2">
                <template #prefix>
                  <font-awesome-icon
                    :icon="['fas', recoveryCodesJustCopied ? 'check' : 'copy']"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </template>
                {{
                  recoveryCodesJustCopied
                    ? t('common.copied')
                    : t('standalone.two_fa.copy_all_codes')
                }}
              </NeButton>
            </div>
          </Transition>
        </div>
      </template>
      <NeButton v-else kind="secondary" @click="showConfigureTwoFaDrawer">
        {{ t('standalone.two_fa.configure_two_fa') }}
      </NeButton>
    </template>
    <!-- configure 2fa drawer -->
    <ConfigureTwoFaDrawer
      :isShown="isShownConfigureTwoFaDrawer"
      @close="hideConfigureTwoFaDrawer"
      @reloadData="loadData"
    />
    <!-- revoke 2fa modal -->
    <RevokeTwoFaModal
      :visible="isShownRevokeTwoFaModal"
      @close="isShownRevokeTwoFaModal = false"
      @reloadData="loadData"
    />
  </div>
</template>
