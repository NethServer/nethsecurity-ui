<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import {
  NeCombobox,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeTooltip,
  NeTextInput,
  focusElement,
  getAxiosErrorMessage,
  type NeComboboxOption
} from '@nethesis/vue-components'
import { type NeNotification, NeModal } from '@nethesis/vue-components'
import { faSave, faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { validateIp4Cidr, validateRequired } from '@/lib/validation'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import router from '@/router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { uid } from 'uid/single'
import { useNotificationsStore } from '@/stores/notifications'

const { t } = useI18n()
const uciPendingChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

interface Login {
  hostname: string
  username: string
  password: string
}

const loginForm = ref<Login>({
  hostname: 'my.nethspot.com',
  username: '',
  password: ''
})

interface Configuration {
  parentHotspot: string
  unitName: string
  unitDescription: string
  networkDevice: string
  networkAddress: string
  dhcpRangeStart: string
  dhcpLimit: string
  maxClientsAllowed: string
}

interface ParentHotspot {
  id: string
  label: string
  name: string
}

interface NetworkDevice {
  id: string
  name: string
  label: string
}

const configurationForm = ref<Configuration>({
  parentHotspot: '',
  unitName: '',
  unitDescription: '',
  networkDevice: '',
  networkAddress: '',
  dhcpRangeStart: '',
  dhcpLimit: '',
  maxClientsAllowed: ''
})

const isError = ref(false)
const isLoggedIn = ref(false)
const viewConfiguration = ref(false)
const activeConfiguration = ref(false)
const loadingParentHotspot = ref(false)
const loadingListDevices = ref(false)
const logging = ref(false)
const loadingUnregister = ref(false)
const loadingDhcpRange = ref(false)
const showUnregisterModal = ref(false)
const emptyDevices = ref(false)
const saving = ref(false)
const hostnameRef = ref()
const usernameRef = ref()
const passwordRef = ref()
const unitNameRef = ref()
const unitDescriptionRef = ref()
const networkDeviceRef = ref()
const networkAddressRef = ref()
const dhcpLimitRef = ref()
const parentHotspotList = ref<Array<NeComboboxOption>>([])
const networkDeviceList = ref<Array<NeComboboxOption>>([])

const objError = {
  notificationTitle: '',
  notificationDescription: '',
  hostname: '',
  username: '',
  password: '',
  unitName: '',
  unitDescription: '',
  networkDevice: '',
  networkAddress: '',
  dhcpLimit: '',
  maxClientsAllowed: ''
}
const error = ref({ ...objError })
const errorListParents = ref({ ...objError })
const errorListDevices = ref({ ...objError })
const errorGetConfiguration = ref({ ...objError })
const errorSave = ref({ ...objError })
const errorUnregister = ref({ ...objError })
const errorDhcpRange = ref({ ...objError })
const errorHostname = ref({ ...objError })

onMounted(() => {
  errorListParents.value = { ...objError }
  errorListDevices.value = { ...objError }
  errorGetConfiguration.value = { ...objError }
  getListParents()
  getListDevices()
  getConfiguration()
  getHostname()
})

async function getListParents() {
  loadingParentHotspot.value = true

  // Retrieve parent hotspot
  try {
    const res = await ubusCall('ns.dedalo', 'list-parents', {})
    if (res?.data?.parents?.length) {
      isLoggedIn.value = true
      parentHotspotList.value = res.data.parents.map((item: ParentHotspot) => ({
        id: String(item.id),
        label: item.name
      }))
      if (!configurationForm.value.parentHotspot) {
        configurationForm.value.parentHotspot = String(res.data.parents[0].id)
      }
    }
  } catch (exception: any) {
    isError.value = true
    errorListParents.value.notificationTitle = t('error.cannot_retrieve_parent_hotspot')
    errorListParents.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loadingParentHotspot.value = false
  }
}

async function getListDevices() {
  loadingListDevices.value = true

  // Retrieve list devices
  try {
    const res = await ubusCall('ns.dedalo', 'list-devices', {})
    if (res?.data?.devices?.length) {
      networkDeviceList.value = res.data.devices.map((item: NetworkDevice) => ({
        id: item,
        label: item
      }))
    } else {
      isError.value = true
      emptyDevices.value = true
    }
  } catch (exception: any) {
    isError.value = true
    errorListDevices.value.notificationTitle = t('error.cannot_retrieve_network_device')
    errorListDevices.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loadingListDevices.value = false
  }
}

async function getConfiguration() {
  try {
    const res = await ubusCall('ns.dedalo', 'get-configuration', {})
    if (res?.data?.configuration) {
      const configuration = res.data.configuration
      if (configuration.connected) {
        activeConfiguration.value = configuration.hotspot_id != ''
        viewConfiguration.value = true
      } else {
        isLoggedIn.value = false
      }

      configurationForm.value.parentHotspot = String(configuration.hotspot_id)
      configurationForm.value.unitDescription = configuration.unit_description
      configurationForm.value.networkDevice = configuration.interface
      if (configuration.network) {
        configurationForm.value.networkAddress = configuration.network
        getDhcpRange(true)
      }
      if (configuration.dhcp_start) {
        configurationForm.value.dhcpRangeStart = configuration.dhcp_start
      }
      if (configuration.dhcp_limit) {
        configurationForm.value.dhcpLimit = configuration.dhcp_limit
      }
    }
  } catch (exception: any) {
    isError.value = true
    errorGetConfiguration.value.notificationTitle = t('error.cannot_retrieve_configuration')
    errorGetConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

async function getHostname() {
  try {
    const systemInfo = await ubusCall('system', 'board')
    configurationForm.value.unitName = systemInfo.data.hostname
  } catch (exception: any) {
    isError.value = true
    errorHostname.value.notificationTitle = t('error.cannot_retrieve_system_board')
    errorHostname.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

function validateLogin(): boolean {
  let isValidationOk = true
  let isFocusInput = false

  if (!loginForm.value.hostname) {
    const { valid, errMessage } = validateRequired(loginForm.value.hostname)
    if (!valid) {
      error.value.hostname = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(hostnameRef)
    isFocusInput = true
  }

  if (!loginForm.value.username) {
    const { valid, errMessage } = validateRequired(loginForm.value.username)
    if (!valid) {
      error.value.username = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(usernameRef)
    isFocusInput = true
  }

  if (!loginForm.value.password) {
    const { valid, errMessage } = validateRequired(loginForm.value.password)
    if (!valid) {
      error.value.password = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(passwordRef)
  }

  return isValidationOk
}

function login() {
  if (validateLogin()) {
    logging.value = true

    const payload = {
      host: loginForm.value.hostname,
      username: loginForm.value.username,
      password: loginForm.value.password
    }
    ubusCall('ns.dedalo', 'login', payload)
      .then((response) => {
        if (response.data && response.data.response && response.data.response === 'success') {
          isLoggedIn.value = true
          errorListParents.value = { ...objError }
          errorListDevices.value = { ...objError }
          errorGetConfiguration.value = { ...objError }
          getListParents()
          getListDevices()
          getConfiguration()
        } else {
          error.value.notificationTitle = t('error.cannot_login_hotspot')
          error.value.notificationDescription = t('error.cannot_login_hotspot_description')
        }
      })
      .catch((exception: AxiosError) => {
        error.value.notificationTitle = t('error.cannot_login_hotspot')
        error.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => {
        logging.value = false
        getConfiguration()
      })
  }
}

function clearErrors() {
  error.value = {
    notificationTitle: '',
    notificationDescription: '',
    hostname: '',
    username: '',
    password: '',
    unitName: '',
    unitDescription: '',
    networkDevice: '',
    networkAddress: '',
    dhcpLimit: '',
    maxClientsAllowed: ''
  }
}

function validateConfiguration(): boolean {
  let isValidationOk = true
  let isFocusInput = false

  if (!configurationForm.value.unitName) {
    const { valid, errMessage } = validateRequired(configurationForm.value.unitName)
    if (!valid) {
      error.value.unitName = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(unitNameRef)
    isFocusInput = true
  }

  if (!configurationForm.value.unitDescription) {
    const { valid, errMessage } = validateRequired(configurationForm.value.unitDescription)
    if (!valid) {
      error.value.unitDescription = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(unitDescriptionRef)
    isFocusInput = true
  }

  if (!configurationForm.value.networkDevice) {
    const { valid, errMessage } = validateRequired(configurationForm.value.networkDevice)
    if (!valid) {
      error.value.networkDevice = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(networkDeviceRef)
    isFocusInput = true
  }

  if (configurationForm.value.networkAddress) {
    const { valid, errMessage } = validateIp4Cidr(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  } else {
    const { valid, errMessage } = validateRequired(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(networkAddressRef)
    isFocusInput = true
  }

  if (configurationForm.value.dhcpLimit) {
    let validDhcpLimit = false

    if (
      !isNaN(Number(configurationForm.value.dhcpLimit)) &&
      Number(configurationForm.value.dhcpLimit) >= 0
    ) {
      validDhcpLimit = true
    }

    if (!validDhcpLimit) {
      error.value.dhcpLimit = t('error.invalid_negative_integer')
      isValidationOk = false
    }
  } else {
    const { valid, errMessage } = validateRequired(configurationForm.value.dhcpLimit)
    if (!valid) {
      error.value.dhcpLimit = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(dhcpLimitRef)
  }

  return isValidationOk
}

function saveConfiguration() {
  clearErrors()
  if (validateConfiguration()) {
    saving.value = true

    const payload = {
      network: configurationForm.value.networkAddress,
      hotspot_id: String(configurationForm.value.parentHotspot),
      unit_name: configurationForm.value.unitName,
      unit_description: configurationForm.value.unitDescription,
      interface: configurationForm.value.networkDevice,
      dhcp_limit: configurationForm.value.dhcpLimit
    }

    ubusCall('ns.dedalo', 'set-configuration', payload)
      .then(() => {
        const notification: NeNotification = {
          id: uid(),
          kind: 'success',
          title: t('standalone.hotspot.settings.hotspot_configuration_saved'),
          timestamp: new Date()
        }
        notificationsStore.addNotification(notification)
      })
      .catch((exception: AxiosError) => {
        errorSave.value.notificationTitle = t('error.cannot_save_configuration')
        errorSave.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => {
        saving.value = false
        uciPendingChangesStore.getChanges()
        getConfiguration()
      })
  }
}

function unregisterUnit() {
  loadingUnregister.value = true

  ubusCall('ns.dedalo', 'unregister')
    .then((response) => {
      if (response.data && response.data.result && response.data.result === 'success') {
        isLoggedIn.value = false
        viewConfiguration.value = false
        showUnregisterModal.value = false
        uciPendingChangesStore.getChanges()
        getConfiguration()
      }
    })
    .catch((exception: AxiosError) => {
      errorUnregister.value.notificationTitle = t('error.cannot_unregister_hotspot')
      errorUnregister.value.notificationDescription = t(getAxiosErrorMessage(exception))
    })
    .finally(() => (loadingUnregister.value = false))
}

function getDhcpRange(skipDhcpLimit: boolean) {
  loadingDhcpRange.value = true
  errorDhcpRange.value.notificationTitle = ''
  error.value.networkAddress = ''

  let isValidationOk = true

  if (configurationForm.value.networkAddress) {
    const { valid, errMessage } = validateIp4Cidr(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  } else {
    const { valid, errMessage } = validateRequired(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(networkAddressRef)
    loadingDhcpRange.value = false
  } else {
    const payload = {
      network: configurationForm.value.networkAddress
    }
    ubusCall('ns.dedalo', 'get-dhcp-range', payload)
      .then((response) => {
        if (response.data) {
          if (response.data.start) {
            configurationForm.value.dhcpRangeStart = response.data.start
          }
          if (response.data.max_entries) {
            configurationForm.value.maxClientsAllowed = response.data.max_entries
          }
          if (!skipDhcpLimit && response.data.end) {
            configurationForm.value.dhcpLimit = response.data.end
          }
        }
      })
      .catch((exception: AxiosError) => {
        errorDhcpRange.value.notificationTitle = t('error.cannot_retrieve_dhcp_range')
        errorDhcpRange.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => (loadingDhcpRange.value = false))
  }
}

function goToInterfaces() {
  router.push(`${getStandaloneRoutePrefix()}/network/interfaces-and-devices`)
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loadingParentHotspot || loadingListDevices" :lines="8" />
    <FormLayout
      v-if="!isLoggedIn && !loadingParentHotspot && !loadingListDevices"
      :title="t('standalone.hotspot.settings.login')"
      :description="t('standalone.hotspot.settings.login_description')"
      class="max-w-3xl"
    >
      <form @submit="login()">
        <div class="mb-8 flex flex-col gap-y-4">
          <NeTextInput
            ref="hostnameRef"
            v-model="loginForm.hostname"
            :invalid-message="error.hostname"
            :label="t('standalone.hotspot.settings.login_hostname')"
          />
          <NeTextInput
            ref="usernameRef"
            v-model="loginForm.username"
            :invalid-message="error.username"
            :label="t('standalone.hotspot.settings.login_username')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.login_helper_username') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeTextInput
            ref="passwordRef"
            v-model="loginForm.password"
            is-password
            :invalid-message="error.password"
            :label="t('standalone.hotspot.settings.login_password')"
          />
        </div>
        <NeInlineNotification
          v-if="error.notificationTitle"
          class="my-4"
          kind="error"
          :title="error.notificationTitle"
          :description="error.notificationDescription"
        />
        <div class="flex justify-end">
          <NeButton :disabled="logging" :loading="logging" kind="primary" size="lg" type="submit">
            <template #prefix>
              <FontAwesomeIcon :icon="faRightToBracket" />
            </template>
            {{ t('standalone.hotspot.settings.login') }}
          </NeButton>
        </div>
      </form>
    </FormLayout>
    <FormLayout
      v-if="!loadingParentHotspot && !loadingListDevices && viewConfiguration"
      :title="t('standalone.hotspot.settings.configuration')"
      :description="t('standalone.hotspot.description')"
      class="max-w-3xl"
    >
      <NeInlineNotification
        v-if="emptyDevices"
        class="my-4"
        kind="warning"
        :title="t('error.empty_network_device')"
        :description="t('error.empty_network_device_description')"
        :primary-button-label="t('standalone.hotspot.settings.empty_network_device_link')"
        @primary-click="goToInterfaces"
      />
      <NeInlineNotification
        v-if="errorHostname.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorHostname.notificationTitle"
        :description="errorHostname.notificationDescription"
      />
      <NeInlineNotification
        v-if="errorListParents.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorListParents.notificationTitle"
        :description="errorListParents.notificationDescription"
      />
      <NeInlineNotification
        v-if="errorListDevices.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorListDevices.notificationTitle"
        :description="errorListDevices.notificationDescription"
      />
      <NeInlineNotification
        v-if="errorGetConfiguration.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorGetConfiguration.notificationTitle"
        :description="errorGetConfiguration.notificationDescription"
      />
      <form v-if="!isError">
        <div class="mb-8 flex flex-col gap-y-4">
          <NeCombobox
            v-model="configurationForm.parentHotspot"
            :options="parentHotspotList"
            :placeholder="t('standalone.hotspot.settings.configuration_parent_hotspot_placeholder')"
            :label="t('standalone.hotspot.settings.configuration_parent_hotspot')"
            class="grow"
            :disabled="!isLoggedIn || activeConfiguration"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :no-options-label="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optional-label="t('common.optional')"
          />
          <NeTextInput
            ref="unitNameRef"
            v-model="configurationForm.unitName"
            :invalid-message="error.unitName"
            :placeholder="t('standalone.hotspot.settings.configuration_unit_name_placeholder')"
            :label="t('standalone.hotspot.settings.configuration_unit_name')"
            disabled
          />
          <NeTextInput
            ref="unitDescriptionRef"
            v-model="configurationForm.unitDescription"
            :invalid-message="error.unitDescription"
            :placeholder="
              t('standalone.hotspot.settings.configuration_unit_description_placeholder')
            "
            :label="t('standalone.hotspot.settings.configuration_unit_description')"
            :disabled="!isLoggedIn || activeConfiguration"
          />
          <NeCombobox
            ref="networkDeviceRef"
            v-model="configurationForm.networkDevice"
            :options="networkDeviceList"
            :placeholder="t('standalone.hotspot.settings.configuration_network_device_placeholder')"
            :invalid-message="error.networkDevice"
            :label="t('standalone.hotspot.settings.configuration_network_device')"
            :disabled="!isLoggedIn"
            class="grow"
            :no-results-label="t('ne_combobox.no_results')"
            :limited-options-label="t('ne_combobox.limited_options_label')"
            :no-options-label="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optional-label="t('common.optional')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configuration_network_device_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeCombobox>
          <NeTextInput
            ref="networkAddressRef"
            v-model="configurationForm.networkAddress"
            :invalid-message="error.networkAddress"
            placeholder="192.168.0.0/24"
            :label="t('standalone.hotspot.settings.configuration_network_address')"
            :disabled="!isLoggedIn"
            :helper-text="
              t('standalone.hotspot.settings.configuration_max_client_allowed') +
              ' ' +
              configurationForm.maxClientsAllowed
            "
            @change="getDhcpRange(false)"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configuration_network_address_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeInlineNotification
            v-if="errorDhcpRange.notificationTitle"
            class="my-4"
            kind="error"
            :title="errorDhcpRange.notificationTitle"
            :description="errorDhcpRange.notificationDescription"
          />
          <NeTextInput
            ref="dhcpLimitRef"
            v-model="configurationForm.dhcpLimit"
            :invalid-message="error.dhcpLimit"
            :label="t('standalone.hotspot.settings.configuration_dhcp_limit')"
            :disabled="!isLoggedIn"
            :helper-text="
              t('standalone.hotspot.settings.configuration_dhcp_start') +
              ' ' +
              configurationForm.dhcpRangeStart
            "
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configuration_dhcp_limit_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
        </div>
        <NeInlineNotification
          v-if="errorSave.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorSave.notificationTitle"
          :description="errorSave.notificationDescription"
        />
        <NeInlineNotification
          class="my-4"
          kind="info"
          :title="t('standalone.hotspot.settings.configuration_save_info')"
          :description="t('standalone.hotspot.settings.configuration_save_info_description')"
        />
        <div class="flex justify-end">
          <div>
            <NeButton
              v-if="isLoggedIn"
              :disabled="saving"
              :loading="saving"
              kind="primary"
              size="lg"
              @click.prevent="saveConfiguration()"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faSave" />
              </template>
              {{ t('common.save') }}
            </NeButton>
          </div>
        </div>
      </form>
    </FormLayout>
    <hr class="my-8" />
    <FormLayout
      v-if="
        !loadingParentHotspot &&
        !loadingListDevices &&
        isLoggedIn &&
        activeConfiguration &&
        !emptyDevices
      "
      :title="t('standalone.hotspot.settings.unregister')"
      class="max-w-3xl"
    >
      <NeButton size="md" @click="showUnregisterModal = true">
        {{ t('standalone.hotspot.settings.unregister_unit') }}
      </NeButton>
    </FormLayout>
  </div>
  <NeModal
    :primary-button-disabled="loadingUnregister"
    :primary-button-loading="loadingUnregister"
    :primary-label="t('standalone.hotspot.settings.unregister')"
    :secondary-button-disabled="loadingUnregister"
    :title="t('standalone.hotspot.settings.unregister_unit')"
    :visible="showUnregisterModal"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @close="showUnregisterModal = false"
    @primary-click="unregisterUnit()"
  >
    <div>
      {{ t('standalone.hotspot.settings.unregister_unit_modal_description') }}
    </div>
    <NeInlineNotification
      v-if="errorUnregister.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorUnregister.notificationTitle"
      :description="errorUnregister.notificationDescription"
    />
  </NeModal>
</template>
