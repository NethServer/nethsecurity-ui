<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import {
  focusElement,
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput,
  NeTooltip
} from '@nethserver/vue-tailwind-lib'
import { faSave, faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { validateIp4Cidr, validateIp4Address, validateRequired } from '@/lib/validation'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const uciPendingChangesStore = useUciPendingChangesStore()

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
  dhcpRangeEnd: string
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
  dhcpRangeEnd: '',
  maxClientsAllowed: ''
})

let isLoggedIn = ref(false)
let activeConfiguration = ref(false)
let loading = ref(false)
let logging = ref(false)
let loadingUnregister = ref(false)
let loadingDhcpRange = ref(false)
let saving = ref(false)
let hostnameRef = ref()
let usernameRef = ref()
let passwordRef = ref()
let unitNameRef = ref()
let unitDescriptionRef = ref()
let networkAddressRef = ref()
let dhcpRangeStartRef = ref()
let dhcpRangeEndRef = ref()
let parentHotspotList = ref<Array<ParentHotspot>>()
let networkDeviceList = ref<Array<NetworkDevice>>()

let objError = {
  notificationTitle: '',
  notificationDescription: '',
  hostname: '',
  username: '',
  password: '',
  unitName: '',
  unitDescription: '',
  networkAddress: '',
  dhcpRangeStart: '',
  dhcpRangeEnd: '',
  maxClientsAllowed: ''
}
let error = ref({ ...objError })
let errorLoadingData = ref({ ...objError })
let errorSave = ref({ ...objError })
let errorUnregister = ref({ ...objError })
let errorDhcpRange = ref({ ...objError })

onMounted(() => {
  getFirewallData()
  getConfiguration()
})

async function getFirewallData() {
  loading.value = true
  errorLoadingData.value = { ...objError }

  // Retrieve parent hotspot
  try {
    let getParentHotspot = await ubusCall('ns.dedalo', 'list-parents', {})
    if (
      getParentHotspot &&
      getParentHotspot.data &&
      getParentHotspot.data.parents &&
      getParentHotspot.data.parents.length
    ) {
      isLoggedIn.value = true
      parentHotspotList.value = getParentHotspot.data.parents.map((item: ParentHotspot) => ({
        id: item.id,
        label: item.name
      }))
      configurationForm.value.parentHotspot = getParentHotspot.data.parents[0].id
    }
  } catch (exception: any) {
    errorLoadingData.value.notificationTitle = t('error.cannot_retrieve_parent_hotspot')
    errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    try {
      let getNetworkDevice = await ubusCall('ns.dedalo', 'list-devices', {})
      if (
        getNetworkDevice &&
        getNetworkDevice.data &&
        getNetworkDevice.data.devices &&
        getNetworkDevice.data.devices.length
      ) {
        networkDeviceList.value = getNetworkDevice.data.devices.map((item: NetworkDevice) => ({
          id: item,
          label: item
        }))
        configurationForm.value.networkDevice = getNetworkDevice.data.devices[0]
      }
    } catch (exception: any) {
      errorLoadingData.value.notificationTitle = t('error.cannot_retrieve_network_device')
      errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
    } finally {
      loading.value = false
    }
  }
}

