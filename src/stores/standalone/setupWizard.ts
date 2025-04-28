//  Copyright (C) 2025 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { ubusCall } from '@/lib/standalone/ubus'
import { useI18n } from 'vue-i18n'
import { getAxiosErrorMessage } from '@nethesis/vue-components'

export const useSetupWizardStore = defineStore('setupWizard', () => {
  const { t } = useI18n()
  const isComplete = ref(true)
  const isPasswordChanged = ref(false)
  const sshPort = ref('22')
  const sshRootLoginWithPassword = ref(false)
  const port9090WanAccess = ref('disabled')
  const port9090AllowedAddresses = ref<string[]>([''])
  const port443WebInterfaceEnabled = ref(false)
  const port443WanAccessEnabled = ref(false)
  const showFinishAnimation = ref(false)
  const loadingGetWizardConfig = ref(false)
  const loadingSetWizardConfig = ref(false)
  const errorGetWizardConfig = ref('')
  const errorGetWizardConfigDetails = ref('')
  const errorSetWizardConfig = ref('')
  const errorSetWizardConfigDetails = ref('')

  async function getWizardConfig() {
    loadingGetWizardConfig.value = true
    errorGetWizardConfig.value = ''
    errorGetWizardConfigDetails.value = ''

    try {
      const res = await ubusCall('ns.wizard', 'get')
      isComplete.value = res.data.complete
      isPasswordChanged.value = res.data.password_changed
    } catch (err: unknown) {
      console.error(err)
      errorGetWizardConfig.value = t(getAxiosErrorMessage(err))
      errorGetWizardConfigDetails.value = String(err)

      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingGetWizardConfig.value = false
    }
  }

  async function setCompleted(value: boolean) {
    loadingSetWizardConfig.value = true
    errorSetWizardConfig.value = ''
    errorSetWizardConfigDetails.value = ''

    try {
      await ubusCall('ns.wizard', 'set', {
        complete: value
      })
    } catch (err: unknown) {
      console.error(err)
      errorSetWizardConfig.value = t(getAxiosErrorMessage(err))
      errorSetWizardConfigDetails.value = String(err)

      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingSetWizardConfig.value = false
    }
  }

  async function setPasswordChanged(value: boolean) {
    loadingSetWizardConfig.value = true
    errorSetWizardConfig.value = ''
    errorSetWizardConfigDetails.value = ''

    try {
      await ubusCall('ns.wizard', 'set', {
        password_changed: value
      })
    } catch (err: unknown) {
      console.error(err)
      errorSetWizardConfig.value = t(getAxiosErrorMessage(err))
      errorSetWizardConfigDetails.value = String(err)

      // rethrow error so it can be caught by the caller
      throw err
    } finally {
      loadingSetWizardConfig.value = false
    }
  }

  return {
    isComplete,
    isPasswordChanged,
    sshPort,
    sshRootLoginWithPassword,
    port9090WanAccess,
    port9090AllowedAddresses,
    port443WebInterfaceEnabled,
    port443WanAccessEnabled,
    showFinishAnimation,
    getWizardConfig,
    setCompleted,
    setPasswordChanged,
    loadingGetWizardConfig,
    loadingSetWizardConfig,
    errorGetWizardConfig,
    errorGetWizardConfigDetails,
    errorSetWizardConfig,
    errorSetWizardConfigDetails
  }
})
