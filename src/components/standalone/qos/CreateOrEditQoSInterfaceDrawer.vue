<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  MessageBag,
  validatePositiveInteger,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import {
  NeSideDrawer,
  NeInlineNotification,
  NeToggle,
  NeTextInput,
  NeButton,
  getAxiosErrorMessage,
  NeCombobox,
  NeFormItemLabel,
  NeSkeleton,
  type NeComboboxOption
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import type { QoSInterface } from '@/views/standalone/network/QoSView.vue'

const props = defineProps<{
  isShown: boolean
  itemToEdit?: QoSInterface
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-qos-interface'])

const loading = ref(false)
const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// form fields
const enabled = ref(true)
const iface = ref('')
const downloadSpeed = ref('')
const uploadSpeed = ref('')

const ifaceOptions = ref<NeComboboxOption[]>([])

async function fetchOptions() {
  try {
    loading.value = true
    ifaceOptions.value = (await ubusCall('ns.devices', 'list-devices')).data.all_devices
      .filter((x: any) => x.iface && x.iface['.type'] === 'interface')
      .map((x: any) => ({
        id: x.iface['.name'],
        label: x.iface['.name'],
        description: x.iface.device
      }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_users')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    loading.value = false
  }
}

async function resetForm() {
  enabled.value = !props.itemToEdit?.disabled ?? true
  iface.value = props.itemToEdit?.interface ?? ifaceOptions.value?.[0]?.id ?? ''
  downloadSpeed.value = props.itemToEdit?.download.toString() ?? ''
  uploadSpeed.value = props.itemToEdit?.upload.toString() ?? ''
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

  const validators: [validationOutput[], string][] = [
    [[validateRequired(iface.value)], 'interface'],
    [
      [validateRequired(downloadSpeed.value), validatePositiveInteger(downloadSpeed.value)],
      'download'
    ],
    [[validateRequired(uploadSpeed.value), validatePositiveInteger(uploadSpeed.value)], 'upload']
  ]

  return validators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function createOrEditQosInterface() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isEditing = Boolean(props.itemToEdit)

  const requestType = isEditing ? 'edit' : 'add'

  if (!validate()) {
    return
  }

  isSavingChanges.value = true
  try {
    await ubusCall('ns.qos', requestType, {
      interface: iface.value,
      disabled: !enabled.value,
      upload: parseInt(uploadSpeed.value),
      download: parseInt(downloadSpeed.value)
    })
    isSavingChanges.value = false

    emit('add-edit-qos-interface')
    close()
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing
        ? t('error.cannot_edit_qos_interface')
        : t('error.cannot_create_qos_interace')

      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
    isSavingChanges.value = false
    return
  }
}

function close() {
  if (!isSavingChanges.value) {
    validationErrorBag.value.clear()
    error.value.notificationTitle = ''
    error.value.notificationDescription = ''
    error.value.notificationDetails = ''
    emit('close')
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
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="
      itemToEdit ? t('standalone.qos.edit_qos_interface') : t('standalone.qos.add_qos_interface')
    "
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
      <div>
        <NeFormItemLabel>{{ t('standalone.qos.status') }}</NeFormItemLabel>
        <NeToggle v-model="enabled" :label="enabled ? t('common.enabled') : t('common.disabled')" />
      </div>
      <NeCombobox
        :label="t('standalone.qos.interface')"
        :disabled="Boolean(itemToEdit)"
        :options="ifaceOptions"
        :no-options-label="t('ne_combobox.no_options_label')"
        :no-results-label="t('ne_combobox.no_results')"
        :placeholder="t('standalone.qos.choose_interface')"
        v-model="iface"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('interface'))"
      />
      <NeTextInput
        v-model="downloadSpeed"
        type="number"
        :label="`${t('standalone.qos.download_speed')} (Mbps)`"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('download'))"
      />
      <NeTextInput
        v-model="uploadSpeed"
        type="number"
        :label="`${t('standalone.qos.upload_speed')} (Mbps)`"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('upload'))"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditQosInterface()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{
            Boolean(itemToEdit) ? t('common.save') : t('standalone.qos.add_interface')
          }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>