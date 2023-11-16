<script setup lang="ts">
import { validateFile } from '@/lib/validation'
import { getAxiosErrorMessage } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeSideDrawer,
  NeInlineNotification,
  NeFileInput,
  NeButton
} from '@nethserver/vue-tailwind-lib'
import { ubusCall } from '@/lib/standalone/ubus'
import { uploadFile } from '@/lib/standalone/fileUpload'

defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()
const uploadErrorDescription = ref('')
const uploadErrorDetails = ref('')
const fileInputValidationError = ref('')

const isReadyToUpdate = ref(false)
const isRequestingUpdate = ref(false)
const isUploadingImage = ref(false)
const uploadProgress = ref(0)
const uploadedImageFileName = ref('')

const fileToUpload = ref<File | null>(null)

async function handleFileUpload(event: Event) {
  fileInputValidationError.value = ''
  isReadyToUpdate.value = false
  isUploadingImage.value = false
  const input = event.target as HTMLInputElement
  if (!input.files?.length) {
    return
  }

  fileToUpload.value = input.files[0]

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
    uploadErrorDescription.value = t(getAxiosErrorMessage(err))
    uploadErrorDetails.value = err.toString()
  } finally {
    isUploadingImage.value = false
  }
}

const emit = defineEmits(['close', 'update-requested'])

function close() {
  uploadErrorDescription.value = ''
  uploadErrorDetails.value = ''
  fileInputValidationError.value = ''
  fileToUpload.value = null
  emit('close')
}

async function uploadImageAndReboot() {
  try {
    isRequestingUpdate.value = true
    await ubusCall('ns.update', 'install-uploaded-image', { image: uploadedImageFileName.value })
    emit('update-requested')
    close()
  } catch (err: any) {
    if (!err.response || !err.response.data) {
      emit('update-requested')
      close()
    }
    uploadErrorDescription.value = t(getAxiosErrorMessage(err))
    uploadErrorDetails.value = err.toString()
  } finally {
    isRequestingUpdate.value = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="!isRequestingUpdate ? close() : undefined"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="t('standalone.update.upload_image')"
  >
    <div class="flex flex-col gap-y-6">
      <NeInlineNotification
        kind="error"
        v-if="uploadErrorDescription"
        :title="t('error.cannot_upload_image')"
        :description="uploadErrorDescription"
      >
        <template #details v-if="uploadErrorDetails">
          {{ uploadErrorDetails }}
        </template>
      </NeInlineNotification>
      <div>
        <NeFileInput
          :label="`${t('standalone.update.image_file')} (*.img.gz)`"
          @change="handleFileUpload"
          :invalid-message="fileInputValidationError"
          :show-progress="isUploadingImage"
          :progress="uploadProgress"
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
          @click="uploadImageAndReboot()"
          :disabled="isRequestingUpdate || !isReadyToUpdate"
          :loading="isRequestingUpdate"
          >{{ t('standalone.update.update_and_reboot') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
