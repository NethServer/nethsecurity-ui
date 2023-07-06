<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { validateHost, validateRequired } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeButton,
  NeCheckbox,
  NeToggle,
  NeSkeleton,
  NeComboBox,
  NeTitle,
  NeInlineNotification,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import { isEmpty, uniq } from 'lodash'
import { computed, onMounted, ref, type Ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let enableNtpClient = ref(false)
let provideNtpServer = ref(false)
let useDhcpAdvertisedServers = ref(false)
let ntpServerInterface = ref('')
let interfaces: Ref<NeComboboxOption[]> = ref([])
let ntpServerCandidates: Ref<string[]> = ref([])
let ntpConfig: Ref<any> = ref({})

let loading = ref({
  systemConfig: true,
  networkInterfaces: true,
  save: false
})

let error = ref({
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
    let interfacesList: NeComboboxOption[] = [
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

  ubusCall('uci', 'set', {
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
  for (const ntpServerCandidate of ntpServerCandidates.value) {
    error.value.ntpServerCandidate.push('')
  }

  let isValidationOk = true

  // ntp server candidates

  for (let index = 0; index < ntpServerCandidates.value.length; index++) {
    const ntpServer = ntpServerCandidates.value[index]

    {
      // check required
      let { valid, errMessage } = validateRequired(ntpServer)

      if (!valid) {
        error.value.ntpServerCandidate[index] = t(errMessage as string)
        isValidationOk = false
      } else {
        {
          // check sintax
          let { valid, errMessage } = validateHost(ntpServer)
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
    await uciChangesStore.getChanges()
    loading.value.save = false
  }
}

function deleteNtpServer(ntpServerName: string) {
  // reset errors to prevent validation errors mismatch
  error.value.ntpServerCandidate = []

  ntpServerCandidates.value = ntpServerCandidates.value.filter((elem) => elem !== ntpServerName)
}

function addNtpServer() {
  ntpServerCandidates.value.push('')
}
</script>

<template>
  <div class="max-w-screen-md">
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-4"
    />
    <NeSkeleton v-if="isLoading" size="lg" :lines="8" />
    <div v-else>
      <!-- settings section -->
      <div class="flex flex-col lg:flex-row border-b pb-6 border-gray-200 dark:border-gray-700">
        <div class="w-full lg:w-2/5 pr-6 mb-4 lg:mb-0">
          <NeTitle level="h3">{{ t('standalone.system_settings.settings') }}</NeTitle>
        </div>
        <div class="w-full lg:w-3/5 space-y-6">
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
                  <NeComboBox
                    v-model="ntpServerInterface"
                    :options="interfaces"
                    :label="t('standalone.system_settings.provide_ntp_server_to_interface')"
                    :noResultsLabel="t('ne_combobox.no_results')"
                    :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
                    :disabled="loading.save"
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
      </div>
      <!-- ntp server candidates section -->
      <Transition name="fade">
        <div
          v-if="enableNtpClient"
          class="flex flex-col lg:flex-row border-b py-6 border-gray-200 dark:border-gray-700"
        >
          <div class="w-full lg:w-2/5 pr-6 mb-4 lg:mb-0">
            <NeTitle level="h3">{{
              t('standalone.system_settings.ntp_server_candidates')
            }}</NeTitle>
          </div>
          <div class="w-full lg:w-3/5 space-y-6">
            <div class="space-y-4">
              <div v-for="(ntpServer, i) in ntpServerCandidates" class="flex gap-2 items-start">
                <NeTextInput
                  v-model.trim="ntpServerCandidates[i]"
                  :invalid-message="error.ntpServerCandidate[i]"
                  :disabled="loading.save"
                  class="grow"
                />
                <NeButton
                  kind="tertiary"
                  @click="deleteNtpServer(ntpServer)"
                  :disabled="loading.save"
                >
                  <font-awesome-icon
                    :icon="['fas', 'trash']"
                    class="h-4 w-4 py-1"
                    aria-hidden="true"
                  />
                </NeButton>
              </div>
              <!-- add ntp server -->
              <NeButton @click="addNtpServer" :disabled="loading.save">
                <template #prefix>
                  <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
                </template>
                {{ t('standalone.system_settings.add_ntp_server') }}
              </NeButton>
            </div>
          </div>
        </div>
      </Transition>
      <!-- save button -->
      <div class="flex justify-end py-6">
        <NeButton kind="primary" @click="save" :loading="loading.save" :disabled="loading.save">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'floppy-disk']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </div>
</template>
