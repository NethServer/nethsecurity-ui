<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  getAxiosErrorMessage,
  NeSideDrawer,
  NeTextInput,
  NeRadioSelection,
  focusElement,
  NeTooltip
} from '@nethesis/vue-components'
import { ref, type PropType, watch, type Ref, computed } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import {
  MessageBag,
  validateAlphanumeric,
  validateDomainName,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import type { IpVersion } from '@/views/standalone/users_objects/ObjectsView.vue'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import type { DomainSet } from '@/composables/useDomainSets'

const props = defineProps({
  isShown: { type: Boolean, default: false },
  currentDomainSet: {
    type: Object as PropType<DomainSet>
  },
  allDomainSets: {
    type: Array as PropType<DomainSet[]>,
    required: true
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const name = ref('')
const nameRef = ref()
const ipVersion = ref<IpVersion>('ipv4')
const records = ref<string[]>([''])
const recordRef = ref()
const errorBag = ref(new MessageBag())
// contains the first invalid field ref
const firstErrorRef = ref()

const loading = ref({
  saveDomainSet: false
})

const error = ref({
  saveDomainSet: '',
  saveDomainSetDetails: ''
})

const ipVersionOptions = ref([
  {
    id: 'ipv4',
    label: 'IPv4'
  },
  {
    id: 'ipv6',
    label: 'IPv6'
  }
])

const allObjectsButCurrent = computed(() => {
  return props.allDomainSets?.filter((domainSet) => domainSet.id !== props.currentDomainSet?.id)
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      focusElement(nameRef)

      if (props.currentDomainSet) {
        // editing domain set
        name.value = props.currentDomainSet.name
        ipVersion.value = props.currentDomainSet.family as IpVersion
        records.value = props.currentDomainSet.domain
      } else {
        // creating domain set, reset form to defaults
        name.value = ''
        ipVersion.value = 'ipv4'
        records.value = ['']
      }
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  errorBag.value.clear()
  error.value.saveDomainSet = ''
  error.value.saveDomainSetDetails = ''
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref<any>
): boolean {
  for (const validator of validators) {
    if (!validator.valid) {
      errorBag.value.set(fieldName, [validator.errMessage as string])

      // remember the first field with error for focus management
      if (!firstErrorRef.value) {
        firstErrorRef.value = fieldRef
      }
    }
  }
  return validators.every((validator) => validator.valid)
}

function validateRecords() {
  for (const record of records.value) {
    if (!record) {
      return { valid: false, errMessage: 'error.empty_domains' }
    }

    const { valid } = validateDomainName(record)
    if (!valid) {
      return { valid: false, errMessage: 'error.invalid_domains' }
    }
  }
  return { valid: true }
}

function validateDomainSetNotExists(value: string) {
  if (allObjectsButCurrent.value?.find((obj) => obj.name === value)) {
    return {
      valid: false,
      errMessage: 'standalone.objects.domain_set_already_exists'
    }
  }
  return {
    valid: true
  }
}

function validate() {
  const allValidators: [validationOutput[], string, Ref<any>][] = [
    // name
    [
      [
        validateRequired(name.value),
        validateAlphanumeric(name.value, true),
        validateDomainSetNotExists(name.value)
      ],
      'name',
      nameRef
    ],
    // records
    [[validateRecords()], 'domain', recordRef]
  ]

  // reset firstErrorRef for focus management
  firstErrorRef.value = undefined

  const isValidationOk = allValidators
    .map(([validators, fieldName, fieldRef]) => runFieldValidators(validators, fieldName, fieldRef))
    .every((result) => result)

  if (firstErrorRef.value) {
    focusElement(firstErrorRef.value)
  }
  return isValidationOk
}

async function saveDomainSet() {
  clearErrors()

  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  loading.value.saveDomainSet = true

  const payload: any = {
    name: name.value,
    family: ipVersion.value,
    domain: records.value
  }

  if (props.currentDomainSet) {
    // editing
    payload.id = props.currentDomainSet.id.replace('objects/', '')
  }

  const apiMethod = props.currentDomainSet ? 'edit-domain-set' : 'add-domain-set'

  try {
    await ubusCall('ns.objects', apiMethod, payload)
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.saveDomainSet = t(getAxiosErrorMessage(err))
      error.value.saveDomainSetDetails = err.toString()
    }
  } finally {
    loading.value.saveDomainSet = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="
      props.currentDomainSet
        ? t('standalone.objects.edit_domain_set')
        : t('standalone.objects.add_domain_set')
    "
    :close-aria-label="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form @submit.prevent>
      <div class="space-y-6">
        <!-- name -->
        <NeTextInput
          ref="nameRef"
          v-model.trim="name"
          :label="t('standalone.objects.name')"
          :invalid-message="t(errorBag.getFirstI18nKeyFor('name'))"
          :helper-text="t('standalone.objects.name_helper')"
          :disabled="loading.saveDomainSet"
          maxlength="16"
        />
        <!-- ip version -->
        <NeRadioSelection
          v-model="ipVersion"
          :disabled="loading.saveDomainSet"
          :label="t('standalone.objects.ip_version')"
          :options="ipVersionOptions"
        >
          <template #tooltip>
            <NeTooltip placement="top-start">
              <template #content>{{
                t('standalone.objects.ip_family_domain_set_tooltip')
              }}</template>
            </NeTooltip>
          </template>
        </NeRadioSelection>
        <!-- domains -->
        <NeMultiTextInput
          v-model="records"
          :title="t('standalone.objects.domains')"
          :add-item-label="t('standalone.objects.add_domain')"
          :disable-inputs="loading.saveDomainSet"
          :disable-add-button="loading.saveDomainSet"
          required
        />
        <!-- records invalid message -->
        <p
          v-if="errorBag.getFirstI18nKeyFor('domain')"
          :class="'mt-2 text-sm text-rose-700 dark:text-rose-400'"
        >
          {{ t(errorBag.getFirstI18nKeyFor('domain')) }}
        </p>
        <!-- save domain set error notification -->
        <NeInlineNotification
          v-if="error.saveDomainSet"
          kind="error"
          :title="t('error.cannot_save_domain_set')"
          :description="error.saveDomainSet"
        >
          <template v-if="error.saveDomainSetDetails" #details>
            {{ error.saveDomainSetDetails }}
          </template>
        </NeInlineNotification>
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          :disabled="loading.saveDomainSet"
          class="mr-3"
          @click.prevent="closeDrawer"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          :disabled="loading.saveDomainSet"
          :loading="loading.saveDomainSet"
          @click.prevent="saveDomainSet"
        >
          {{
            props.currentDomainSet
              ? t('standalone.objects.save_domain_set')
              : t('standalone.objects.add_domain_set')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
