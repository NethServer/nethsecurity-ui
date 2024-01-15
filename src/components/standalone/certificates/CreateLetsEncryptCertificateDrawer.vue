<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { MessageBag, type validationOutput } from '@/lib/validation'
import { getAxiosErrorMessage, type NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeSideDrawer,
  NeButton,
  NeRadioSelection,
  NeCombobox,
  NeTooltip,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import { ValidationError } from '@/lib/standalone/ubus'

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
const showAdvancedSettings = ref(false)

// form fields
const certificateName = ref('')
const domains = ref<string[]>([''])
const validationMethod = ref<'standalone' | 'dns'>('standalone')
const dnsApi = ref('')
const dnsApiOptions = ref<{ key: string; value: string }[]>([])

const dnsApiComboboxOptions = ref<NeComboboxOption[]>([])
const validationMethodOptions = ref<NeComboboxOption[]>([
  {
    id: 'standalone',
    label: t('standalone.certificates.standalone')
  },
  {
    id: 'dns',
    label: t('standalone.certificates.dns')
  }
])

function close() {
  if (!isSavingChanges.value) {
    validationErrorBag.value.clear()
    error.value.notificationTitle = ''
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    emit('close')
  }
}

function resetForm() {
  certificateName.value = ''
  domains.value = ['']
  validationMethod.value = 'standalone'
  dnsApi.value = ''
  dnsApiOptions.value = []
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
  //TODO: handle validation
  return true
}

async function createCertificate() {
  if (!validate()) {
    return
  }

  try {
    isSavingChanges.value = true
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = t('error.cannot_create_certificate')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
    }
  } finally {
    isSavingChanges.value = false
  }
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      resetForm()
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
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
    <NeSkeleton :lines="20" v-if="loading" />
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
      />
      <div>
        <NeButton kind="tertiary" @click="showAdvancedSettings = !showAdvancedSettings">
          {{ t('standalone.certificates.advanced_settings') }}
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
            :no-options-label="t('ne_combobox.no_options_label')"
            :no-results-label="t('ne_combobox.no_results')"
            v-model="dnsApi"
            :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('dnsApi'))"
            :placeholder="t('standalone.certificates.choose_or_type_dns_api')"
          />
          <!-- TODO: add DNS API options field -->
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
