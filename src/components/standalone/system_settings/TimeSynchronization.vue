<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { validateHost, validateRequired } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeCombobox,
  type NeComboboxOption,
  NeCheckbox,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { isEmpty, uniq } from 'lodash-es'
import { computed, onMounted, ref, type Ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import NeMultiTextInput from '../NeMultiTextInput.vue'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const enableNtpClient = ref(false)
const provideNtpServer = ref(false)
const useDhcpAdvertisedServers = ref(false)
const ntpServerInterface = ref('')
const interfaces: Ref<NeComboboxOption[]> = ref([])
const ntpServerCandidates: Ref<string[]> = ref([])
const ntpConfig: Ref<any> = ref({})

const loading = ref({
  systemConfig: true,
  networkInterfaces: true,
  save: false
})

const error = ref({
  ntpServerCandidate: [''],
  notificationTitle: '',
  notificationDescription: ''
})

const isLoading = computed(() => {
  return loading.value.systemConfig || loading.value.networkInterfaces
})

watch(
  () => loading.value.systemConfig,
  () => {
    if (!loading.value.systemConfig && !loading.value.networkInterfaces) {
      // set interface to combobox
      ntpServerInterface.value = ntpConfig.value.interface || 'all'
    }
  }
)

watch(
  () => loading.value.networkInterfaces,
  () => {
    if (!loading.value.systemConfig && !loading.value.networkInterfaces) {
      // set interface to combobox
      ntpServerInterface.value = ntpConfig.value.interface || 'all'
    }
  }
)

onMounted(() => {
  loadData()
})

async function loadData() {
  getSystemConfig()
  getNetworkInterfaces()
}

async function getSystemConfig() {
  loading.value.systemConfig = true

  try {
    const config = await getUciConfig('system')
    ntpConfig.value = config.timeserver[0]

    // enable ntp client

    if (ntpConfig.value.enabled === '0') {
      enableNtpClient.value = false
    } else {
      enableNtpClient.value = true
    }

    // provide ntp server

    if (ntpConfig.value.enable_server === '1') {
      provideNtpServer.value = true
    } else {
      provideNtpServer.value = false
    }

    if (ntpConfig.value.use_dhcp === '0') {
      useDhcpAdvertisedServers.value = false
    } else {
      useDhcpAdvertisedServers.value = true
    }

    // ntp server candidates

    const ntpServers: string[] = ntpConfig.value.server
    const ntpServerCandidatesList: string[] = []

    if (!isEmpty(ntpServers)) {
      for (const ntpServer of ntpServers) {
        ntpServerCandidatesList.push(ntpServer)
      }
    }
    ntpServerCandidates.value = ntpServerCandidatesList
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_system_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.systemConfig = false
}

async function getNetworkInterfaces() {
  loading.value.networkInterfaces = true

  try {
    const res = await ubusCall('network.interface', 'dump')
    const interfacesList: NeComboboxOption[] = [
      { id: 'all', label: t('standalone.system_settings.all_interfaces') }
    ]

    for (const iface of res.data.interface) {
      if (iface.interface !== 'loopback') {
        interfacesList.push({
          id: iface.interface,
          label: `${iface.interface} (${iface.device})`,
          rawObj: iface
        })
      }
    }
    interfaces.value = interfacesList
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_network_interfaces')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  loading.value.networkInterfaces = false
}

async function setSystemConfig() {
  const enabledValue = enableNtpClient.value ? '' : 0
  const enableServerValue = enableNtpClient.value && provideNtpServer.value ? '1' : ''
  const ifaceValue =
    enableNtpClient.value && provideNtpServer.value && ntpServerInterface.value !== 'all'
      ? ntpServerInterface.value
      : ''
  const useDhcpValue = enableNtpClient.value && !useDhcpAdvertisedServers.value ? '0' : ''
  const serverValue =
    enableNtpClient.value && ntpServerCandidates.value.length ? ntpServerCandidates.value : ''

  await ubusCall('uci', 'set', {
    config: 'system',
    section: 'ntp',
    values: {
      enabled: enabledValue,
      enable_server: enableServerValue,
      interface: ifaceValue,
      use_dhcp: useDhcpValue,
      server: serverValue
    }
  })
}

async function enableSysntpd() {
  await ubusCall('luci', 'setInitAction', {
    name: 'sysntpd',
    action: 'enable'
  })
}

function validate() {
  // reset errors
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''

  // remove empty ntp servers
  ntpServerCandidates.value = ntpServerCandidates.value.filter((server) => server)

  // remove duplicates ntp servers
  ntpServerCandidates.value = uniq(ntpServerCandidates.value)

  // reset ntp server errors
  error.value.ntpServerCandidate = []
  ntpServerCandidates.value.forEach(() => {
    error.value.ntpServerCandidate.push('')
  })

  let isValidationOk = true

  // ntp server candidates

  for (let index = 0; index < ntpServerCandidates.value.length; index++) {
    const ntpServer = ntpServerCandidates.value[index]

    {
      // check required
      const { valid, errMessage } = validateRequired(ntpServer)

      if (!valid) {
        error.value.ntpServerCandidate[index] = t(errMessage as string)
        isValidationOk = false
      } else {
        {
          // check syntax
          const { valid, errMessage } = validateHost(ntpServer)
          if (!valid) {
            error.value.ntpServerCandidate[index] = t(errMessage as string)
            isValidationOk = false
          }
        }
      }
    }
  }
  return isValidationOk
}

async function save() {
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  loading.value.save = true

  try {
    await setSystemConfig()
    await enableSysntpd()
    loadData()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_save_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.save = false
    await uciChangesStore.getChanges()
  }
}

function resetNtpServerErrors() {
  // reset errors to prevent validation errors mismatch
  error.value.ntpServerCandidate = []
}
</script>

<template>
  <div class="max-w-(--breakpoint-md)">
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-4"
    />
    <NeSkeleton v-if="isLoading" size="lg" :lines="10" />
    <div v-else>
      <!-- settings section -->
      <FormLayout :title="t('standalone.system_settings.settings')">
        <div class="space-y-6">
          <!-- enable ntp client -->
          <NeToggle
            v-model="enableNtpClient"
            :label="t('standalone.system_settings.enable_ntp_client')"
            :disabled="loading.save"
          />
          <Transition name="fade">
            <div v-if="enableNtpClient" class="space-y-6">
              <!-- provide ntp server -->
              <NeToggle
                v-model="provideNtpServer"
                :label="t('standalone.system_settings.provide_ntp_server')"
                :disabled="loading.save"
              />
              <!-- provide ntp server to interface -->
              <Transition name="fade">
                <div v-if="provideNtpServer">
                  <NeCombobox
                    v-model="ntpServerInterface"
                    :options="interfaces"
                    :label="t('standalone.system_settings.provide_ntp_server_to_interface')"
                    :no-results-label="t('ne_combobox.no_results')"
                    :limited-options-label="t('ne_combobox.limited_options_label')"
                    :disabled="loading.save"
                    :no-options-label="t('ne_combobox.no_options_label')"
                    :selected-label="t('ne_combobox.selected')"
                    :user-input-label="t('ne_combobox.user_input_label')"
                    :optional-label="t('common.optional')"
                  />
                </div>
              </Transition>
              <!-- use dhcp advertised servers -->
              <NeCheckbox
                v-model="useDhcpAdvertisedServers"
                :label="t('standalone.system_settings.use_dhcp_advertised_servers')"
                :disabled="loading.save"
              />
            </div>
          </Transition>
        </div>
      </FormLayout>
      <!-- ntp server candidates section -->
      <Transition name="fade">
        <div v-if="enableNtpClient">
          <hr class="my-8" />
          <FormLayout :title="t('standalone.system_settings.ntp_server_candidates')">
            <NeMultiTextInput
              v-model="ntpServerCandidates"
              :add-item-label="t('standalone.system_settings.add_ntp_server')"
              :invalid-messages="error.ntpServerCandidate"
              :disable-inputs="loading.save"
              :disable-add-button="loading.save"
              @delete-item="resetNtpServerErrors()"
            />
          </FormLayout>
        </div>
      </Transition>
      <!-- save button -->
      <div class="flex justify-end py-6">
        <NeButton
          kind="primary"
          size="lg"
          :loading="loading.save"
          :disabled="loading.save"
          @click="save"
        >
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'floppy-disk']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </div>
</template>
