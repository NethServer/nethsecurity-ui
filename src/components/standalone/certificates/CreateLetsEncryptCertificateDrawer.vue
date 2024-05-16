<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  MessageBag,
  validateFQDN,
  validateRequired,
  validateUciName,
  type validationOutput
} from '@/lib/validation'
import {
  NeLink,
  NeInlineNotification,
  type NeComboboxOption,
  NeSideDrawer,
  NeButton,
  NeCombobox,
  NeTooltip,
  NeSkeleton,
  NeRadioSelection,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'

const props = defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-certificate'])

const loading = ref(false)
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())
const domainValidationErrors = ref<string[]>([])
const dnsApiOptionsKeyValidationErrors = ref<string[]>([])
const dnsApiOptionsValueValidationErrors = ref<string[]>([])
const showAdvancedSettings = ref(false)

// form fields
const certificateName = ref('')
const domains = ref<string[]>([''])
const validationMethod = ref<'standalone' | 'dns'>('standalone')
const dnsApi = ref('')
const dnsApiOptions = ref([{ key: '', value: '' }])

const dnsApiComboboxOptions = ref<NeComboboxOption[]>([])

const validationMethodOptions = [
  {
    id: 'standalone',
    label: t('standalone.certificates.standalone')
  },
  {
    id: 'dns',
    label: t('standalone.certificates.dns')
  }
]

function close() {
  if (!isSavingChanges.value) {
    validationErrorBag.value.clear()
    domainValidationErrors.value = []
    dnsApiOptionsKeyValidationErrors.value = []
    dnsApiOptionsValueValidationErrors.value = []
    error.value.notificationTitle = ''
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    emit('close')
  }
}

