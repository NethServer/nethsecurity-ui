<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  MessageBag,
  validateFQDN,
  validateIpCidr,
  validatePath,
  validateRequired,
  validateURL,
  type validationOutput
} from '@/lib/validation'
import type { ReverseProxy } from '@/views/standalone/network/ReverseProxyView.vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeSideDrawer,
  NeSkeleton,
  NeButton,
  NeTooltip,
  NeRadioSelection,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'

type CreateOrEditProxyPayload = {
  path?: string
  destination: string
  description: string
  allow?: string[]
  domain?: string
  certificate?: string
  id?: string
}

const props = defineProps<{
  isShown: boolean
  itemToEdit: ReverseProxy | null
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-proxy'])

const loading = ref(false)
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())
const allowedNetworksValidationErrors = ref<string[]>([])

const id = ref('')
const type = ref<'path' | 'domain'>('path')
const destinationURL = ref('')
const description = ref('')
const allowedNetworks = ref<string[]>([])

const path = ref('')

const domain = ref('')
const certificate = ref('_lan')

const typeOptions = [
  {
    id: 'path',
    label: t('standalone.reverse_proxy.path')
  },
  {
    id: 'domain',
    label: t('standalone.reverse_proxy.domain')
  }
]

const certificateOptions = ref<NeComboboxOption[]>([])

function clearValidationErrors() {
  allowedNetworksValidationErrors.value = []
  validationErrorBag.value.clear()
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (const validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [validator.errMessage as string])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validate() {
  // allowed networks validation
  allowedNetworks.value.forEach(() => {
    allowedNetworksValidationErrors.value.push('')
  })

  let validAllowedNetworks = true
  for (const [index, network] of allowedNetworks.value.entries()) {
    const cidrValidator = validateIpCidr(network)
    if (network != '' && !cidrValidator.valid) {
      allowedNetworksValidationErrors.value[index] = t(cidrValidator.errMessage as string)
      validAllowedNetworks = false
    }
  }

  const pathValidators: [validationOutput[], string][] = [
    [[validateRequired(path.value), validatePath(path.value)], 'path']
  ]
  const domainValidators: [validationOutput[], string][] = [
    [[validateRequired(domain.value), validateFQDN(domain.value, false)], 'domain']
  ]
  const validators: [validationOutput[], string][] = [
    [[validateRequired(destinationURL.value), validateURL(destinationURL.value)], 'destination'],
    [[validateRequired(description.value)], 'description'],
    ...(type.value === 'path' ? pathValidators : domainValidators)
  ]
  return (
    validators
      .map(([validator, label]) => runValidators(validator, label))
      .every((result) => result) && validAllowedNetworks
  )
}

async function createOrEditProxy() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''

  clearValidationErrors()

  if (!validate()) {
    return
  }

  const requestType =
    type.value === 'domain'
      ? id.value
        ? 'edit-domain'
        : 'add-domain'
      : id.value
        ? 'edit-path'
        : 'add-path'

  const networksToInclude = allowedNetworks.value.filter(Boolean)
  const payload: CreateOrEditProxyPayload = {
    destination: destinationURL.value,
    description: description.value
  }
  if (id.value) {
    payload.id = id.value
  }
  if (networksToInclude.length > 0) {
    payload.allow = networksToInclude
  }
  if (type.value === 'path') {
    payload.path = path.value
  } else {
    payload.domain = domain.value
    payload.certificate = certificate.value
  }

  try {
    isSavingChanges.value = true
    await ubusCall('ns.reverseproxy', requestType, payload)
    emit('add-edit-proxy')
    close()
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = id.value
        ? t('error.cannot_edit_proxy')
        : t('error.cannot_add_proxy')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } finally {
    isSavingChanges.value = false
  }
}

