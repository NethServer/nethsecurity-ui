<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import {
  focusElement,
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeTextInput,
  NeTooltip
} from '@nethserver/vue-tailwind-lib'
import { faSave, faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { validateRequired } from '@/lib/validation'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'

const { t } = useI18n()

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
  unitName: string
  unitDescription: string
  networkAddress: string
  dhcpRangeStart: string
  dhcpRangeEnd: string
  maxClientsAllowed: string
}

interface ParentHotspot {
  id: string
  name: string
}

const configurationForm = ref<Configuration>({
  unitName: '',
  unitDescription: '',
  networkAddress: '',
  dhcpRangeStart: '',
  dhcpRangeEnd: '',
  maxClientsAllowed: ''
})

let isLoggedIn = ref(false)
let loading = ref(false)
let logging = ref(false)
let saving = ref(false)
let hostnameRef = ref()
let usernameRef = ref()
let passwordRef = ref()
let parentHotspot = ref<Array<ParentHotspot>>()

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

onMounted(() => {
  getFirewallData()
})

async function getFirewallData() {
  loading.value = true
  errorLoadingData.value = { ...objError }

  // Retrive parent hotspot
  try {
    let getParentHotspot = await ubusCall('ns.dedalo', 'list-parents', {})
    if (
      getParentHotspot &&
      getParentHotspot.data &&
      getParentHotspot.data.parents &&
      getParentHotspot.data.parents.length
    ) {
      parentHotspot.value = getParentHotspot.data.interfaces.map((item: ParentHotspot) => ({
        id: item.id,
        label: item.name
      }))
      /*if (parentHotspot.value) {
				parentHotspot.value.unshift({
					id: '',
					label: t('standalone.routes.interface_unspecified')
				})
			} */
    }
  } catch (exception: any) {
    errorLoadingData.value.notificationTitle = t('error.cannot_retrive_parent_hotspot')
    errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    /*try {
			let getRouteTypes = await ubusCall('ns.routes', 'list-route-types', {})
			if (
				getRouteTypes &&
				getRouteTypes.data &&
				getRouteTypes.data.types &&
				getRouteTypes.data.types.length
			)
				routeTypes.value = getRouteTypes.data.types.map((item: RouteType) => ({
					id: item,
					label: item
				}))
		} catch (exception: any) {
			errorLoadingData.value.notificationTitle = t('error.cannot_retrive_route_types')
			errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
		} finally {
			loading.value = false
		}*/
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
        if (response.data) {
          console.log(response.data)
        }
      })
      .catch((exception: AxiosError) => {
        error.value.notificationTitle = t('error.cannot_login_hotspot')
        error.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => (logging.value = false))
  }
}

function validateConfiguration(): boolean {
  let isValidationOk = true
  // TODO
  return isValidationOk
}

function saveConfiguration() {
  if (validateConfiguration()) {
    saving.value = true
    // TODO
  }
}
</script>

<template>
  <div>
    <FormLayout
      v-if="!isLoggedIn"
      :title="t('standalone.hotspot.settings.login')"
      :description="t('standalone.hotspot.settings.login_description')"
    >
      <form>
        <!-- Form -->
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
            :invalid-message="error.password"
            :label="t('standalone.hotspot.settings.login_password')"
            ref="passwordRef"
          />
        </div>
        <div class="flex justify-end">
          <NeButton
            :disabled="logging"
            :loading="logging"
            kind="primary"
            size="lg"
            @click.prevent="login()"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faRightToBracket" />
            </template>
            {{ t('standalone.hotspot.settings.login') }}
          </NeButton>
        </div>
      </form>
      <NeInlineNotification
        v-if="error.notificationTitle"
        class="my-4"
        kind="error"
        :title="error.notificationTitle"
        :description="error.notificationDescription"
      />
    </FormLayout>
    <FormLayout v-else :title="t('standalone.hotspot.settings.configurtion')">
      <NeInlineNotification
        v-if="errorLoadingData.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorLoadingData.notificationTitle"
        :description="errorLoadingData.notificationDescription"
      />
      <form v-else>
        <!-- Form -->
        <div class="mb-8 flex flex-col gap-y-4">
          <!-- TODO PARENT HOTSPOT -->
          <NeTextInput
            v-model="configurationForm.unitName"
            :invalid-message="error.unitName"
            :placeholder="t('standalone.hotspot.settings.configurtion_unit_name_placeholder')"
            :label="t('standalone.hotspot.settings.configurtion_unit_name')"
          />
          <NeTextInput
            v-model="configurationForm.unitDescription"
            :invalid-message="error.unitDescription"
            :placeholder="
              t('standalone.hotspot.settings.configurtion_unit_description_placeholder')
            "
            :label="t('standalone.hotspot.settings.configurtion_unit_description')"
          />
          <!-- TODO NETWORK DEVICE -->
          <NeTextInput
            v-model="configurationForm.networkAddress"
            :invalid-message="error.networkAddress"
            :placeholder="t('standalone.hotspot.settings.configurtion_network_address_placeholder')"
            :label="t('standalone.hotspot.settings.configurtion_network_address')"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configurtion_network_address_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <!-- TODO BUTTON USE DEFAULT-->
          <NeTextInput
            v-model="configurationForm.dhcpRangeStart"
            :invalid-message="error.dhcpRangeStart"
            :placeholder="
              t('standalone.hotspot.settings.configurtion_dhcp_range_start_placeholder')
            "
            :label="t('standalone.hotspot.settings.configurtion_dhcp_range_start')"
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
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.hotspot.settings.configurtion_dhcp_range_end_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeTextInput
            v-model="configurationForm.maxClientsAllowed"
            :invalid-message="error.maxClientsAllowed"
            :placeholder="
              t('standalone.hotspot.settings.configurtion_max_client_allowed_placeholder')
            "
            :label="t('standalone.hotspot.settings.configurtion_max_client_allowed')"
          />
        </div>
        <div class="flex justify-end">
          <NeButton
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
  </div>
</template>
