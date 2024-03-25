<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { validateFile } from '@/lib/validation'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeFileInput,
  NeSideDrawer,
  NeInlineNotification,
  NeButton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { ubusCall } from '@/lib/standalone/ubus'
import { uploadFile } from '@/lib/standalone/fileUpload'

defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const fileInputValidationError = ref('')

const isReadyToUpdate = ref(false)
const isRequestingUpdate = ref(false)
const isUploadingImage = ref(false)
const uploadProgress = ref(0)
const uploadedImageFileName = ref('')

const fileToUpload = ref<File | null>(null)

async function handleFileUpload() {
  fileInputValidationError.value = ''
  isReadyToUpdate.value = false
  isUploadingImage.value = false

  if (!fileToUpload.value) {
    return
  }
  const fileValidation = validateFile(fileToUpload.value, 'img.gz')
  if (!fileValidation.valid) {
    fileInputValidationError.value = t(fileValidation.errMessage as string)
    return
  }

  try {
    uploadProgress.value = 0.1
    isUploadingImage.value = true
    const uploadResult = await uploadFile(fileToUpload.value as File, (e) => {
      uploadProgress.value = (e.progress as number) * 100
    })
    uploadedImageFileName.value = uploadResult.data.data
    isReadyToUpdate.value = true
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_upload_image')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isUploadingImage.value = false
  }
}

const emit = defineEmits(['close', 'update-requested'])

function close() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  fileInputValidationError.value = ''
  fileToUpload.value = null
  isReadyToUpdate.value = false
  isUploadingImage.value = false
  uploadedImageFileName.value = ''
  emit('close')
}

async function updateImageAndReboot() {
  try {
    isRequestingUpdate.value = true
    await ubusCall('ns.update', 'install-uploaded-image', { image: uploadedImageFileName.value })
    emit('update-requested')
    close()
  } catch (err: any) {
    if (!err.response || !err.response.data) {
      emit('update-requested')
      close()
    } else {
      error.value.notificationTitle = t('error.cannot_update_system')
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
    }
  } finally {
    isRequestingUpdate.value = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="!isRequestingUpdate ? close() : undefined"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="t('standalone.update.update_with_image_file')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        kind="error"
        v-if="error.notificationTitle"
        :title="error.notificationTitle"
        :description="error.notificationDescription"
      >
        <template #details v-if="error.notificationDetails">
          {{ error.notificationDetails }}
        </template>
      </NeInlineNotification>
      <div>
        <NeFileInput
          :label="`${t('standalone.update.image_file')} (*.img.gz)`"
          @select="handleFileUpload"
          :invalid-message="fileInputValidationError"
          :show-progress="isUploadingImage"
          :progress="uploadProgress"
          :dropzoneLabel="t('ne_file_input.dropzone_label')"
          v-model="fileToUpload"
        />
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="!isRequestingUpdate ? close() : undefined">{{
          t('common.cancel')
        }}</NeButton>
        <NeButton
          kind="primary"
          @click="updateImageAndReboot()"
          :disabled="isRequestingUpdate || !isReadyToUpdate"
          :loading="isRequestingUpdate"
          >{{ t('standalone.update.update_and_reboot') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