async function fetchOptions() {
  try {
    loading.value = true
    dnsApiComboboxOptions.value = (
      await ubusCall('ns.reverseproxy', 'list-dns-providers')
    ).data.values.map((x: string) => ({
      id: x,
      label: x
    }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_dns_providers')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value = false
  }
}

function resetForm() {
  showAdvancedSettings.value = false

  certificateName.value = ''
  domains.value = ['']
  validationMethod.value = 'standalone'
  dnsApi.value = dnsApiComboboxOptions.value?.[0]?.id ?? ''
  dnsApiOptions.value = [{ key: '', value: '' }]
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [validator.errMessage as string])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validate() {
  validationErrorBag.value.clear()
  domainValidationErrors.value = []
  dnsApiOptionsKeyValidationErrors.value = []
  dnsApiOptionsValueValidationErrors.value = []

  domains.value.forEach(() => {
    domainValidationErrors.value.push('')
  })
  dnsApiOptions.value.forEach(() => {
    dnsApiOptionsKeyValidationErrors.value.push('')
    dnsApiOptionsValueValidationErrors.value.push('')
  })

  let validDomains = true
  for (let [index, domain] of domains.value.entries()) {
    if (domain) {
      let validator = validateFQDN(domain, validationMethod.value === 'dns')
      if (!validator.valid) {
        domainValidationErrors.value[index] = t(validator.errMessage as string)
        validDomains = false
        break
      }
    } else {
      domainValidationErrors.value[index] = t('error.required')
      validDomains = false
    }
  }

  let validDnsOptions = true

  if (validationMethod.value === 'dns') {
    validDnsOptions = runValidators([validateRequired(dnsApi.value)], 'dns_provider')

    for (let [index, dnsApiOption] of dnsApiOptions.value.entries()) {
      if (!dnsApiOption.key) {
        dnsApiOptionsKeyValidationErrors.value[index] = t('error.required')
        validDnsOptions = false
      }
      if (!dnsApiOption.value) {
        dnsApiOptionsValueValidationErrors.value[index] = t('error.required')
        validDnsOptions = false
      }
    }
  }

  return (
    validDomains &&
    runValidators(
      [validateRequired(certificateName.value), validateUciName(certificateName.value)],
      'name'
    ) &&
    validDnsOptions
  )
}

async function createCertificate() {
  if (!validate()) {
    return
  }

  try {
    isSavingChanges.value = true
    await ubusCall('ns.reverseproxy', 'request-certificate', {
      name: certificateName.value,
      domains: domains.value,
      validation_method: validationMethod.value,
      ...(validationMethod.value === 'dns'
        ? {
            dns_provider: dnsApi.value,
            dns_provider_options: dnsApiOptions.value.map((x) => `${x.key}=${x.value}`)
          }
        : {})
    })
    isSavingChanges.value = false
    emit('add-certificate')
    close()
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = t('error.cannot_create_certificate')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
    }
    isSavingChanges.value = false
  }
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      fetchOptions().then(() => {
        resetForm()
      })
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="t('standalone.certificates.add_lets_encrypt_certificate')"
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton :lines="10" size="lg" v-if="loading" />
    <div class="flex flex-col gap-y-6" v-else>
      <NeTextInput
        v-model="certificateName"
        :label="t('standalone.certificates.certificate_name')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('name'))"
      />
      <NeMultiTextInput
        v-model="domains"
        :add-item-label="t('standalone.certificates.add_domain')"
        :title="t('standalone.certificates.domain')"
        :invalid-messages="domainValidationErrors"
        :general-invalid-message="t(validationErrorBag.getFirstI18nKeyFor('domains'))"
        :required="true"
      />
      <div>
        <NeButton kind="tertiary" @click="showAdvancedSettings = !showAdvancedSettings">
          {{ t('common.advanced_settings') }}
          <template #suffix>
            <font-awesome-icon
              :icon="['fas', showAdvancedSettings ? 'chevron-up' : 'chevron-down']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
        </NeButton>
      </div>
      <template v-if="showAdvancedSettings">
        <NeRadioSelection
          :label="t('standalone.certificates.validation_method')"
          :options="validationMethodOptions"
          v-model="validationMethod"
          ><template #tooltip>
            <NeTooltip
              ><template #content>{{
                t('standalone.certificates.validation_method_tooltip')
              }}</template></NeTooltip
            >
          </template></NeRadioSelection
        >
        <template v-if="validationMethod === 'dns'">
          <NeCombobox
            :label="t('standalone.certificates.dns_api')"
            :options="dnsApiComboboxOptions"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
            v-model="dnsApi"
            :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('dns_provider'))"
            :placeholder="t('standalone.certificates.choose_or_type_dns_api')"
            ><template #tooltip>
              <NeTooltip>
                <template #content>
                  <i18n-t
                    keypath="standalone.certificates.dns_api_tooltip"
                    tag="span"
                    scope="global"
                  >
                    <template #dnsapiurl>
                      <NeLink
                        invertedTheme
                        href="https://github.com/acmesh-official/acme.sh/wiki/dnsapi"
                        target="_blank"
                        >https://github.com/acmesh-official/acme.sh/wiki/dnsapi</NeLink
                      >
                    </template>
                  </i18n-t>
                </template>
              </NeTooltip>
            </template></NeCombobox
          >
          <NeMultiTextInput
            v-if="dnsApi"
            v-model="dnsApiOptions"
            key-input-type="text"
            :title="t('standalone.certificates.dns_api_options')"
            :key-input-placeholder="t('standalone.certificates.key')"
            :placeholder="t('standalone.certificates.value')"
            :use-key-input="true"
            :add-item-label="t('standalone.certificates.add_option')"
            :invalid-key-messages="dnsApiOptionsKeyValidationErrors"
            :invalid-messages="dnsApiOptionsValueValidationErrors"
            :required="true"
            :general-invalid-message="
              t(validationErrorBag.getFirstI18nKeyFor('dns_provider_options'))
            "
          />
        </template>
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createCertificate()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('standalone.certificates.add_certificate') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
