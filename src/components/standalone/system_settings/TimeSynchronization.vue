<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import {
  NeButton,
  NeCheckbox,
  NeToggle,
  NeSkeleton,
  NeComboBox,
  NeTitle,
  NeInlineNotification,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement
} from '@nethserver/vue-tailwind-lib'
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, ref, nextTick, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

//// review

interface NtpServer {
  name: string
  inputRef: Ref
}

const { t } = useI18n()

let enableNtpClient = ref(false)
let provideNtpServer = ref(false)
let useDhcpAdvertisedServers = ref(false)
let ntpServerInterface = ref('')
let interfaces: Ref<NeComboboxOption[]> = ref([])
let ntpServerCandidates: Ref<NtpServer[]> = ref([])
// let ntpServerCandidatesRefs: Ref<any[]> = ref([]) ////
// let systemConfig: any = ref({}) ////
let isLoadingSystemConfig = ref(true)
let isLoadingGetInitList = ref(true)
let isLoadingNetworkInterfaces = ref(true)

let error = ref({
  ntpServerInterface: '',
  ntpServerCandidate: '',
  notificationTitle: '',
  notificationDescription: ''
})

const isLoading = computed(() => {
  return false
  //// fix
  // return isLoadingSystemConfig.value || isLoadingSystemInfo.value || isLoadingTimezones.value
})

//// fix, needed for interface combobox
// watch(isLoadingSystemConfig, () => {
//   if (!isLoadingSystemConfig.value && !isLoadingTimezones.value) {
//     // set timezone in combobox
//     timezone.value = systemConfig.value.system[0].zonename
//   }
// })

// watch(isLoadingSystemConfig, () => {
// watch(isLoadingTimezones, () => {
//   if (!isLoadingTimezones.value && !isLoadingSystemConfig.value) {
//     // set timezone in combobox
//     timezone.value = systemConfig.value.system[0].zonename
//   }
// })

onMounted(() => {
  loadData()
})

async function loadData() {
  getSystemConfig()
  getNetworkInterfaces()
  // getTimezones()
}

