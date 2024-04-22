<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeCombobox,
  NeFileInput,
  NeProgressBar,
  NeInlineNotification,
  NeButton,
  NeTooltip,
  NeSkeleton,
  NeSideDrawer,
  NeRadioSelection,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { validateFile, validateRequired } from '@/lib/validation'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { uploadFile } from '@/lib/standalone/fileUpload'

const { t } = useI18n()
const RESTORE_WAIT_TIME = 45000

const formRestore = ref({
  passphrase: '',
  file: undefined,
  backup: ''
})

const loading = ref(true)
const loadingRestore = ref(false)
const isEnterprise = ref(false)
const isSetPassphrase = ref(false)
const showRestoreDrawer = ref(false)
const typeRestore = ref('upload_file')
const listBackups: any = ref([])
const isRestoring = ref(false)
const restoreProgress = ref(0)
const restoreIntervalRef = ref<number | undefined>()
const restoreTimeoutRef = ref<number | undefined>()
const sourceRestoreOptions = [
  {
    id: 'from_backup',
    label: t('standalone.backup_and_restore.restore.from_backup')
  },
  {
    id: 'upload_file',
    label: t('standalone.backup_and_restore.restore.from_file')
  }
]
const passphraseRef = ref()
const fileRef = ref()
const backupRef = ref()

const uploadProgress = ref(0)
const isUploadingBackupFile = ref(false)
const uploadedBackupFileName = ref('')
const canRestoreBackupFile = ref(false)

let errorPage = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
let errorRestoreBackup = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
let errorRestore = ref({
  passphrase: '',
  file: '',
  backup: ''
})

onMounted(() => {
  getSubscription()
  getIsPassphrase()
})

async function getSubscription() {
  try {
    let res = await ubusCall('ns.subscription', 'info', {})
    if (res?.data?.systemd_id && res?.data?.active) {
      isEnterprise.value = true
      typeRestore.value = 'from_backup'
      await getBackups()
    }
  } catch (exception: any) {
    errorPage.value.notificationTitle = t('error.cannot_retrieve_subscription_info')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
    errorPage.value.notificationDetails = exception.toString()
  } finally {
    loading.value = false
  }
}

async function getIsPassphrase() {
  try {
    let res = await ubusCall('ns.backup', 'is-passphrase-set', {})
    if (res?.data?.values?.set) {
      isSetPassphrase.value = true
    }
  } catch (exception: any) {
    errorPage.value.notificationTitle = t('error.cannot_retrieve_passphrase')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
    errorPage.value.notificationDetails = exception.toString()
  } finally {
    loading.value = false
  }
}

async function getBackups() {
  if (isEnterprise.value) {
    try {
      let res = await ubusCall('ns.backup', 'registered-list-backups')
      if (res?.data?.values?.length) {
        listBackups.value = res.data.values.map((item: any) => ({
          id: item.file,
          label: item.name
        }))
      }
    } catch (exception: any) {
      errorPage.value.notificationTitle = t('error.cannot_retrieve_backup')
      errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
      errorPage.value.notificationDetails = exception.toString()
    }
  }
}

function validateRestore(): boolean {
  let isValidationOk = true
  let isFocusInput = false

  if (isSetPassphrase.value) {
    let { valid, errMessage } = validateRequired(formRestore.value.passphrase)
    if (!valid) {
      errorRestore.value.passphrase = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(passphraseRef)
    isFocusInput = true
  }

  if (typeRestore.value === 'upload_file') {
    let { valid, errMessage } = validateRequired(
      formRestore?.value?.file ? formRestore.value.file : ''
    )
    if (!valid) {
      errorRestore.value.file = t(errMessage as string)
      isValidationOk = false
    }
  } else if (isEnterprise.value && typeRestore.value === 'from_backup') {
    let { valid, errMessage } = validateRequired(formRestore.value.backup)
    if (!valid) {
      errorRestore.value.backup = t(errMessage as string)
      isValidationOk = false
    }

    if (!isValidationOk && !isFocusInput) {
      focusElement(backupRef)
    }
  }

  return isValidationOk
}

function clearErrors() {
  errorRestore.value = {
    passphrase: '',
    file: '',
    backup: ''
  }
}

async function restoreBackup() {
  clearErrors()
  if (validateRestore()) {
    loadingRestore.value = true
    let error = false
    try {
      let payload = {}
      let methodCall = 'restore'

      if (isSetPassphrase.value) {
        Object.assign(payload, { passphrase: formRestore.value.passphrase })
      }

      if (isEnterprise.value && typeRestore.value === 'from_backup') {
        methodCall = 'registered-restore'
        Object.assign(payload, { file: formRestore.value.backup })
      } else {
        Object.assign(payload, { backup: uploadedBackupFileName.value })
      }

      if (!error && methodCall) {
        let res = await ubusCall('ns.backup', methodCall, payload)
        if (res?.data?.message && res?.data?.message === 'success') {
          isRestoring.value = true
          showRestoreDrawer.value = false
          setRestoreTimer()
        }
      } else {
        errorRestoreBackup.value.notificationTitle = t('error.cannot_restore_backup')
      }
    } catch (exception: any) {
      errorPage.value.notificationTitle = t('error.cannot_restore_backup')
      errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
      errorPage.value.notificationDetails = exception.toString()
    } finally {
      loadingRestore.value = false
    }
  }
}

async function handleFileUpload() {
  errorRestore.value.file = ''
  isUploadingBackupFile.value = false
  canRestoreBackupFile.value = false

  if (!formRestore.value.file) {
    return
  }

  const tarGzFileValidation = validateFile(formRestore.value.file as File | null, 'tar.gz')
  const tarGzGpgFileValidation = validateFile(formRestore.value.file as File | null, 'tar.gz.gpg')

  if (!tarGzFileValidation.valid && tarGzGpgFileValidation.valid) {
    const validatorErrMessage = !tarGzFileValidation.valid
      ? tarGzFileValidation.errMessage
      : tarGzGpgFileValidation.errMessage
    errorRestore.value.file = t(validatorErrMessage as string)
    return
  }

  try {
    uploadProgress.value = 0.1
    isUploadingBackupFile.value = true
    const uploadResult = await uploadFile(formRestore.value.file as File, (e) => {
      uploadProgress.value = (e.progress as number) * 100
    })
    uploadedBackupFileName.value = uploadResult.data.data
    canRestoreBackupFile.value = true
  } catch (err: any) {
    errorPage.value.notificationTitle = t('error.cannot_upload_backup')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(err))
    errorPage.value.notificationDetails = err.toString()
  } finally {
    isUploadingBackupFile.value = false
  }
}

