<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { cloneDeep } from 'lodash-es'
import {
  NeInlineNotification,
  type NeComboboxOption,
  NeButton,
  getAxiosErrorMessage,
  NeSideDrawer,
  NeTextInput,
  NeRadioSelection,
  NeCombobox,
  NeTooltip,
  focusElement,
  NeFormItemLabel
} from '@nethesis/vue-components'
import { ref, type PropType, watch, type Ref, computed } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import {
  MessageBag,
  validateAlphanumeric,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import type { IpVersion } from '@/views/standalone/users_objects/ObjectsView.vue'
import type { HostSet } from '@/composables/useHostSets'

const props = defineProps({
  isShown: { type: Boolean, default: false },
  currentHostSet: {
    type: Object as PropType<HostSet>
  },
  allObjects: {
    type: Array as PropType<HostSet[]>,
    required: true
  },
  recordOptions: {
    type: Array as PropType<NeComboboxOption[]>
  }
})

type MatchInfo = {
  database: string
  family: 'ipv4' | 'ipv6'
  id: string
  name: string
  type: string
}

type MatchInfoResponse = AxiosResponse<{
  info: Record<string, MatchInfo>
}>

const emit = defineEmits(['close', 'reloadData'])

const portForwardsUsingHostSet = ref('')
const { t } = useI18n()
const name = ref('')
const nameRef = ref()
const ipVersion = ref<IpVersion>('ipv4')
const records = ref<NeComboboxOption[]>([''])
const recordRef = ref()
const errorBag = ref(new MessageBag())
// contains the first invalid field ref
const firstErrorRef = ref()

const loading = ref({
  saveHostSet: false
})

const error = ref({
  saveHostSet: '',
  saveHostSetDetails: ''
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

const recordOptionsButCurrent = computed(() => {
  // Filter out objects from recordOptions based on the presence of an IP address with a hyphen in allObjects
  const objectsWithHyphenIp = props.allObjects
    .filter((obj) => obj.ipaddr.some((ip: string) => ip.includes('-')))
    .map((obj) => obj.id)
  return props.recordOptions?.filter(
    (option) => option.id !== props.currentHostSet?.id && !objectsWithHyphenIp.includes(option.id)
  )
})

const allObjectsButCurrent = computed(() => {
  return props.allObjects?.filter((obj) => obj.id !== props.currentHostSet?.id)
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      focusElement(nameRef)

      if (props.currentHostSet) {
        // editing host or host set
        name.value = props.currentHostSet.name
        ipVersion.value = props.currentHostSet.family as IpVersion
        records.value = cloneDeep(props.currentHostSet.ipaddr) // deep clone to avoid modifying the original array
      } else {
        // creating host or host set, reset form to defaults
        name.value = ''
        ipVersion.value = 'ipv4'
        records.value = ['']
      }
    }
  }
)

// compute portForwardsUsingHostSet the name of the portforward rule using this object
watch(
  () => props.currentHostSet?.matches,
  async (matches) => {
    if (matches) {
      portForwardsUsingHostSet.value = await getMatchedItemsName(matches)
    } else {
      portForwardsUsingHostSet.value = ''
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  errorBag.value.clear()
  error.value.saveHostSet = ''
  error.value.saveHostSetDetails = ''
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref<any>
): boolean {
  for (let validator of validators) {
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

async function getMatchedItemsName(matches: string[]): Promise<string> {
  try {
    const res: MatchInfoResponse = await ubusCall('ns.objects', 'get-info', { ids: matches })
    const names: string[] = []
    for (const match of Object.values(res.data.info)) {
      if (match.type == 'redirect') {
        names.push(match.name)
      }
    }
    return names.join(', ')
  } catch (error: any) {
    console.error('Error fetching getMatchedItemsName:', error)
    return ''
  }
}

function validateNoIpRangeWithPortForward(records: Array<string>) {
  for (const record of records) {
    if (record.includes('-') && portForwardsUsingHostSet.value) {
      return {
        valid: false,
        errMessage: 'standalone.objects.range_not_compatible_with_port_forward'
      }
    }
  }
  return {
    valid: true
  }
}

function validateNoObjectsWithPortForward(records: Array<string>) {
  for (const record of records) {
    if (record.includes('objects/') && portForwardsUsingHostSet.value) {
      return {
        valid: false,
        errMessage: 'standalone.objects.objects_are_not_compatible_with_port_forward'
      }
    }
  }
  return {
    valid: true
  }
}

function validateHostSetNotExists(value: string) {
  if (allObjectsButCurrent.value?.find((obj) => obj.name === value && obj.subtype === 'host_set')) {
    return {
      valid: false,
      errMessage: 'standalone.objects.host_set_already_exists'
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
        validateHostSetNotExists(name.value)
      ],
      'name',
      nameRef
    ],
    // records
    [
      [
        validateNoObjectsWithPortForward(records.value),
        validateNoIpRangeWithPortForward(records.value),
        validateRequired(records.value[0])
      ],
      'ipaddr',
      recordRef
    ]
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

async function saveHostSet() {
  clearErrors()

  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  loading.value.saveHostSet = true

  const payload: any = {
    name: name.value,
    family: ipVersion.value,
    ipaddr: records.value
  }

  if (props.currentHostSet) {
    // editing
    payload.id = props.currentHostSet.id.replace('objects/', '')
  }

  const apiMethod = props.currentHostSet ? 'edit-host-set' : 'add-host-set'

  try {
    await ubusCall('ns.objects', apiMethod, payload)
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.saveHostSet = t(getAxiosErrorMessage(err))
      error.value.saveHostSetDetails = err.toString()
    }
  } finally {
    loading.value.saveHostSet = false
  }
}

function addRecord() {
  records.value.push('')
}

function deleteRecord(index: number) {
  records.value.splice(index, 1)
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="
      currentHostSet ? t('standalone.objects.edit_host_set') : t('standalone.objects.add_host_set')
    "
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form @submit.prevent>
      <div class="space-y-6">
        <!-- name -->
        <NeTextInput
          :label="t('standalone.objects.name')"
          v-model.trim="name"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('name'))"
          :helperText="t('standalone.objects.name_helper')"
          :disabled="loading.saveHostSet"
          maxlength="16"
          ref="nameRef"
        />
        <!-- ip version -->
        <NeRadioSelection
          v-model="ipVersion"
          :disabled="loading.saveHostSet"
          :label="t('standalone.objects.ip_version')"
          :options="ipVersionOptions"
        >
          <template #tooltip>
            <NeTooltip placement="top-start">
              <template #content>{{ t('standalone.objects.ip_family_host_set_tooltip') }}</template>
            </NeTooltip>
          </template>
        </NeRadioSelection>
        <!-- records -->
        <div>
          <NeFormItemLabel>
            {{ t('standalone.objects.records') }}
            <NeTooltip class="ml-1">
              <template #content>{{ t('standalone.objects.host_set_records_tooltip') }}</template>
            </NeTooltip>
          </NeFormItemLabel>
          <div class="space-y-3">
            <div v-for="(record, i) in records" :key="record + i" class="flex items-start gap-2">
              <NeCombobox
                :key="record + i"
                v-model="records[i]"
                :disabled="loading.saveHostSet"
                :options="recordOptionsButCurrent"
                :placeholder="t('ne_combobox.choose_or_enter')"
                acceptUserInput
                :optionalLabel="t('common.optional')"
                :noResultsLabel="t('ne_combobox.no_results')"
                :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
                :noOptionsLabel="t('ne_combobox.no_options_label')"
                :selected-label="t('ne_combobox.selected')"
                :user-input-label="t('ne_combobox.user_input_label')"
                class="grow"
              />
              <NeButton kind="tertiary" size="md" @click="deleteRecord(i)" :disabled="i < 1">
                <font-awesome-icon
                  :icon="['fas', 'trash']"
                  class="h-4 w-4 py-1"
                  aria-hidden="true"
                />
              </NeButton>
            </div>
            <!-- records invalid message -->
            <p
              v-if="errorBag.getFirstI18nKeyFor('ipaddr')"
              :class="'mt-2 text-sm text-rose-700 dark:text-rose-400'"
            >
              {{
                t(errorBag.getFirstI18nKeyFor('ipaddr'), {
                  name: portForwardsUsingHostSet
                })
              }}
            </p>
            <NeButton class="mt-4" size="md" @click="addRecord" kind="secondary">
              <template #prefix>
                <font-awesome-icon
                  :icon="['fas', 'circle-plus']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </template>
              {{ t('standalone.objects.add_record') }}
            </NeButton>
          </div>
        </div>
        <!-- saveHostSet error notification -->
        <NeInlineNotification
          v-if="error.saveHostSet"
          kind="error"
          :title="t('error.cannot_save_host_set')"
          :description="error.saveHostSet"
        >
          <template #details v-if="error.saveHostSetDetails">
            {{ error.saveHostSetDetails }}
          </template>
        </NeInlineNotification>
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          @click.prevent="closeDrawer"
          :disabled="loading.saveHostSet"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="saveHostSet"
          :disabled="loading.saveHostSet"
          :loading="loading.saveHostSet"
        >
          {{
            currentHostSet
              ? t('standalone.objects.save_host_set')
              : t('standalone.objects.add_host_set')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