async function fetchOptions() {
  try {
    const certificatesData = (await ubusCall('ns.reverseproxy', 'list-certificates')).data.values
    certificateOptions.value = [
      ...Object.keys(certificatesData)
        .filter((x) => !certificatesData[x].pending)
        .map((x) => ({
          id: x,
          label: x === '_lan' ? t('standalone.reverse_proxy.default_certificate') : x
        }))
    ]
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_certificates')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function resetForm() {
  if (props.itemToEdit) {
    const initialItem = props.itemToEdit
    id.value = initialItem.id
    type.value = initialItem.type === 'location' ? 'path' : 'domain'
    if (type.value === 'domain') {
      domain.value = initialItem.domain!
      certificate.value = initialItem.certificate!
    } else {
      path.value = initialItem.location
    }
    destinationURL.value = initialItem.destination
    description.value = initialItem.description
    allowedNetworks.value = initialItem.allow ?? []
  } else {
    id.value = ''
    type.value = 'path'
    destinationURL.value = ''
    description.value = ''
    allowedNetworks.value = []
    path.value = ''
    domain.value = ''
    certificate.value = '_lan'
  }
}

function close() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  clearValidationErrors()
  emit('close')
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      loading.value = true
      fetchOptions().then(() => {
        resetForm()
        loading.value = false
      })
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :close-aria-label="t('common.shell.close_side_drawer')"
    :title="
      id
        ? t('standalone.reverse_proxy.edit_reverse_proxy')
        : t('standalone.reverse_proxy.add_reverse_proxy')
    "
    @close="close()"
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" :lines="20" />
    <div v-else class="flex flex-col gap-y-6">
      <NeRadioSelection
        v-model="type"
        :label="t('standalone.reverse_proxy.type')"
        :options="typeOptions"
        :disabled="Boolean(itemToEdit)"
      />
      <NeTextInput
        v-if="type === 'path'"
        v-model="path"
        :label="t('standalone.reverse_proxy.path')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('path'))"
        ><template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.reverse_proxy.path_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
      <template v-else>
        <NeTextInput
          v-model="domain"
          :label="t('standalone.reverse_proxy.domain')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('domain'))"
          :disabled="Boolean(itemToEdit)"
          ><template #tooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.reverse_proxy.domain_tooltip') }}
              </template>
            </NeTooltip>
          </template></NeTextInput
        >
        <NeCombobox
          v-model="certificate"
          :label="t('standalone.reverse_proxy.certificate')"
          :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('certificate'))"
          :no-options-label="t('ne_combobox.no_options_label')"
          :no-results-label="t('ne_combobox.no_results')"
          :options="certificateOptions"
          :limited-options-label="t('ne_combobox.limited_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
          :optional-label="t('common.optional')"
        />
        <NeInlineNotification
          v-if="certificateOptions.length == 1 && certificateOptions[0].id == '_lan'"
          :title="t('standalone.reverse_proxy.no_certificate_configured_title')"
          :description="t('standalone.reverse_proxy.no_certificate_configured_description')"
          kind="warning"
          :primary-button-label="t('standalone.reverse_proxy.go_to_certificates')"
          @primary-click="
            () => {
              $router.push('/standalone/system/certificates')
            }
          "
        />
      </template>
      <NeTextInput
        v-model="destinationURL"
        :label="t('standalone.reverse_proxy.destination_url')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('destination'))"
        ><template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.reverse_proxy.destination_url_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeTextInput
      >
      <NeTextInput
        v-model="description"
        :label="t('standalone.reverse_proxy.description')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('description'))"
      />
      <NeMultiTextInput
        v-model="allowedNetworks"
        :add-item-label="t('standalone.reverse_proxy.add_cidr_network')"
        :title="t('standalone.reverse_proxy.allowed_networks')"
        :invalid-messages="allowedNetworksValidationErrors"
        :general-invalid-message="t(validationErrorBag.getFirstI18nKeyFor('allow'))"
        ><template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.reverse_proxy.allowed_networks_tooltip') }}
            </template>
          </NeTooltip>
        </template></NeMultiTextInput
      >
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          @click="createOrEditProxy()"
          >{{ id ? t('common.save') : t('standalone.reverse_proxy.add_reverse_proxy') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
