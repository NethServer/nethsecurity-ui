<script lang="ts" setup>
import { ref } from 'vue'
import { NeButton, NeTextInput, NeTooltip } from '@nethserver/vue-tailwind-lib'
import { faSave, faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { validateRequired } from '@/lib/validation'

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

const configurationForm = ref<Configuration>({
  unitName: '',
  unitDescription: '',
  networkAddress: '',
  dhcpRangeStart: '',
  dhcpRangeEnd: '',
  maxClientsAllowed: ''
})

let logging = ref(false)
let saving = ref(false)

let objError = {
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

function validateLogin(): boolean {
  let isValidationOk = true

  if (!loginForm.value.hostname) {
    let { valid, errMessage } = validateRequired(loginForm.value.hostname)
    if (!valid) {
      error.value.hostname = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!loginForm.value.username) {
    let { valid, errMessage } = validateRequired(loginForm.value.username)
    if (!valid) {
      error.value.username = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!loginForm.value.password) {
    let { valid, errMessage } = validateRequired(loginForm.value.password)
    if (!valid) {
      error.value.password = t(errMessage as string)
      isValidationOk = false
    }
  }

  return isValidationOk
}

function login() {
  if (validateLogin()) {
    logging.value = true
    // TODO
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
          />
          <NeTextInput
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
            v-model="loginForm.password"
            :invalid-message="error.password"
            :label="t('standalone.hotspot.settings.login_password')"
          />
        </div>
      </form>
      <!-- Save Button -->
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
    </FormLayout>
    <FormLayout :title="t('standalone.hotspot.settings.configurtion')">
      <form>
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
      </form>
      <!-- Save Button -->
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
    </FormLayout>
  </div>
</template>
