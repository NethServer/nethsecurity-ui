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

defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()
const uploadErrorDescription = ref('')
const uploadErrorDetails = ref('')
const fileInputValidationError = ref('')
const isUploading = ref(false)

const fileToUpload = ref<File | null>(null)

const emit = defineEmits(['close', 'image-uploaded'])

function close() {
  uploadErrorDescription.value = ''
  uploadErrorDetails.value = ''
  fileInputValidationError.value = ''
  fileToUpload.value = null
  emit('close')
}

async function uploadImageAndReboot() {
  const fileValidation = validateFile(fileToUpload.value, 'img.gz')
  if (!fileValidation.valid) {
    fileInputValidationError.value = t(fileValidation.errMessage as string)
    return
  }

  try {
    isUploading.value = true
    //TODO: handle file upload, reboot
    await ubusCall('ns.update', 'install-uploaded-image', { image: fileToUpload.value?.name })
    emit('image-uploaded')
    close()
  } catch (err: any) {
    uploadErrorDescription.value = t(getAxiosErrorMessage(err))
    uploadErrorDetails.value = err.toString()
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="!isUploading ? close() : undefined"
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
          :invalid-message="fileInputValidationError"
          v-model="fileToUpload"
        />
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="!isUploading ? close() : undefined">{{
          t('common.cancel')
        }}</NeButton>
        <NeButton
          kind="primary"
          @click="uploadImageAndReboot()"
          :disabled="isUploading"
          :loading="isUploading"
          >{{ t('standalone.update.upload_and_reboot') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
