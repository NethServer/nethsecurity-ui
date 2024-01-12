<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NeSideDrawer,
  NeFileInput,
  NeButton,
  NeInlineNotification,
  NeFormItemLabel,
  NeTextInput,
  NeToggle,
  NeTooltip,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { MessageBag, validateFile, validateRequired, type validationOutput } from '@/lib/validation'
import { watch } from 'vue'
import { ValidationError } from '@/lib/standalone/ubus'

const props = defineProps<{
  isShown: boolean
}>()
const emit = defineEmits(['close', 'certificate-imported'])

const { t } = useI18n()
const importCertificateError = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isImporting = ref(false)
const validationErrorBag = ref(new MessageBag())

const certificateName = ref('')
const certificateFile = ref<File | null>(null)
const privateKeyFile = ref<File | null>(null)
const chainFile = ref<File | null>(null)
const defaultCertificate = ref(false)

function resetForm() {
  certificateName.value = ''
  certificateFile.value = null
  privateKeyFile.value = null
  chainFile.value = null
  defaultCertificate.value = false
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
    [[validateFile(certificateFile.value)], 'certificateFile'],
    [[validateFile(privateKeyFile.value)], 'privateKeyFile']
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

  try {
    isImporting.value = true
    //TODO: logic for importing the certificate
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      importCertificateError.value.notificationDescription = t(getAxiosErrorMessage(err))
      importCertificateError.value.notificationDetails = err.toString()
    }
  } finally {
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
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
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
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('certificateFile'))"
        :dropzoneLabel="t('ne_file_input.dropzone_label')"
        v-model="certificateFile"
      />
      <NeFileInput
        :label="t('standalone.certificates.private_key')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('privateKeyFile'))"
        :dropzoneLabel="t('ne_file_input.dropzone_label')"
        v-model="privateKeyFile"
      />
      <!-- TODO: add "optional" label -->
      <NeFileInput
        :label="t('standalone.certificates.chain_file')"
        :dropzoneLabel="t('ne_file_input.dropzone_label')"
        v-model="chainFile"
      />
      <div>
        <NeFormItemLabel
          >{{ t('standalone.certificates.set_as_default_certificate') }}
          <NeTooltip>
            <template #content>
              {{ t('standalone.certificates.set_as_default_certificate_tooltip') }}
            </template>
          </NeTooltip>
        </NeFormItemLabel>
        <NeToggle
          :label="defaultCertificate ? t('common.enabled') : t('common.disabled')"
          v-model="defaultCertificate"
        />
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
