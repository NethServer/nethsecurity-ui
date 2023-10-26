<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import {
  focusElement,
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTextInput,
  NeTooltip
} from '@nethserver/vue-tailwind-lib'
import { faSave, faRightToBracket, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { validateIp4Cidr, validateIp4Address, validateRequired } from '@/lib/validation'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import router from '@/router'
import { getStandaloneRoutePrefix } from '@/lib/router'

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

let isError = ref(false)
let isLoggedIn = ref(false)
let viewConfiguration = ref(false)
let activeConfiguration = ref(false)
let loadingParentHotspot = ref(false)
let loadingListDevices = ref(false)
let logging = ref(false)
let loadingUnregister = ref(false)
let loadingDhcpRange = ref(false)
let showUnregisterModal = ref(false)
let emptyDevices = ref(false)
let saving = ref(false)
let successSaving = ref(false)
let hostnameRef = ref()
let usernameRef = ref()
let passwordRef = ref()
let unitNameRef = ref()
let unitDescriptionRef = ref()
let networkDeviceRef = ref()
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
  networkDevice: '',
  networkAddress: '',
  dhcpRangeStart: '',
  dhcpRangeEnd: '',
  maxClientsAllowed: ''
}
let error = ref({ ...objError })
let errorListParents = ref({ ...objError })
let errorListDevices = ref({ ...objError })
let errorGetConfiguration = ref({ ...objError })
let errorSave = ref({ ...objError })
let errorUnregister = ref({ ...objError })
let errorDhcpRange = ref({ ...objError })
let errorHostname = ref({ ...objError })

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
    let res = await ubusCall('ns.dedalo', 'list-parents', {})
    if (res?.data?.parents?.length) {
      isLoggedIn.value = true
      parentHotspotList.value = res.data.parents.map((item: ParentHotspot) => ({
        id: String(item.id),
        label: item.name
      }))
      if (!configurationForm.value.parentHotspot)
        configurationForm.value.parentHotspot = String(res.data.parents[0].id)
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
    let res = await ubusCall('ns.dedalo', 'list-devices', {})
    if (res?.data?.devices?.length) {
      networkDeviceList.value = res.data.devices.map((item: NetworkDevice) => ({
        id: item,
        label: item
      }))
      configurationForm.value.networkDevice = res.data.devices[0]
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
    let res = await ubusCall('ns.dedalo', 'get-configuration', {})
    if (res?.data?.configuration) {
      let configuration = res.data.configuration
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
        getDhcpRange()
      }
      if (configuration.dhcp_start)
        configurationForm.value.dhcpRangeStart = configuration.dhcp_start
      if (configuration.dhcp_end) configurationForm.value.dhcpRangeEnd = configuration.dhcp_end
    }
  } catch (exception: any) {
    isError.value = true
    errorGetConfiguration.value.notificationTitle = t('error.cannot_retrieve_configuration')
    errorGetConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

async function getHostname() {
  try {
    let systemInfo = await ubusCall('system', 'board')
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
    dhcpRangeStart: '',
    dhcpRangeEnd: '',
    maxClientsAllowed: ''
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

  if (!configurationForm.value.networkDevice) {
    let { valid, errMessage } = validateRequired(configurationForm.value.networkDevice)
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
  clearErrors()
  if (validateConfiguration()) {
    saving.value = true
    successSaving.value = false

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
      .then(() => {
        successSaving.value = true
        setTimeout(function () {
          successSaving.value = false
        }, 5000)
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
        :primaryButtonLabel="t('standalone.hotspot.settings.empty_network_device_link')"
        @primaryClick="goToInterfaces"
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
            :disabled="!isLoggedIn"
          />
          <NeTextInput
            v-model="configurationForm.unitName"
            :invalid-message="error.unitName"
            :placeholder="t('standalone.hotspot.settings.configuration_unit_name_placeholder')"
            :label="t('standalone.hotspot.settings.configuration_unit_name')"
            disabled
            ref="unitNameRef"
          />
          <NeTextInput
            v-model="configurationForm.unitDescription"
            :invalid-message="error.unitDescription"
            :placeholder="
              t('standalone.hotspot.settings.configuration_unit_description_placeholder')
            "
            :label="t('standalone.hotspot.settings.configuration_unit_description')"
            :disabled="!isLoggedIn"
            ref="unitDescriptionRef"
          />
          <NeCombobox
            v-model="configurationForm.networkDevice"
            :options="networkDeviceList"
            :placeholder="t('standalone.hotspot.settings.configuration_network_device_placeholder')"
            :invalid-message="error.networkDevice"
            :label="t('standalone.hotspot.settings.configuration_network_device')"
            :disabled="!isLoggedIn"
            class="grow"
            ref="networkDeviceRef"
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
            v-model="configurationForm.networkAddress"
            :invalid-message="error.networkAddress"
            placeholder="192.168.0.0/24"
            :label="t('standalone.hotspot.settings.configuration_network_address')"
            :disabled="!isLoggedIn"
            ref="networkAddressRef"
            @change="getDhcpRange()"
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
          <small class="opacity-60"
            >{{ t('standalone.hotspot.settings.configuration_max_client_allowed') }}
            {{ configurationForm.maxClientsAllowed }}</small
          >
          <NeTextInput
            v-model="configurationForm.dhcpRangeStart"
            :invalid-message="error.dhcpRangeStart"
            placeholder="192.168.0.2"
            :label="t('standalone.hotspot.settings.configuration_dhcp_range_start')"
            :disabled="!isLoggedIn"
            ref="dhcpRangeStartRef"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configuration_dhcp_range_start_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeTextInput
            v-model="configurationForm.dhcpRangeEnd"
            :invalid-message="error.dhcpRangeEnd"
            placeholder="192.168.0.254"
            :label="t('standalone.hotspot.settings.configuration_dhcp_range_end')"
            :disabled="!isLoggedIn"
            ref="dhcpRangeEndRef"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configuration_dhcp_range_end_helper') }}
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
            <FontAwesomeIcon
              v-if="successSaving"
              :icon="faCircleCheck"
              class="mr-2 text-green-500"
            />
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