async function getSystemConfig() {
  isLoadingSystemConfig.value = true

  try {
    const config = await getUciConfig('system')

    console.log('config', config) ////

    const ntpServers: string[] = config.timeserver[0].server

    const ntpServerCandidatesList: NtpServer[] = []

    for (const ntpServer of ntpServers) {
      ntpServerCandidatesList.push({ name: ntpServer, inputRef: ref() })
    }

    ntpServerCandidates.value = ntpServerCandidatesList

    // ntpServerCandidatesRefs.value = [] ////

    // for (let i = 0; i < ntpServerCandidates.value.length; i++) { ////
    //   ntpServerCandidatesRefs.value.push(ref())
    // }

    // console.log('refs', ntpServerCandidatesRefs.value) ////

    // hostname.value = config.system[0].hostname ////
    // description.value = config.system[0].description
    // notes.value = config.system[0].notes
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_load_system_config')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
  isLoadingSystemConfig.value = false
}

async function getNetworkInterfaces() {
  isLoadingNetworkInterfaces.value = true

  try {
    const res = await ubusCall('network.interface', 'dump', {})
    let interfacesList: NeComboboxOption[] = [
      { id: '', label: t('standalone.system_settings.all_interfaces') }
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
  isLoadingNetworkInterfaces.value = false
}

// function validate() {
//   let isValidationOk = true

//   // hostname

//   {
//     // check required
//     let { valid, errMessage } = validateRequired(hostname.value)
//     if (!valid) {
//       error.value.hostname = t(errMessage as string)
//       isValidationOk = false
//       focusElement(hostnameRef)
//     } else {
//       {
//         // check sintax
//         let { valid, errMessage } = validateHostname(hostname.value)
//         if (!valid) {
//           error.value.hostname = t(errMessage as string)
//           isValidationOk = false
//           focusElement(hostnameRef)
//         }
//       }
//     }
//   }

//   // timezone

//   {
//     // check required
//     let { valid, errMessage } = validateRequired(timezone.value)
//     if (!valid) {
//       error.value.timezone = t(errMessage as string)
//       isValidationOk = false
//       // focusElement(timezoneRef) //// fix: not working
//     }
//   }

//   return isValidationOk
// }

// async function setSystemConfig() {
//   const timezoneFound: any = timezones.value.find((tz: any) => tz.id === timezone.value)

//   await ubusCall('uci', 'set', {
//     config: 'system',
//     section: '@system[0]',
//     values: {
//       hostname: hostname.value,
//       description: description.value,
//       notes: notes.value,
//       zonename: timezone.value,
//       timezone: timezoneFound.timezone
//     }
//   })
// }

// async function enableSysntpd() {
//   await ubusCall('luci', 'setInitAction', {
//     name: 'sysntpd',
//     action: 'enable'
//   })
// }

async function save() {
  console.log('save') ////

  //   error.value.hostname = ''
  //   error.value.timezone = ''
  //   //// clear other errors
  //   const isValidationOk = validate()

  //   if (!isValidationOk) {
  //     return
  //   }

  //   try {
  //     await setSystemConfig()
  //     await enableSysntpd()
  //     loadData()
  //   } catch (err: any) {
  // console.error(err)
  //     error.value.notificationTitle = t('error.cannot_save_configuration')
  //     error.value.notificationDescription = t(getAxiosErrorMessage(err))
  //   }
}

function deleteNtpServer(ntpServerName: string) {
  ntpServerCandidates.value = ntpServerCandidates.value.filter(
    (elem) => elem.name !== ntpServerName
  )
}

function addNtpServer() {
  console.log('addNtpServer') ////

  const newRef = ref()

  ntpServerCandidates.value.push({ name: '', inputRef: newRef })

  nextTick(() => {
    focusElement(ntpServerCandidates.value[0].inputRef)
  })
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
    <NeSkeleton v-if="isLoading" size="lg" :lines="10" />
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
          />
          <div v-if="enableNtpClient" class="ml-6 space-y-6">
            <!-- provide ntp server -->
            <NeToggle
              v-model="provideNtpServer"
              :label="t('standalone.system_settings.provide_ntp_server')"
            />
            <!-- provide ntp server to interface -->
            <NeComboBox
              v-if="provideNtpServer"
              v-model="ntpServerInterface"
              :options="interfaces"
              :label="t('standalone.system_settings.provide_ntp_server_to_interface')"
              :noResultsLabel="t('ne_combobox.no_results')"
              :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
              class="ml-6"
            />
            <!-- use dhcp advertised servers -->
            <NeCheckbox
              v-model="useDhcpAdvertisedServers"
              :label="t('standalone.system_settings.use_dhcp_advertised_servers')"
            />
          </div>
        </div>
      </div>
      <!-- ntp server candidates section -->
      <div class="flex flex-col lg:flex-row border-b py-6 border-gray-200 dark:border-gray-700">
        <div class="w-full lg:w-2/5 pr-6 mb-4 lg:mb-0">
          <NeTitle level="h3">{{ t('standalone.system_settings.ntp_server_candidates') }}</NeTitle>
        </div>
        <div class="w-full lg:w-3/5 space-y-6">
          <div class="space-y-4">
            <div v-for="(ntpServer, i) in ntpServerCandidates" class="flex gap-2">
              <NeTextInput
                v-model="ntpServerCandidates[i].name"
                :ref="ntpServerCandidates[i].inputRef"
                class="grow"
              />
              <NeButton kind="tertiary" @click="deleteNtpServer(ntpServer.name)">
                <font-awesome-icon :icon="['fas', 'trash']" class="h-4 w-4" aria-hidden="true" />
              </NeButton>
            </div>
            <!-- add ntp server -->
            <NeButton @click="addNtpServer">
              <template #prefix>
                <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
              </template>
              {{ t('standalone.system_settings.add_ntp_server') }}
            </NeButton>
          </div>
        </div>
      </div>
      <!-- save button -->
      <div class="flex justify-end py-6">
        <NeButton kind="primary" @click="save">
          <template #prefix>
            <font-awesome-icon :icon="['fas', 'floppy-disk']" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </div>
</template>
