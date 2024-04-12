<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeFileInput,
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeFormItemLabel,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { MessageBag, validateFile, validateRequired, type validationOutput } from '@/lib/validation'
import { watch } from 'vue'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import { getUploadedFilePath, uploadFile } from '@/lib/standalone/fileUpload'

const props = defineProps<{
  isShown: boolean
}>()
const emit = defineEmits(['close', 'certificate-imported'])

const { t } = useI18n()
const importCertificateError = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const isImporting = ref(false)
const validationErrorBag = ref(new MessageBag())

const certificateName = ref('')
const certificateFile = ref<File | null>(null)
const privateKeyFile = ref<File | null>(null)
const chainFile = ref<File | null>(null)

function resetForm() {
  certificateName.value = ''
  certificateFile.value = null
  privateKeyFile.value = null
  chainFile.value = null
}

function close() {
  if (!isImporting.value) {
    importCertificateError.value.notificationDescription = ''
    importCertificateError.value.notificationDetails = ''
    emit('close')
  }
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
    [[validateRequired(certificateName.value)], 'name'],
    [[validateFile(certificateFile.value)], 'certificate_path'],
    [[validateFile(privateKeyFile.value)], 'key_path']
  ]

  return validators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function importCertificate() {
  importCertificateError.value.notificationDescription = ''
  importCertificateError.value.notificationDetails = ''

  if (!validate()) {
    return
  }

  isImporting.value = true
  let certFileUploadFilename = ''
  let pKeyFileUploadFilename = ''
  let chainFileUploadFilename = ''

  try {
    // upload certificate files
    certFileUploadFilename = (await uploadFile(certificateFile.value as File)).data.data
    pKeyFileUploadFilename = (await uploadFile(privateKeyFile.value as File)).data.data
    if (chainFile.value) {
      chainFileUploadFilename = (await uploadFile(chainFile.value as File)).data.data
    }
  } catch (err: any) {
    importCertificateError.value.notificationTitle = t('error.cannot_upload_certificate_files')
    importCertificateError.value.notificationDescription = t(getAxiosErrorMessage(err))
    importCertificateError.value.notificationDetails = err.toString()
    isImporting.value = false
    return
  }

  try {
    await ubusCall('ns.reverseproxy', 'add-certificate', {
      name: certificateName.value,
      certificate_path: getUploadedFilePath(certFileUploadFilename),
      key_path: getUploadedFilePath(pKeyFileUploadFilename),
      ...(chainFileUploadFilename
        ? { chain_path: getUploadedFilePath(chainFileUploadFilename) }
        : {})
    })
    isImporting.value = false
    emit('certificate-imported')
    close()
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      importCertificateError.value.notificationTitle = t('error.cannot_import_certificate')
      importCertificateError.value.notificationDescription = t(getAxiosErrorMessage(err))
      importCertificateError.value.notificationDetails = err.toString()
    }
    isImporting.value = false
  }
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      resetForm()
      validationErrorBag.value.clear()
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="t('standalone.certificates.import_certificate')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        kind="error"
        v-if="importCertificateError.notificationDescription"
        :title="t('error.cannot_import_certificate')"
        :description="importCertificateError.notificationDescription"
        ><template v-if="importCertificateError.notificationDetails" #details>
          {{ importCertificateError.notificationDetails }}
        </template></NeInlineNotification
      >
      <NeTextInput
        :label="t('standalone.certificates.certificate_name')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('name'))"
        v-model="certificateName"
      />
      <NeFileInput
        :label="t('standalone.certificates.certificate')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('certificate_path'))"
        :dropzoneLabel="t('ne_file_input.dropzone_label')"
        v-model="certificateFile"
      />
      <NeFileInput
        :label="t('standalone.certificates.private_key')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('key_path'))"
        :dropzoneLabel="t('ne_file_input.dropzone_label')"
        v-model="privateKeyFile"
      />
      <div>
        <div class="flex flex-row justify-between">
          <NeFormItemLabel>{{ t('standalone.certificates.chain_file') }}</NeFormItemLabel>
          <NeFormItemLabel>{{ t('common.optional') }}</NeFormItemLabel>
        </div>
        <NeFileInput :dropzoneLabel="t('ne_file_input.dropzone_label')" v-model="chainFile" />
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="importCertificate()"
          :disabled="isImporting"
          :loading="isImporting"
          >{{ t('standalone.certificates.import') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