async function getConfiguration() {
  try {
    let getDataConfiguration = await ubusCall('ns.dedalo', 'get-configuration', {})
    if (
      getDataConfiguration &&
      getDataConfiguration.data &&
      getDataConfiguration.data.configuration &&
      getDataConfiguration.data.configuration.connected
    ) {
      activeConfiguration.value = true
      let configuration = getDataConfiguration.data.configuration
      if (configuration.hotspot_id) configurationForm.value.parentHotspot = configuration.hotspot_id
      if (configuration.unit_name) configurationForm.value.unitName = configuration.unit_name
      if (configuration.unit_description)
        configurationForm.value.unitDescription = configuration.unit_description
      if (configuration.interface) configurationForm.value.networkDevice = configuration.interface
      if (configuration.network) {
        configurationForm.value.networkAddress = configuration.network
        getDhcpRange()
      }
      if (configuration.dhcp_start)
        configurationForm.value.dhcpRangeStart = configuration.dhcp_start
      if (configuration.dhcp_end) configurationForm.value.dhcpRangeEnd = configuration.dhcp_end
    } else isLoggedIn.value = false
  } catch (exception: any) {
    errorLoadingData.value.notificationTitle = t('error.cannot_retrieve_configuration')
    errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

function validateLogin(): boolean {
  let isValidationOk = true
  let isFocusInput = false

  if (!loginForm.value.hostname) {
    let { valid, errMessage } = validateRequired(loginForm.value.hostname)
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
    let { valid, errMessage } = validateRequired(loginForm.value.username)
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
    let { valid, errMessage } = validateRequired(loginForm.value.password)
    if (!valid) {
      error.value.password = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) focusElement(passwordRef)

  return isValidationOk
}

function login() {
  if (validateLogin()) {
    logging.value = true

    let payload = {
      host: loginForm.value.hostname,
      username: loginForm.value.username,
      password: loginForm.value.password
    }
    ubusCall('ns.dedalo', 'login', payload)
      .then((response) => {
        if (response.data && response.data.response && response.data.response === 'success') {
          isLoggedIn.value = true
          getFirewallData()
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

function validateConfiguration(): boolean {
  let isValidationOk = true
  let isFocusInput = false

  if (!configurationForm.value.unitName) {
    let { valid, errMessage } = validateRequired(configurationForm.value.unitName)
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
    let { valid, errMessage } = validateRequired(configurationForm.value.unitDescription)
    if (!valid) {
      error.value.unitDescription = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(unitDescriptionRef)
    isFocusInput = true
  }

  if (configurationForm.value.networkAddress) {
    let { valid, errMessage } = validateIp4Cidr(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  } else {
    let { valid, errMessage } = validateRequired(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(networkAddressRef)
    isFocusInput = true
  }

  if (configurationForm.value.dhcpRangeStart) {
    let { valid, errMessage } = validateIp4Address(configurationForm.value.dhcpRangeStart)
    if (!valid) {
      error.value.dhcpRangeStart = t(errMessage as string)
      isValidationOk = false
    }
  } else {
    let { valid, errMessage } = validateRequired(configurationForm.value.dhcpRangeStart)
    if (!valid) {
      error.value.dhcpRangeStart = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (configurationForm.value.dhcpRangeEnd) {
    let { valid, errMessage } = validateIp4Address(configurationForm.value.dhcpRangeEnd)
    if (!valid) {
      error.value.dhcpRangeEnd = t(errMessage as string)
      isValidationOk = false
    }
  } else {
    let { valid, errMessage } = validateRequired(configurationForm.value.dhcpRangeEnd)
    if (!valid) {
      error.value.dhcpRangeEnd = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) focusElement(dhcpRangeStartRef)

  return isValidationOk
}

function saveConfiguration() {
  if (validateConfiguration()) {
    saving.value = true

    let payload = {
      network: configurationForm.value.networkAddress,
      hotspot_id: String(configurationForm.value.parentHotspot),
      unit_name: configurationForm.value.unitName,
      unit_description: configurationForm.value.unitDescription,
      interface: configurationForm.value.networkDevice,
      dhcp_start: configurationForm.value.dhcpRangeStart,
      dhcp_end: configurationForm.value.dhcpRangeEnd
    }

    ubusCall('ns.dedalo', 'set-configuration', payload)
      .catch((exception: AxiosError) => {
        errorSave.value.notificationTitle = t('error.cannot_save_configuration')
        errorSave.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => {
        saving.value = false
        uciPendingChangesStore.getChanges()
      })
  }
}

function unregisterUnit() {
  loadingUnregister.value = true

  ubusCall('ns.dedalo', 'unregister')
    .then((response) => {
      if (response.data && response.data.result && response.data.result === 'success') {
        isLoggedIn.value = false
        activeConfiguration.value = false
      }
    })
    .catch((exception: AxiosError) => {
      errorUnregister.value.notificationTitle = t('error.cannot_unregister_hotspot')
      errorUnregister.value.notificationDescription = t(getAxiosErrorMessage(exception))
    })
    .finally(() => (loadingUnregister.value = false))
}

function getDhcpRange() {
  loadingDhcpRange.value = true
  errorDhcpRange.value.notificationTitle = ''
  error.value.networkAddress = ''

  let isValidationOk = true

  if (configurationForm.value.networkAddress) {
    let { valid, errMessage } = validateIp4Cidr(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  } else {
    let { valid, errMessage } = validateRequired(configurationForm.value.networkAddress)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(networkAddressRef)
    loadingDhcpRange.value = false
  } else {
    let payload = {
      network: configurationForm.value.networkAddress
    }
    ubusCall('ns.dedalo', 'get-dhcp-range', payload)
      .then((response) => {
        if (response.data) {
          if (response.data.start) configurationForm.value.dhcpRangeStart = response.data.start
          if (response.data.end) configurationForm.value.dhcpRangeEnd = response.data.end
          if (response.data.max_entries)
            configurationForm.value.maxClientsAllowed = response.data.max_entries
        }
      })
      .catch((exception: AxiosError) => {
        errorDhcpRange.value.notificationTitle = t('error.cannot_retrieve_dhcp_range')
        errorDhcpRange.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => (loadingDhcpRange.value = false))
  }
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading" :lines="15" />
    <FormLayout
      v-if="!isLoggedIn && !loading"
      :title="t('standalone.hotspot.settings.login')"
      :description="t('standalone.hotspot.settings.login_description')"
      class="max-w-6xl"
    >
      <form @submit="login()">
        <div class="mb-8 flex flex-col gap-y-4">
          <NeTextInput
            v-model="loginForm.hostname"
            :invalid-message="error.hostname"
            :label="t('standalone.hotspot.settings.login_hostname')"
            ref="hostnameRef"
          />
          <NeTextInput
            v-model="loginForm.username"
            :invalid-message="error.username"
            :label="t('standalone.hotspot.settings.login_username')"
            ref="usernameRef"
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
            v-model="loginForm.password"
            isPassword
            :invalid-message="error.password"
            :label="t('standalone.hotspot.settings.login_password')"
            ref="passwordRef"
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
      v-if="!loading && activeConfiguration"
      :title="t('standalone.hotspot.settings.configurtion')"
      class="max-w-6xl"
    >
      <NeInlineNotification
        v-if="errorLoadingData.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorLoadingData.notificationTitle"
        :description="errorLoadingData.notificationDescription"
      />
      <form v-else>
        <div class="mb-8 flex flex-col gap-y-4">
          <NeCombobox
            v-model="configurationForm.parentHotspot"
            :options="parentHotspotList"
            :placeholder="t('standalone.hotspot.settings.configurtion_parent_hotspot_placeholder')"
            :label="t('standalone.hotspot.settings.configurtion_parent_hotspot')"
            class="grow"
            :disabled="!isLoggedIn"
          />
          <NeTextInput
            v-model="configurationForm.unitName"
            :invalid-message="error.unitName"
            :placeholder="t('standalone.hotspot.settings.configurtion_unit_name_placeholder')"
            :label="t('standalone.hotspot.settings.configurtion_unit_name')"
            :disabled="!isLoggedIn"
            ref="unitNameRef"
          />
          <NeTextInput
            v-model="configurationForm.unitDescription"
            :invalid-message="error.unitDescription"
            :placeholder="
              t('standalone.hotspot.settings.configurtion_unit_description_placeholder')
            "
            :label="t('standalone.hotspot.settings.configurtion_unit_description')"
            :disabled="!isLoggedIn"
            ref="unitDescriptionRef"
          />
          <NeCombobox
            v-model="configurationForm.networkDevice"
            :options="networkDeviceList"
            :placeholder="t('standalone.hotspot.settings.configurtion_network_device_placeholder')"
            :label="t('standalone.hotspot.settings.configurtion_network_device')"
            :disabled="!isLoggedIn"
            class="grow"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configurtion_network_device_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeCombobox>
          <NeTextInput
            v-model="configurationForm.networkAddress"
            :invalid-message="error.networkAddress"
            :placeholder="t('standalone.hotspot.settings.configurtion_network_address_placeholder')"
            :label="t('standalone.hotspot.settings.configurtion_network_address')"
            :disabled="!isLoggedIn"
            ref="networkAddressRef"
            @change="getDhcpRange()"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configurtion_network_address_helper') }}
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
          <small class="opacity-60"
            >{{ t('standalone.hotspot.settings.configurtion_max_client_allowed') }}
            {{ configurationForm.maxClientsAllowed }}</small
          >
          <NeTextInput
            v-model="configurationForm.dhcpRangeStart"
            :invalid-message="error.dhcpRangeStart"
            :placeholder="
              t('standalone.hotspot.settings.configurtion_dhcp_range_start_placeholder')
            "
            :label="t('standalone.hotspot.settings.configurtion_dhcp_range_start')"
            :disabled="!isLoggedIn"
            ref="dhcpRangeStartRef"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configurtion_dhcp_range_start_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeTextInput
            v-model="configurationForm.dhcpRangeEnd"
            :invalid-message="error.dhcpRangeEnd"
            :placeholder="t('standalone.hotspot.settings.configurtion_dhcp_range_end_placeholder')"
            :label="t('standalone.hotspot.settings.configurtion_dhcp_range_end')"
            :disabled="!isLoggedIn"
            ref="dhcpRangeEndRef"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configurtion_dhcp_range_end_helper') }}
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
          :title="t('standalone.hotspot.settings.configurtion_save_info')"
          :description="t('standalone.hotspot.settings.configurtion_save_info_description')"
        />
        <div class="flex justify-end">
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
      </form>
    </FormLayout>
    <hr class="my-8" />
    <FormLayout
      v-if="!loading && isLoggedIn && activeConfiguration"
      :title="t('standalone.hotspot.settings.unregister')"
      class="max-w-6xl"
    >
      <div>
        <NeInlineNotification
          v-if="errorUnregister.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorUnregister.notificationTitle"
          :description="errorUnregister.notificationDescription"
        />
        <NeButton
          size="md"
          :disabled="loadingUnregister"
          :loading="loadingUnregister"
          @click="unregisterUnit()"
        >
          {{ t('standalone.hotspot.settings.unregister_unit') }}
        </NeButton>
      </div>
    </FormLayout>
  </div>
</template>
