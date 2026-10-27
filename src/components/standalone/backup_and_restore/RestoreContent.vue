<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import {
  NeFileInput,
  NeProgressBar,
  NeInlineNotification,
  NeButton,
  NeTooltip,
  NeSideDrawer,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { validateRequired } from '@/lib/validation'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { uploadFile } from '@/lib/standalone/fileUpload'
import { faRotate } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()
const RESTORE_WAIT_TIME = 45000

const formRestore = ref({
  passphrase: '',
  file: undefined
})

const loadingRestore = ref(false)
const showRestoreDrawer = ref(false)
const isRestoring = ref(false)
const restoreProgress = ref(0)
const restoreIntervalRef = ref<number | undefined>()
const restoreTimeoutRef = ref<number | undefined>()
const passphraseRef = ref()
const fileRef = ref()

const uploadProgress = ref(0)
const isUploadingBackupFile = ref(false)
const uploadedBackupFileName = ref('')
const canRestoreBackupFile = ref(false)

const errorPage = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const errorRestoreBackup = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const errorRestore = ref({
  passphrase: '',
  file: ''
})

const isPassphraseRequired = computed(() => {
  if (formRestore.value.file) {
    return (formRestore.value.file as File).name.toLowerCase().endsWith('.gpg')
  }
  return false
})

function validateRestore(): boolean {
  let isValidationOk = true
  const isFocusInput = false

  const { valid, errMessage } = validateRequired(
    formRestore?.value?.file ? formRestore.value.file : ''
  )
  if (!valid) {
    errorRestore.value.file = t(errMessage as string)
    isValidationOk = false
  }

  if (isPassphraseRequired.value) {
    const { valid, errMessage } = validateRequired(formRestore.value.passphrase)
    if (!valid) {
      errorRestore.value.passphrase = t(errMessage as string)
      isValidationOk = false
      if (!isFocusInput) {
        focusElement(passphraseRef)
      }
    }
  }

  return isValidationOk
}

function clearErrors() {
  errorRestore.value = {
    passphrase: '',
    file: ''
  }
  errorRestoreBackup.value = {
    notificationTitle: '',
    notificationDescription: '',
    notificationDetails: ''
  }
}

function cleanForm() {
  formRestore.value = {
    passphrase: '',
    file: undefined
  }
  uploadedBackupFileName.value = ''
  canRestoreBackupFile.value = false
  uploadProgress.value = 0
}

function close() {
  showRestoreDrawer.value = false
  cleanForm()
  clearErrors()
}

async function restoreBackup() {
  clearErrors()
  if (validateRestore()) {
    loadingRestore.value = true
    try {
      const payload = { backup: uploadedBackupFileName.value }

      if (formRestore.value.passphrase) {
        Object.assign(payload, { passphrase: formRestore.value.passphrase })
      }

      const res = await ubusCall('ns.backup', 'restore', payload)
      if (res?.data?.message && res?.data?.message === 'success') {
        isRestoring.value = true
        showRestoreDrawer.value = false
        setRestoreTimer()
      }
    } catch (exception: any) {
      if (exception instanceof ValidationError) {
        for (const [, value] of exception.errorBag) {
          const errorMessage = value[0]
          errorRestore.value.passphrase = t('error.backup_passphrase_' + errorMessage)
        }
      } else {
        // this is an unknown error not expected
        errorRestoreBackup.value.notificationTitle = t('error.cannot_restore_backup')
        errorRestoreBackup.value.notificationDescription = t(getAxiosErrorMessage(exception))
      }
    } finally {
      loadingRestore.value = false
    }
  }
}

async function handleFileUpload() {
  isUploadingBackupFile.value = false
  canRestoreBackupFile.value = false

  if (!formRestore.value.file) {
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
    <NeInlineNotification
      v-if="errorPage.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorPage.notificationTitle"
      :description="errorPage.notificationDescription"
    >
      <template v-if="errorPage.notificationDetails" #details>
        {{ errorPage.notificationDetails }}
      </template>
    </NeInlineNotification>
    <template v-if="!errorPage.notificationTitle">
      <FormLayout
        :description="t('standalone.backup_and_restore.restore.description')"
        class="max-w-6xl"
      >
        <div class="flex">
          <div class="mr-auto self-start">
            <NeButton
              class="ml-"
              kind="primary"
              size="lg"
              type="submit"
              @click="showRestoreDrawer = true"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faRotate" />
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
      @close="close()"
    >
      <div class="space-y-8">
        <NeFileInput
          ref="fileRef"
          v-model="formRestore.file"
          :label="
            t('standalone.backup_and_restore.restore.upload_file', {
              extensions: '*.tar.gz, *.tar.gz.gpg, *.bin'
            })
          "
          :dropzone-label="t('ne_file_input.dropzone_label')"
          :invalid-message="errorRestore.file"
          accept=".tar.gz,.tar.gz.gpg,.bin"
          @select="handleFileUpload"
        />
        <NeTextInput
          ref="passphraseRef"
          v-model="formRestore.passphrase"
          :invalid-message="errorRestore.passphrase"
          :label="t('standalone.backup_and_restore.restore.passphrase')"
          is-password
          :optional="!isPassphraseRequired"
          :optional-label="t('common.optional')"
        >
          <template #tooltip>
            <NeTooltip>
              <template #content>
                {{ t('standalone.backup_and_restore.restore.passphrase_helper') }}
              </template>
            </NeTooltip>
          </template>
        </NeTextInput>
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
          <NeButton :disabled="loadingRestore" :kind="'tertiary'" @click="close()">
            {{ t('common.cancel') }}
          </NeButton>
          <NeButton
            :disabled="loadingRestore || !canRestoreBackupFile"
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
      :close-aria-label="t('common.close')"
      @close="isRestoring = false"
    >
      {{ t('standalone.backup_and_restore.restore.restore_in_progress') }}
      <NeProgressBar class="my-4" :progress="restoreProgress" />
    </NeModal>
  </div>
</template>