function setRestoreTimer() {
  restoreTimeoutRef.value = setTimeout(() => {
    location.reload()
  }, RESTORE_WAIT_TIME)

  restoreIntervalRef.value = setInterval(() => {
    restoreProgress.value += 0.5
  }, RESTORE_WAIT_TIME / 200)
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification
      v-if="!loading && errorPage.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorPage.notificationTitle"
      :description="errorPage.notificationDescription"
    >
      <template v-if="errorPage.notificationDetails" #details>
        {{ errorPage.notificationDetails }}
      </template>
    </NeInlineNotification>
    <template v-if="!loading && !errorPage.notificationTitle">
      <FormLayout
        :description="t('standalone.backup_and_restore.restore.description')"
        class="max-w-6xl"
      >
        <div class="flex">
          <div class="mr-auto self-start">
            <NeButton
              class="ml-"
              kind="secondary"
              size="lg"
              type="submit"
              @click="showRestoreDrawer = true"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'rotate']" />
              </template>
              {{ t('standalone.backup_and_restore.restore.restore_backup') }}
            </NeButton>
          </div>
        </div>
      </FormLayout>
    </template>
    <NeSideDrawer
      :is-shown="showRestoreDrawer"
      :title="t('standalone.backup_and_restore.restore.restore_backup')"
      @close="showRestoreDrawer = false"
    >
      <div class="space-y-8">
        <template v-if="isEnterprise">
          <NeRadioSelection
            v-model="typeRestore"
            :label="t('standalone.backup_and_restore.restore.source')"
            :options="sourceRestoreOptions"
          />
          <template v-if="typeRestore === 'from_backup'">
            <NeCombobox
              v-model="formRestore.backup"
              :options="listBackups"
              :label="t('standalone.backup_and_restore.restore.backup')"
              :invalid-message="errorRestore.backup"
              :noResultsLabel="t('ne_combobox.no_results')"
              :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
              :noOptionsLabel="t('ne_combobox.no_options_label')"
              :selected-label="t('ne_combobox.selected')"
              :user-input-label="t('ne_combobox.user_input_label')"
              :optionalLabel="t('common.optional')"
              class="grow"
              ref="backupRef"
            />
          </template>
        </template>
        <template v-if="typeRestore === 'upload_file'">
          <NeFileInput
            :label="t('standalone.backup_and_restore.restore.upload_file')"
            :dropzoneLabel="t('ne_file_input.dropzone_label')"
            :invalid-message="errorRestore.file"
            @select="handleFileUpload"
            v-model="formRestore.file"
            ref="fileRef"
          />
        </template>
        <template v-if="isSetPassphrase">
          <NeTextInput
            v-model="formRestore.passphrase"
            :invalid-message="errorRestore.passphrase"
            :label="t('standalone.backup_and_restore.restore.passphrase')"
            isPassword
            ref="passphraseRef"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.backup_and_restore.restore.passphrase_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
        </template>
        <hr />
        <NeInlineNotification
          v-if="errorRestoreBackup.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorRestoreBackup.notificationTitle"
          :description="errorRestoreBackup.notificationDescription"
        >
          <template v-if="errorRestoreBackup.notificationDetails" #details>
            {{ errorRestoreBackup.notificationDetails }}
          </template>
        </NeInlineNotification>
        <div class="flex justify-end gap-4">
          <NeButton
            :disabled="loadingRestore"
            :kind="'tertiary'"
            @click="showRestoreDrawer = false"
          >
            {{ t('common.cancel') }}
          </NeButton>
          <NeButton
            :disabled="
              loadingRestore ||
              ((!isEnterprise || typeRestore === 'upload_file') && !canRestoreBackupFile)
            "
            :kind="'primary'"
            :loading="loadingRestore"
            @click="restoreBackup()"
          >
            {{ t('standalone.backup_and_restore.restore.restore') }}
          </NeButton>
        </div>
      </div>
    </NeSideDrawer>
    <NeModal
      :primary-label="t('common.cancel')"
      :primary-button-disabled="true"
      :title="t('standalone.backup_and_restore.restore.restore')"
      :visible="isRestoring"
      cancel-label=""
      kind="warning"
      @close="isRestoring = false"
    >
      {{ t('standalone.backup_and_restore.restore.restore_in_progress') }}
      <NeProgressBar class="my-4" :progress="restoreProgress" />
    </NeModal>
  </div>
</template>
